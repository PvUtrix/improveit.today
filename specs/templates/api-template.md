---
status: implemented
service: service-name
version: 1.0.0
---

# [Service Name] API Specification

## Overview

Brief description of the service and its purpose.

**Base URL**: `/api/service-name`
**Version**: 1.0.0
**Authentication**: Required (JWT Bearer Token)

## Endpoints

### 1. Endpoint Name

**Purpose**: What does this endpoint do?

#### Request

```
METHOD /path/:param
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param | string | Yes | Description |

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| filter | string | No | null | Filter results |
| limit | number | No | 20 | Max results |

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```typescript
interface RequestBody {
  field1: string;
  field2: number;
  field3?: boolean; // Optional
}
```

**Example**:
```json
{
  "field1": "value",
  "field2": 123,
  "field3": true
}
```

#### Response

**Success (200 OK)**:
```typescript
interface SuccessResponse {
  success: true;
  data: {
    id: string;
    field1: string;
    field2: number;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field1": "value",
    "field2": 123
  }
}
```

**Error Responses**:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

| Status Code | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 500 | INTERNAL_ERROR | Server error |

**Example Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field1": "Required field missing"
    }
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST https://api.improveit.today/api/service-name/resource \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"field1":"value","field2":123}'
```

**JavaScript**:
```javascript
const response = await fetch('/api/service-name/resource', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ field1: 'value', field2: 123 }),
});
const data = await response.json();
```

**TypeScript SDK**:
```typescript
const result = await client.service.createResource({
  field1: 'value',
  field2: 123,
});
```

---

## Data Models

### Model Name

```typescript
interface ModelName {
  id: string;
  field1: string;
  field2: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Field Descriptions**:
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string | Unique identifier | UUID v4 |
| field1 | string | Description | Max 255 chars |
| field2 | number | Description | >= 0 |
| createdAt | Date | Creation timestamp | ISO 8601 |
| updatedAt | Date | Last update timestamp | ISO 8601 |

---

## Events Published

This service publishes the following events to Kafka:

### event.type.name

**Topic**: `improveit-events`
**Key**: `event.type.name`

**Payload**:
```typescript
interface EventPayload {
  id: string;
  type: 'event.type.name';
  timestamp: string;
  data: {
    resourceId: string;
    // ... event-specific data
  };
}
```

**When Published**: Description of when this event is triggered

---

## Rate Limiting

| Tier | Requests per Minute |
|------|---------------------|
| Unauthenticated | 10 |
| Authenticated | 100 |
| Verified | 500 |
| API Partner | 10,000 |

---

## Versioning

API versioning follows semantic versioning (semver).

**Current Version**: 1.0.0
**Deprecated Versions**: None
**Sunset Date**: N/A

### Changelog

#### v1.0.0 (YYYY-MM-DD)
- Initial release
- Endpoints: LIST, CREATE, GET, UPDATE, DELETE

---

## Testing

### Test Data

Test users are available in development/staging:

```json
{
  "email": "test@improveit.today",
  "password": "test123"
}
```

### Sandbox Environment

**URL**: `https://api-staging.improveit.today`
**API Key**: Available in dashboard

---

## Support

- **Documentation**: https://docs.improveit.today
- **Issues**: https://github.com/improveit/issues
- **Contact**: api-support@improveit.today
