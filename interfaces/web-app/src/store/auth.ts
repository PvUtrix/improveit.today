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
  register: (email: string, username: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setRole: (role: AuthUser['role']) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      register: async (email, username, password) => {
        const res = await axios.post('/api/auth/register', {
          email,
          username,
          password,
        });
        const { user, token } = res.data.data;
        set({ user, token });
      },

      login: async (email, password) => {
        const res = await axios.post('/api/auth/login', { email, password });
        const { user, token } = res.data.data;
        set({ user, token });
      },

      logout: () => set({ user: null, token: null }),

      setRole: (role) =>
        set((state) => (state.user ? { user: { ...state.user, role } } : {})),
    }),
    { name: 'improveit-auth' }
  )
);
