import { z } from 'zod';

// User types
export type UserRole = 'user' | 'solver' | 'authority' | 'moderator' | 'admin';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  role: z.enum(['user', 'solver', 'authority', 'moderator', 'admin']),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Problem types
export type ProblemStatus =
  | 'reported'
  | 'verified'
  | 'escalated'
  | 'in_progress'
  | 'pending_verification'
  | 'resolved'
  | 'rejected'
  | 'reopened';

export type ProblemCategory =
  | 'roads'
  | 'lighting'
  | 'waste'
  | 'infrastructure'
  | 'environment'
  | 'safety'
  | 'other';

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Location = z.infer<typeof LocationSchema>;

export const ProblemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(5).max(255),
  description: z.string().min(10),
  location: LocationSchema,
  address: z.string().optional(),
  category: z.string(),
  status: z.enum([
    'reported',
    'verified',
    'escalated',
    'in_progress',
    'pending_verification',
    'resolved',
    'rejected',
    'reopened',
  ]),
  priority: z.number().default(0),
  jurisdictionId: z.string().uuid().optional(),
  authorityNotifiedAt: z.date().optional(),
  resolvedAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Problem = z.infer<typeof ProblemSchema>;

export const CreateProblemSchema = ProblemSchema.pick({
  title: true,
  description: true,
  location: true,
  category: true,
}).extend({
  address: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export type CreateProblemDto = z.infer<typeof CreateProblemSchema>;

// Vote types
export const VoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  problemId: z.string().uuid(),
  voteType: z.enum(['upvote', 'downvote']),
  createdAt: z.date(),
});

export type Vote = z.infer<typeof VoteSchema>;

export interface VoteAggregate {
  problemId: string;
  upvotes: number;
  downvotes: number;
  score: number;
}

// Solver types
export type SolverAccountType = 'individual' | 'team' | 'company' | 'ngo';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export const SolverSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyName: z.string().optional(),
  accountType: z.enum(['individual', 'team', 'company', 'ngo']),
  skills: z.array(z.string()),
  verificationStatus: z.enum(['unverified', 'pending', 'verified']),
  rating: z.number().min(0).max(5),
  totalJobs: z.number(),
  completedJobs: z.number(),
  hourlyRate: z.number().optional(),
  currency: z.string().default('USD'),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Solver = z.infer<typeof SolverSchema>;

// Bid types
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export const BidSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid(),
  solverId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  timelineDays: z.number().positive(),
  description: z.string().min(10),
  laborCost: z.number().optional(),
  materialCost: z.number().optional(),
  otherCosts: z.number().optional(),
  warrantyMonths: z.number().default(3),
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']),
  submittedAt: z.date(),
  updatedAt: z.date(),
});

export type Bid = z.infer<typeof BidSchema>;

export const CreateBidSchema = BidSchema.pick({
  problemId: true,
  amount: true,
  timelineDays: true,
  description: true,
}).extend({
  laborCost: z.number().optional(),
  materialCost: z.number().optional(),
  otherCosts: z.number().optional(),
  warrantyMonths: z.number().default(3),
});

export type CreateBidDto = z.infer<typeof CreateBidSchema>;

// Funding types
export type FundingStatus = 'active' | 'funded' | 'cancelled' | 'completed';

export interface FundingCampaign {
  id: string;
  problemId: string;
  goalAmount: number;
  currentAmount: number;
  currency: string;
  status: FundingStatus;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contribution {
  id: string;
  campaignId: string;
  userId?: string;
  amount: number;
  currency: string;
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  isAnonymous: boolean;
  createdAt: Date;
}

// Authority types
export interface Authority {
  id: string;
  jurisdictionId: string;
  userId?: string;
  name: string;
  type: string;
  contactEmail?: string;
  contactPhone?: string;
  notificationThreshold: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content?: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// JWT types
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Event types (for Kafka)
export type EventType =
  | 'problem.created'
  | 'problem.updated'
  | 'problem.resolved'
  | 'problem.threshold_reached'
  | 'vote.cast'
  | 'bid.submitted'
  | 'bid.accepted'
  | 'funding.goal_reached'
  | 'payment.completed'
  | 'user.registered';

export interface DomainEvent<T = any> {
  id: string;
  type: EventType;
  timestamp: Date;
  data: T;
  userId?: string;
}
