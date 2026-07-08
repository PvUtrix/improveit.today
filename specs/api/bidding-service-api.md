---
status: implemented
service: bidding-service
version: 1.0.0
---

# Bidding Service API Specification

## Overview

The Bidding Service manages the solver marketplace: solver profiles, bids on problems, bid acceptance, and post-completion reviews that drive solver reputation.

**Base URLs**: `/api/solvers`, `/api/bids`
**Version**: 1.0.0
**Authentication**: Required (JWT Bearer Token)
**Port**: 8007

## Endpoints — Solvers

### 1. Register Solver Profile

```
POST /solvers
```

**Body**:
```typescript
interface RegisterSolverRequest {
  userId: string;               // Required, one profile per user
  accountType?: 'individual' | 'team' | 'company' | 'ngo';  // Default individual
  companyName?: string;
  skills?: string[];
  hourlyRate?: number;
  currency?: string;            // Default USD
  portfolioUrl?: string;
}
```

Registering also promotes the linked user's role from `user` to `solver`.

**Responses**: `201` solver object · `404` user not found · `409` profile already exists

**Events**: publishes `solver.registered`

### 2. List Solvers

```
GET /solvers?skill=&minRating=&verificationStatus=&accountType=&page=&limit=
```

Active solvers ordered by rating, then completed jobs.

### 3. Get Solver

```
GET /solvers/:id
```

Profile joined with username, plus `recentReviews` (latest 10).

### 4. Update Solver / Verification

```
PATCH /solvers/:id           // companyName, skills, hourlyRate, currency, portfolioUrl, isActive
POST  /solvers/:id/verify    // { status, insuranceVerified?, licenseVerified? } — admin action
```

### 5. Solver Activity

```
GET /solvers/:id/bids?status=&page=&limit=
GET /solvers/:id/reviews?page=&limit=
```

## Endpoints — Bids

### 6. Submit Bid

```
POST /bids
```

**Body**:
```typescript
interface SubmitBidRequest {
  problemId: string;        // Required, problem must be reported/verified/escalated
  solverId: string;         // Required, solver must be active
  amount: number;           // Required, > 0
  description: string;      // Required
  currency?: string;        // Default USD
  timelineDays?: number;
  laborCost?: number;
  materialCost?: number;
  otherCosts?: number;
  warrantyMonths?: number;  // Default 3
}
```

One pending bid per solver per problem.

**Responses**: `201` bid · `404` problem/solver not found · `409` invalid state or duplicate

**Events**: publishes `bid.submitted`

### 7. List Bids for Problem

```
GET /bids/problem/:problemId?status=&page=&limit=
```

Bids joined with solver profile (rating, completed jobs, verification), ordered cheapest first.

### 8. Get / Update Bid

```
GET   /bids/:id
PATCH /bids/:id   // pending bids only: amount, timelineDays, description, costs, warrantyMonths
```

### 9. Accept Bid

```
POST /bids/:id/accept
```

Transactional workflow:
1. Bid → `accepted`
2. All other pending bids on the problem → `rejected`
3. Problem → `in_progress` (+ history entry)
4. Solver `total_jobs` incremented

**Events**: publishes `bid.accepted`

### 10. Withdraw Bid

```
POST /bids/:id/withdraw
```

Pending bids only.

### 11. Review Accepted Bid

```
POST /bids/:id/reviews
```

**Body**: `{ userId, rating (1–5 integer), comment? }` — one review per user per bid. Recomputes the solver's aggregate rating.

## Events Published

| Event | Payload |
|-------|---------|
| `solver.registered` | `solverId`, `userId`, `accountType` |
| `bid.submitted` | `bidId`, `problemId`, `solverId`, `amount`, `currency` |
| `bid.accepted` | `bidId`, `problemId`, `solverId`, `amount`, `currency` |

## Error Codes

`VALIDATION_ERROR` (400) · `NOT_FOUND` (404) · `ALREADY_EXISTS` (409) · `INVALID_STATE` (409) · `INTERNAL_ERROR` (500)
