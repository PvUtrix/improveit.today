import axios from 'axios';
import { useAuth } from '../store/auth';

/**
 * Shared axios instance. All requests go through the Vite proxy to the API
 * gateway, which requires a JWT on every route except /api/auth/*.
 * The interceptor attaches the current user's token from the auth store.
 */
export const api = axios.create();

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401 (expired access token), transparently refresh once and retry the
// original request. Concurrent 401s share a single in-flight refresh so we
// don't spend the rotating refresh token more than once.
let refreshInFlight: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      if (!refreshInFlight) {
        refreshInFlight = useAuth.getState().refresh().finally(() => {
          refreshInFlight = null;
        });
      }
      const newToken = await refreshInFlight;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  }
);

// Unwrap the platform's { success, data } envelope.
async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await p;
  return res.data.data;
}

// ---- Problems ----
export interface Problem {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  category: string;
  status: string;
  upvotes?: number;
  media?: { id: string; media_url: string }[];
}

export interface CreateProblemInput {
  userId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  category: string;
  mediaUrls?: string[];
}

export const problemsApi = {
  get: (id: string) => unwrap<Problem>(api.get(`/api/problems/${id}`)),
  list: () => unwrap<Problem[]>(api.get('/api/problems')),
  create: (input: CreateProblemInput) =>
    unwrap<Problem>(api.post('/api/problems', input)),
};

export const PROBLEM_CATEGORIES = [
  { value: 'roads', label: '🛣️ Roads' },
  { value: 'lighting', label: '💡 Lighting' },
  { value: 'waste', label: '🗑️ Waste' },
  { value: 'infrastructure', label: '🏗️ Infrastructure' },
  { value: 'environment', label: '🌳 Environment' },
  { value: 'safety', label: '🚨 Safety' },
  { value: 'other', label: '📌 Other' },
] as const;

// ---- Votes ----
export interface VoteStats {
  upvotes: number;
  downvotes: number;
  score: number;
}

export const votesApi = {
  getStats: (problemId: string) =>
    unwrap<VoteStats>(api.get(`/api/votes/problem/${problemId}`)),
  getMyVote: (userId: string, problemId: string) =>
    api
      .get(`/api/votes/user/${userId}/problem/${problemId}`)
      .then((r) => r.data.data as { id: string; vote_type: string })
      .catch(() => null),
  cast: (userId: string, problemId: string, voteType: 'upvote' | 'downvote') =>
    unwrap(api.post('/api/votes', { userId, problemId, voteType })),
  remove: (userId: string, problemId: string) =>
    unwrap(api.delete('/api/votes', { data: { userId, problemId } })),
};

// ---- Crowdfunding ----
export interface Campaign {
  id: string;
  problem_id: string;
  goal_amount: string;
  current_amount: string;
  currency: string;
  status: string;
  percent_funded?: string;
  deadline?: string;
  contributorCount?: number;
  recentContributions?: {
    id: string;
    amount: string;
    currency: string;
    contributor: string | null;
    created_at: string;
  }[];
}

export const fundingApi = {
  getByProblem: (problemId: string) =>
    api
      .get(`/api/crowdfunding/campaigns/problem/${problemId}`)
      .then((r) => r.data.data as Campaign)
      .catch(() => null),
  get: (id: string) => unwrap<Campaign>(api.get(`/api/crowdfunding/campaigns/${id}`)),
  create: (problemId: string, goalAmount: number, currency = 'USD') =>
    unwrap<Campaign>(
      api.post('/api/crowdfunding/campaigns', { problemId, goalAmount, currency })
    ),
  contribute: (
    campaignId: string,
    userId: string,
    amount: number,
    isAnonymous = false
  ) =>
    unwrap<{ contribution: any; campaign: Campaign }>(
      api.post(`/api/crowdfunding/campaigns/${campaignId}/contribute`, {
        userId,
        amount,
        isAnonymous,
      })
    ),
};

// ---- Bidding & Solvers ----
export interface Bid {
  id: string;
  problem_id: string;
  solver_id: string;
  amount: string;
  currency: string;
  timeline_days?: number;
  description: string;
  warranty_months?: number;
  status: string;
  company_name?: string;
  solver_username?: string;
  solver_rating?: string;
  completed_jobs?: number;
  verification_status?: string;
  submitted_at: string;
}

export interface Solver {
  id: string;
  user_id: string;
  company_name?: string;
  account_type: string;
  skills?: string[];
  rating: string;
  completed_jobs: number;
  verification_status: string;
}

// ---- Authorities & Dashboard ----
export interface Authority {
  id: string;
  name: string;
  type?: string;
  jurisdiction_id: string;
  jurisdiction_name?: string;
  notification_threshold: number;
  is_verified: boolean;
  is_active: boolean;
}

export interface AuthorityDashboard {
  totalProblems: number;
  byStatus: Record<string, number>;
  topCategories: { category: string; count: number }[];
  resolutionTime: { avgDays: number | null; medianDays: number | null };
  escalatedProblems: {
    id: string;
    title: string;
    category: string;
    status: string;
    created_at: string;
    upvotes: number;
  }[];
}

export interface JurisdictionProblem {
  id: string;
  title: string;
  category: string;
  status: string;
  address?: string;
  created_at: string;
  upvotes: number;
  score: number;
}

export const authorityApi = {
  list: () => unwrap<Authority[]>(api.get('/api/authorities?limit=100')),
  get: (id: string) => unwrap<Authority>(api.get(`/api/authorities/${id}`)),
  dashboard: (id: string) =>
    unwrap<AuthorityDashboard>(api.get(`/api/authorities/${id}/dashboard`)),
  problems: (id: string, status?: string) =>
    unwrap<JurisdictionProblem[]>(
      api.get(`/api/authorities/${id}/problems`, {
        params: status ? { status, limit: 50 } : { limit: 50 },
      })
    ),
};

export const biddingApi = {
  listForProblem: (problemId: string) =>
    unwrap<Bid[]>(api.get(`/api/bids/problem/${problemId}`)),
  submit: (payload: {
    problemId: string;
    solverId: string;
    amount: number;
    description: string;
    timelineDays?: number;
    warrantyMonths?: number;
  }) => unwrap<Bid>(api.post('/api/bids', payload)),
  accept: (bidId: string) => unwrap<Bid>(api.post(`/api/bids/${bidId}/accept`, {})),
  getSolverByUser: (userId: string) =>
    api
      .get(`/api/solvers?page=1&limit=100`)
      .then((r) => {
        const solvers = r.data.data as Solver[];
        return solvers.find((s) => s.user_id === userId) ?? null;
      })
      .catch(() => null),
  registerSolver: (userId: string, companyName?: string, skills: string[] = []) =>
    unwrap<Solver>(
      api.post('/api/solvers', { userId, companyName, skills })
    ),
};
