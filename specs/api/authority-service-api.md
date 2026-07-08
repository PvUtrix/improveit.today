---
status: implemented
service: authority-service
version: 1.0.0
---

# Authority Service API Specification

## Overview

The Authority Service manages jurisdictions (administrative boundaries) and the authorities responsible for them. It powers the authority dashboard, jurisdiction lookup for problem routing, and per-region notification thresholds.

**Base URLs**: `/api/authorities`, `/api/jurisdictions`
**Version**: 1.0.0
**Authentication**: Required (JWT Bearer Token)
**Port**: 8005

## Endpoints — Authorities

### 1. Register Authority

```
POST /authorities
```

**Body**:
```typescript
interface RegisterAuthorityRequest {
  name: string;                     // Required
  jurisdictionId: string;           // Required, UUID of an existing jurisdiction
  userId?: string;                  // Linked user account
  type?: string;                    // e.g. "roads", "sanitation"
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  notificationThreshold?: number;   // Default 100 upvotes
  notificationEmail?: string;       // Defaults to contactEmail
  notificationPhone?: string;
  webhookUrl?: string;
}
```

**Responses**: `201` authority object · `400` validation error · `404` jurisdiction not found

**Events**: publishes `authority.registered`

### 2. List Authorities

```
GET /authorities?jurisdictionId=&verified=&active=&page=&limit=
```

Returns paginated authorities with `meta` pagination block.

### 3. Get Authority

```
GET /authorities/:id
```

Returns the authority joined with its jurisdiction name/type. `404` if missing.

### 4. Update Authority

```
PATCH /authorities/:id
```

Updatable fields: `name`, `type`, `contactEmail`, `contactPhone`, `websiteUrl`, `notificationThreshold`, `notificationEmail`, `notificationPhone`, `webhookUrl`, `isActive`.

### 5. Verify Authority

```
POST /authorities/:id/verify
```

Marks the authority as verified (admin/moderator action). Publishes `authority.verified`.

### 6. Deactivate Authority

```
DELETE /authorities/:id
```

Soft delete — sets `is_active = false`.

### 7. Authority Dashboard

```
GET /authorities/:id/dashboard
```

**Response data**:
```typescript
interface DashboardResponse {
  totalProblems: number;
  byStatus: Record<string, number>;          // reported, escalated, resolved, ...
  topCategories: { category: string; count: number }[];
  resolutionTime: { avgDays: number | null; medianDays: number | null };
  escalatedProblems: ProblemSummary[];       // top 10 by upvotes
}
```

### 8. Problems in Jurisdiction

```
GET /authorities/:id/problems?status=&page=&limit=
```

Paginated problems in the authority's jurisdiction with coordinates and vote counts, ordered by upvotes.

## Endpoints — Jurisdictions

### 9. Create Jurisdiction

```
POST /jurisdictions
```

**Body**:
```typescript
interface CreateJurisdictionRequest {
  name: string;                 // Required
  type: 'country' | 'state' | 'province' | 'city' | 'district' | 'neighborhood';
  boundary?: GeoJSONPolygon;    // Stored as PostGIS geography
  parentId?: string;            // Parent jurisdiction UUID
  metadata?: Record<string, unknown>;
}
```

### 10. List Jurisdictions

```
GET /jurisdictions?type=&parentId=&search=&page=&limit=
```

### 11. Point Lookup

```
GET /jurisdictions/lookup?lat=&lng=
```

Returns all jurisdictions whose boundary covers the point, ordered smallest → largest (neighborhood before country). Used to route new problems to the right authority.

### 12. Get / Update Jurisdiction

```
GET /jurisdictions/:id      // boundary returned as GeoJSON
PATCH /jurisdictions/:id    // name, boundary, parentId, metadata
```

## Events Published

| Event | Payload |
|-------|---------|
| `authority.registered` | `authorityId`, `jurisdictionId`, `name` |
| `authority.verified` | `authorityId`, `jurisdictionId`, `name` |

## Error Codes

`VALIDATION_ERROR` (400) · `NOT_FOUND` (404) · `INTERNAL_ERROR` (500)
