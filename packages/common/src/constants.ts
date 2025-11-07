export const PROBLEM_CATEGORIES = {
  ROADS: 'roads',
  LIGHTING: 'lighting',
  WASTE: 'waste',
  INFRASTRUCTURE: 'infrastructure',
  ENVIRONMENT: 'environment',
  SAFETY: 'safety',
  OTHER: 'other',
} as const;

export const PROBLEM_STATUSES = {
  REPORTED: 'reported',
  VERIFIED: 'verified',
  ESCALATED: 'escalated',
  IN_PROGRESS: 'in_progress',
  PENDING_VERIFICATION: 'pending_verification',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  REOPENED: 'reopened',
} as const;

export const USER_ROLES = {
  USER: 'user',
  SOLVER: 'solver',
  AUTHORITY: 'authority',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

export const VOTE_TYPES = {
  UPVOTE: 'upvote',
  DOWNVOTE: 'downvote',
} as const;

export const BID_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const REPUTATION_POINTS = {
  REPORT_PROBLEM: 10,
  PROBLEM_RESOLVED: 50,
  VOTE_CAST: 1,
  SOLVE_PROBLEM: 100,
  FIVE_STAR_REVIEW: 50,
} as const;

export const CATEGORY_ICONS = {
  roads: '🚗',
  lighting: '💡',
  waste: '🗑️',
  infrastructure: '🏗️',
  environment: '🌳',
  safety: '🚧',
  other: '📋',
} as const;

export const STATUS_COLORS = {
  reported: '#FFA500', // Orange
  verified: '#4169E1', // Royal Blue
  escalated: '#FF4500', // Red-Orange
  in_progress: '#1E90FF', // Dodger Blue
  pending_verification: '#9370DB', // Medium Purple
  resolved: '#32CD32', // Lime Green
  rejected: '#DC143C', // Crimson
  reopened: '#FF6347', // Tomato
} as const;

export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;
