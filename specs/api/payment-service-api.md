---
status: implemented
service: payment-service
version: 1.0.0
---

# Payment Service API Specification

## Overview

The Payment Service manages crowdfunding campaigns, contributions, transaction history, and escrow release to solvers. Payments go through a provider abstraction: the `mock` provider (default) succeeds instantly for development; a Stripe implementation slots in via `PAYMENT_PROVIDER=stripe` + `STRIPE_SECRET_KEY`, with pending intents completed by the provider webhook.

**Base URLs**: `/api/crowdfunding`, `/api/payments`
**Version**: 1.0.0
**Authentication**: Required (JWT Bearer Token)
**Port**: 8006

## Endpoints — Crowdfunding

### 1. Create Campaign

```
POST /crowdfunding/campaigns
```

**Body**:
```typescript
interface CreateCampaignRequest {
  problemId: string;    // Required, one campaign per problem
  goalAmount: number;   // Required, > 0
  currency?: string;    // Default USD
  deadline?: string;    // ISO timestamp
}
```

**Responses**: `201` campaign · `404` problem not found · `409` already exists / problem resolved

**Events**: publishes `campaign.created`

### 2. List Campaigns

```
GET /crowdfunding/campaigns?status=&page=&limit=
```

Campaigns joined with problem title/category and `percent_funded`.

### 3. Get Campaign

```
GET /crowdfunding/campaigns/:id                    // with contributorCount + 20 recent contributions
GET /crowdfunding/campaigns/problem/:problemId     // campaign for a problem
```

Anonymous contributions return `contributor: null`.

### 4. Contribute

```
POST /crowdfunding/campaigns/:id/contribute
```

**Body**: `{ userId, amount, paymentMethod?, isAnonymous? }`

Flow:
1. Payment intent created with the configured provider
2. Contribution recorded (`completed` with mock provider, `pending` with a real one)
3. On completion: transaction recorded, `current_amount` incremented atomically, campaign flips to `funded` when the goal is reached

**Response** includes updated campaign and, for real providers, a `clientSecret` for the frontend to complete payment.

**Events**: publishes `contribution.completed`; `campaign.funded` when the goal is crossed

### 5. Cancel Campaign

```
POST /crowdfunding/campaigns/:id/cancel
```

Active campaigns only. Publishes `campaign.cancelled`.

## Endpoints — Payments

### 6. Transaction History

```
GET /payments/transactions/user/:userId?page=&limit=
GET /payments/transactions/:id
```

### 7. Release Escrow

```
POST /payments/escrow/release
```

**Body**: `{ problemId }`

Preconditions: problem `resolved`, an `accepted` bid exists, a `funded`/`active` campaign exists, not already released. Pays `min(current_amount, bid.amount)` to the solver's user, marks the campaign `completed`, and increments the solver's `completed_jobs`.

**Events**: publishes `escrow.released`

### 8. Provider Webhook

```
POST /payments/webhooks/provider
```

Stripe-compatible shape. On `payment_intent.succeeded`, completes the matching pending contribution, updates campaign progress, and records the transaction. Idempotent — unknown or already-completed intents are acknowledged without changes.

## Events Published

| Event | Payload |
|-------|---------|
| `campaign.created` | `campaignId`, `problemId`, `goalAmount`, `currency` |
| `campaign.funded` | `campaignId`, `problemId`, `goalAmount`, `totalRaised` |
| `campaign.cancelled` | `campaignId`, `problemId` |
| `contribution.completed` | `contributionId`, `campaignId`, `problemId`, `userId`, `amount`, `currency` |
| `escrow.released` | `transactionId`, `problemId`, `solverId`, `amount`, `currency` |

## Error Codes

`VALIDATION_ERROR` (400) · `NOT_FOUND` (404) · `ALREADY_EXISTS` (409) · `INVALID_STATE` (409) · `INTERNAL_ERROR` (500)
