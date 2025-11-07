---
status: implemented
service: voting-service
version: 1.0.0
---

# Voting Service API Specification

## Overview

The Voting Service manages upvotes and downvotes on problems, maintains vote aggregates, and triggers authority notifications when thresholds are reached.

**Base URL**: `/api/votes`
**Version**: 1.0.0
**Authentication**: Required (JWT Bearer Token)
**Port**: 8003

## Endpoints

### 1. Cast or Update Vote

Cast a new vote or update an existing vote on a problem.

#### Request

```
POST /votes
```

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```typescript
interface CastVoteRequest {
  userId: string;        // UUID of the user
  problemId: string;     // UUID of the problem
  voteType: 'upvote' | 'downvote';  // Type of vote
}
```

**Example**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "problemId": "660e8400-e29b-41d4-a716-446655440001",
  "voteType": "upvote"
}
```

#### Response

**Success (201 Created)**:
```typescript
interface VoteResponse {
  success: true;
  data: {
    vote: {
      id: string;
      user_id: string;
      problem_id: string;
      vote_type: 'upvote' | 'downvote';
      created_at: string;
    };
    stats: {
      upvotes: number;
      downvotes: number;
      score: number;
    };
  };
}
```

**Example**:
```json
{
  "success": true,
  "data": {
    "vote": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "problem_id": "660e8400-e29b-41d4-a716-446655440001",
      "vote_type": "upvote",
      "created_at": "2025-11-07T12:00:00Z"
    },
    "stats": {
      "upvotes": 47,
      "downvotes": 3,
      "score": 44
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Missing userId or problemId |
| 401 | UNAUTHORIZED | Invalid or missing token |
| 409 | ALREADY_EXISTS | Already voted this way |
| 500 | INTERNAL_ERROR | Server error |

---

### 2. Remove Vote

Remove a user's vote from a problem.

#### Request

```
DELETE /votes
```

**Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "problemId": "660e8400-e29b-41d4-a716-446655440001"
}
```

#### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "removed": true
  }
}
```

**Error (404 NOT_FOUND)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Vote not found"
  }
}
```

---

### 3. Get Vote Counts for Problem

Get aggregated vote statistics for a specific problem.

#### Request

```
GET /votes/problem/:problemId
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| problemId | string | Yes | UUID of the problem |

#### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "upvotes": 47,
    "downvotes": 3,
    "score": 44
  }
}
```

If no votes exist:
```json
{
  "success": true,
  "data": {
    "upvotes": 0,
    "downvotes": 0,
    "score": 0
  }
}
```

---

### 4. Get User's Vote on Problem

Check if a user has voted on a specific problem and what type.

#### Request

```
GET /votes/user/:userId/problem/:problemId
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | UUID of the user |
| problemId | string | Yes | UUID of the problem |

#### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "vote_type": "upvote",
    "created_at": "2025-11-07T12:00:00Z"
  }
}
```

**Error (404 NOT_FOUND)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No vote found"
  }
}
```

---

### 5. Get Trending Problems

Get problems with the highest vote scores.

#### Request

```
GET /votes/trending?limit=10
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 10 | Max number of results |

#### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Large pothole on Main Street",
      "description": "Dangerous pothole...",
      "category": "roads",
      "status": "escalated",
      "longitude": -74.006,
      "latitude": 40.7128,
      "upvotes": 247,
      "downvotes": 12,
      "score": 235
    }
  ]
}
```

---

## Data Models

### Vote

```typescript
interface Vote {
  id: string;                    // UUID
  user_id: string;               // UUID
  problem_id: string;            // UUID
  vote_type: 'upvote' | 'downvote';
  created_at: Date;
}
```

**Constraints**:
- Unique (user_id, problem_id) - one vote per user per problem
- user_id must exist in users table
- problem_id must exist in problems table

### VoteAggregate

```typescript
interface VoteAggregate {
  problem_id: string;   // UUID
  upvotes: number;      // Count of upvotes
  downvotes: number;    // Count of downvotes
  score: number;        // upvotes - downvotes
}
```

**Note**: Maintained as materialized view, refreshed on each vote.

---

## Events Published

### vote.cast

**Topic**: `improveit-events`

**Payload**:
```typescript
{
  id: string;
  type: 'vote.cast';
  timestamp: string;  // ISO 8601
  data: {
    voteId: string;
    userId: string;
    problemId: string;
    voteType: 'upvote' | 'downvote';
    newScore: number;
  };
}
```

**When Published**: After successful vote cast/update

### problem.threshold_reached

**Payload**:
```typescript
{
  id: string;
  type: 'problem.threshold_reached';
  timestamp: string;
  data: {
    problemId: string;
    upvotes: number;
    threshold: number;
    jurisdictionId: string;
    authorityEmail: string;
  };
}
```

**When Published**: When problem reaches vote threshold for first time

---

## Business Logic

### Vote Threshold Check

After each vote, the service checks if the problem has reached its jurisdiction's notification threshold:

1. Get problem's jurisdiction and threshold
2. If `upvotes >= threshold` AND not previously notified:
   - Update problem status to 'escalated'
   - Set `authority_notified_at` timestamp
   - Publish `problem.threshold_reached` event
   - Authority Service will send notification

### Materialized View Refresh

Vote aggregates are stored in a materialized view for performance:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY vote_aggregates;
```

This is called after each vote operation to update counts.

---

## Rate Limiting

| Tier | Requests per Minute |
|------|---------------------|
| Authenticated | 100 |
| Verified | 500 |

Voting is intentionally not rate-limited heavily to allow users to vote freely.

---

## Examples

### cURL - Cast Vote

```bash
curl -X POST https://api.improveit.today/api/votes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "problemId": "660e8400-e29b-41d4-a716-446655440001",
    "voteType": "upvote"
  }'
```

### JavaScript - Get Trending

```javascript
const response = await fetch('/api/votes/trending?limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const { data } = await response.json();
console.log('Trending problems:', data);
```

### TypeScript SDK

```typescript
import { votingClient } from '@improveit/sdk';

// Cast vote
await votingClient.castVote({
  userId: currentUser.id,
  problemId: problem.id,
  voteType: 'upvote',
});

// Get trending
const trending = await votingClient.getTrending({ limit: 10 });
```

---

## Testing

### Test Scenarios

1. **Cast first vote**: Should create vote and return stats
2. **Change vote**: Should update vote type
3. **Duplicate vote**: Should return 409 error
4. **Threshold trigger**: Vote that crosses threshold triggers event
5. **Remove vote**: Should delete vote and update stats
6. **Get vote counts**: Should return accurate aggregates

### Test Data

```bash
# Create test problem
POST /api/problems
{
  "userId": "test-user-1",
  "title": "Test Problem",
  ...
}

# Cast 100 votes to test threshold
for i in {1..100}; do
  POST /api/votes
  {
    "userId": "test-user-$i",
    "problemId": "test-problem-1",
    "voteType": "upvote"
  }
done
```

---

## Performance

### Optimization Strategies

1. **Materialized View**: Pre-computed vote aggregates
2. **Indexes**:
   - Unique index on (user_id, problem_id)
   - Index on problem_id for aggregates
3. **Caching**: Hot problem vote counts cached in Redis
4. **Batching**: Future: Batch vote processing

### Expected Performance

- **Vote Cast**: < 100ms
- **Get Counts**: < 50ms (cached)
- **Trending**: < 200ms

---

## Changelog

### v1.0.0 (2025-11-07)
- Initial release
- Cast/update/remove votes
- Vote aggregates
- Trending problems
- Threshold notifications
