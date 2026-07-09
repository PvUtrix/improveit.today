import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'solver' | 'authority' | 'moderator' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  register: (email: string, username: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Exchange the stored refresh token for a fresh access token. Returns the
   * new access token, or null if the session can no longer be refreshed. */
  refresh: () => Promise<string | null>;
  setRole: (role: AuthUser['role']) => void;
}

// A bare axios call (no interceptors) so refreshing never recurses through
// the shared client's 401 handler.
const bare = axios.create();

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      register: async (email, username, password) => {
        const res = await bare.post('/api/auth/register', {
          email,
          username,
          password,
        });
        const { user, token, refreshToken } = res.data.data;
        set({ user, token, refreshToken });
      },

      login: async (email, password) => {
        const res = await bare.post('/api/auth/login', { email, password });
        const { user, token, refreshToken } = res.data.data;
        set({ user, token, refreshToken });
      },

      logout: async () => {
        const { refreshToken } = get();
        // Best-effort server-side revocation; clear local state regardless.
        if (refreshToken) {
          try {
            await bare.post('/api/auth/logout', { refreshToken });
          } catch {
            /* ignore */
          }
        }
        set({ user: null, token: null, refreshToken: null });
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;
        try {
          const res = await bare.post('/api/auth/refresh', { refreshToken });
          const { user, token, refreshToken: rotated } = res.data.data;
          set({ user, token, refreshToken: rotated });
          return token as string;
        } catch {
          // Refresh token is invalid/expired — end the session.
          set({ user: null, token: null, refreshToken: null });
          return null;
        }
      },

      setRole: (role) =>
        set((state) => (state.user ? { user: { ...state.user, role } } : {})),
    }),
    { name: 'improveit-auth' }
  )
);
