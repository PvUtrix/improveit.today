# ImproveIt.Today - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  Telegram Bot  │  Web App  │  WhatsApp  │  Mobile Apps  │  API SDK  │
└────────┬────────────┬───────────┬─────────────┬──────────────┬───────┘
         │            │           │             │              │
         └────────────┴───────────┴─────────────┴──────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   CDN / Load Balancer   │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │            API GATEWAY (Kong/Nginx)           │
         │  - Authentication  - Rate Limiting  - Routing │
         └───────────────────────┬───────────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                    MICROSERVICES LAYER                   │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │    User      │  │   Problem    │  │   Voting     │  │
    │  │   Service    │  │   Service    │  │   Service    │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │  Geolocation │  │  Authority   │  │   Payment    │  │
    │  │   Service    │  │   Service    │  │   Service    │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │   Bidding    │  │ Notification │  │   Search     │  │
    │  │   Service    │  │   Service    │  │   Service    │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │    Media     │  │  Analytics   │  │  Moderation  │  │
    │  │   Service    │  │   Service    │  │   Service    │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    │                                                          │
    └────────────────────────────┬─────────────────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                     MESSAGE QUEUE                        │
    │                   (Kafka / RabbitMQ)                     │
    │  - Event Bus  - Async Processing  - Service Decoupling  │
    └────────────────────────────┬─────────────────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                      DATA LAYER                          │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │  PostgreSQL  │  │    Redis     │  │ Elasticsearch│  │
    │  │  + PostGIS   │  │   (Cache)    │  │   (Search)   │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │ TimescaleDB  │  │  S3 / MinIO  │  │   MongoDB    │  │
    │  │ (Time-series)│  │ (Media/Blob) │  │  (Optional)  │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    │                                                          │
    └──────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │                   INFRASTRUCTURE LAYER                    │
    ├──────────────────────────────────────────────────────────┤
    │  Kubernetes  │  Docker  │  Monitoring  │  Logging  │ CI/CD│
    └──────────────────────────────────────────────────────────┘
```

---

## Service Breakdown

### 1. User Service
**Responsibility**: User management, authentication, profiles

**Endpoints**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /users/:id` - Get user profile
- `PATCH /users/:id` - Update profile
- `GET /users/:id/reputation` - Get reputation score

**Database Tables**:
- `users` (id, email, username, password_hash, created_at)
- `user_profiles` (user_id, avatar_url, bio, language, timezone)
- `user_reputation` (user_id, points, level, badges)

---

### 2. Problem Service
**Responsibility**: CRUD operations for problems/issues

**Endpoints**:
- `POST /problems` - Create new problem
- `GET /problems/:id` - Get problem details
- `PATCH /problems/:id` - Update problem
- `DELETE /problems/:id` - Delete problem
- `GET /problems` - List/search problems with filters
- `PATCH /problems/:id/status` - Update status

**Database Tables**:
- `problems` (id, user_id, title, description, location (geometry), category, status, created_at)
- `problem_media` (id, problem_id, media_url, media_type)
- `problem_history` (id, problem_id, status, changed_by, changed_at)

**PostGIS Queries**:
```sql
-- Find problems within radius
SELECT * FROM problems
WHERE ST_DWithin(location, ST_MakePoint(lng, lat)::geography, 1000);

-- Find problems in polygon (jurisdiction)
SELECT * FROM problems
WHERE ST_Within(location, jurisdiction_boundary);
```

---

### 3. Voting Service
**Responsibility**: Handle upvotes/downvotes and vote aggregation

**Endpoints**:
- `POST /votes` - Cast a vote
- `DELETE /votes/:id` - Remove vote
- `GET /problems/:id/votes` - Get vote count

**Database Tables**:
- `votes` (id, user_id, problem_id, vote_type, created_at)
- `vote_aggregates` (problem_id, upvotes, downvotes, score, updated_at)

**Business Logic**:
- Prevent duplicate votes from same user
- Calculate weighted score (prevent vote manipulation)
- Real-time score updates via WebSocket

---

### 4. Geolocation Service
**Responsibility**: Geocoding, reverse geocoding, jurisdiction mapping

**Endpoints**:
- `GET /geocode?address={address}` - Address to coordinates
- `GET /reverse-geocode?lat={lat}&lng={lng}` - Coordinates to address
- `GET /jurisdiction?lat={lat}&lng={lng}` - Find jurisdiction

**External APIs**:
- OpenStreetMap Nominatim
- Google Maps API (fallback)

**Database Tables**:
- `jurisdictions` (id, name, type, boundary (geometry), parent_id)
- `authorities` (id, jurisdiction_id, name, contact_info, notification_threshold)

---

### 5. Authority Service
**Responsibility**: Manage authorities and send notifications

**Endpoints**:
- `POST /authorities` - Register authority
- `GET /authorities/:id` - Get authority details
- `POST /authorities/:id/notify` - Manual notification
- `GET /authorities/:id/problems` - Problems in jurisdiction

**Notification Triggers**:
- Problem reaches vote threshold
- Problem escalation (not addressed in time)
- Problem resolved (confirmation request)

**Notification Channels**:
- Email
- SMS
- API Webhook
- Dashboard alert

---

### 6. Payment Service
**Responsibility**: Handle payments, crowdfunding, escrow

**Endpoints**:
- `POST /payments/intent` - Create payment intent
- `POST /payments/confirm` - Confirm payment
- `GET /payments/:id` - Payment status
- `POST /crowdfunding/:problem_id/contribute` - Contribute to fund
- `GET /crowdfunding/:problem_id/status` - Funding status

**Database Tables**:
- `funding_campaigns` (id, problem_id, goal_amount, current_amount, status)
- `contributions` (id, campaign_id, user_id, amount, payment_intent_id)
- `escrow_accounts` (id, problem_id, amount, released, release_conditions)
- `transactions` (id, type, amount, from_user, to_user, status, created_at)

**Integration**:
- Stripe for card payments
- PayPal
- Cryptocurrency wallets (optional)

---

### 7. Bidding Service
**Responsibility**: Manage bids from solvers

**Endpoints**:
- `POST /bids` - Submit bid
- `GET /problems/:id/bids` - Get all bids for problem
- `PATCH /bids/:id` - Update bid
- `POST /bids/:id/accept` - Accept bid

**Database Tables**:
- `solvers` (id, user_id, company_name, verification_status, rating)
- `bids` (id, problem_id, solver_id, amount, timeline, description, status)
- `bid_reviews` (id, bid_id, rating, comment, created_at)

---

### 8. Notification Service
**Responsibility**: Multi-channel notifications

**Endpoints**:
- `POST /notifications/send` - Send notification
- `GET /notifications/:user_id` - Get user notifications
- `PATCH /notifications/:id/read` - Mark as read

**Channels**:
- In-app notifications
- Email (SendGrid/SES)
- SMS (Twilio)
- Push notifications (FCM/APNs)
- Telegram messages

**Database Tables**:
- `notifications` (id, user_id, type, content, read, created_at)
- `notification_preferences` (user_id, channel, enabled)

---

### 9. Search Service
**Responsibility**: Full-text search using Elasticsearch

**Endpoints**:
- `GET /search?q={query}` - Search problems
- `GET /search/suggest?q={query}` - Auto-complete

**Elasticsearch Index Structure**:
```json
{
  "problems": {
    "mappings": {
      "properties": {
        "title": { "type": "text" },
        "description": { "type": "text" },
        "category": { "type": "keyword" },
        "location": { "type": "geo_point" },
        "status": { "type": "keyword" },
        "votes": { "type": "integer" },
        "created_at": { "type": "date" }
      }
    }
  }
}
```

---

### 10. Media Service
**Responsibility**: Upload, storage, and delivery of images/videos

**Endpoints**:
- `POST /media/upload` - Upload file
- `GET /media/:id` - Get file metadata
- `DELETE /media/:id` - Delete file

**Storage**:
- S3-compatible object storage
- CDN for delivery (CloudFlare)
- Image optimization (compression, resizing)

**Processing**:
- Automatic thumbnail generation
- EXIF data extraction (GPS coordinates from photos)
- Content moderation (image scanning)

---

### 11. Analytics Service
**Responsibility**: Metrics, statistics, and reporting

**Endpoints**:
- `GET /analytics/stats` - Global statistics
- `GET /analytics/trends` - Trending problems
- `GET /analytics/heatmap` - Geographic heatmap data
- `GET /analytics/impact/:problem_id` - Problem impact metrics

**Data Sources**:
- TimescaleDB for time-series data
- Pre-aggregated views for performance

**Metrics Tracked**:
- Problems created/resolved over time
- Average resolution time
- Funding amounts
- User engagement rates
- Geographic distribution

---

### 12. Moderation Service
**Responsibility**: Content moderation and spam prevention

**Endpoints**:
- `POST /moderation/flag` - Flag content
- `GET /moderation/queue` - Moderation queue
- `POST /moderation/review/:id` - Review flagged content

**Features**:
- Automated spam detection (ML model)
- Profanity filter
- Duplicate problem detection
- Image content scanning
- User behavior analysis

---

## Data Flow Examples

### Example 1: User Reports a Problem via Telegram

```
1. User sends location + photo + description to Telegram bot
   ↓
2. Bot validates input and calls API Gateway
   ↓
3. API Gateway authenticates request
   ↓
4. Media Service uploads photo to S3
   ↓
5. Geolocation Service geocodes location and finds jurisdiction
   ↓
6. Problem Service creates problem record in PostgreSQL
   ↓
7. Search Service indexes problem in Elasticsearch
   ↓
8. Notification Service notifies nearby users
   ↓
9. Event published to Kafka (problem.created)
   ↓
10. Analytics Service updates statistics
   ↓
11. Response sent back to Telegram bot
   ↓
12. User receives confirmation with problem ID and link
```

### Example 2: Problem Reaches Vote Threshold

```
1. User upvotes problem
   ↓
2. Voting Service increments vote count
   ↓
3. Vote aggregate recalculated
   ↓
4. Threshold check: votes >= jurisdiction.notification_threshold
   ↓
5. Event published to Kafka (problem.threshold_reached)
   ↓
6. Authority Service consumes event
   ↓
7. Authority record retrieved for jurisdiction
   ↓
8. Notification Service sends email/SMS to authority
   ↓
9. Problem status updated to "escalated"
   ↓
10. Notification sent to problem reporter
   ↓
11. WebSocket broadcasts update to all clients viewing the problem
```

### Example 3: Solver Bids and Gets Accepted

```
1. Solver submits bid via web interface
   ↓
2. Bidding Service validates solver credentials
   ↓
3. Bid stored in database
   ↓
4. Notification sent to problem reporter
   ↓
5. Reporter reviews bids and accepts one
   ↓
6. Bidding Service updates bid status to "accepted"
   ↓
7. Payment Service creates escrow account
   ↓
8. Notification sent to solver to start work
   ↓
9. Problem status updated to "in_progress"
   ↓
10. Crowdfunding continues until goal reached
```

---

## Database Schema (Simplified)

### Core Tables

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Problems
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'reported',
    jurisdiction_id UUID REFERENCES jurisdictions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_problems_location ON problems USING GIST(location);
CREATE INDEX idx_problems_status ON problems(status);
CREATE INDEX idx_problems_category ON problems(category);

-- Votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    problem_id UUID REFERENCES problems(id),
    vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, problem_id)
);

-- Vote Aggregates (materialized view)
CREATE MATERIALIZED VIEW vote_aggregates AS
SELECT
    problem_id,
    COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes,
    COUNT(*) FILTER (WHERE vote_type = 'upvote') -
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as score
FROM votes
GROUP BY problem_id;

-- Jurisdictions
CREATE TABLE jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- country, state, city, district
    boundary GEOGRAPHY(POLYGON, 4326),
    parent_id UUID REFERENCES jurisdictions(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jurisdictions_boundary ON jurisdictions USING GIST(boundary);

-- Authorities
CREATE TABLE authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID REFERENCES jurisdictions(id),
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notification_threshold INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bids
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES problems(id),
    solver_id UUID REFERENCES solvers(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    timeline_days INTEGER,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Funding Campaigns
CREATE TABLE funding_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES problems(id),
    goal_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active',
    deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Contributions
CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES funding_campaigns(id),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Scalability Strategy

### Horizontal Scaling
- All services are stateless (can scale independently)
- Load balancer distributes requests across service instances
- Session state stored in Redis (shared)

### Database Scaling
1. **Read Replicas**: PostgreSQL read replicas for read-heavy operations
2. **Sharding**: Shard by geographic region (problems in Asia → Asia shard)
3. **Caching**: Redis for frequently accessed data (hot problems, user sessions)
4. **CDN**: Static assets and media served via CDN

### Caching Strategy
```
Level 1: Browser Cache (static assets)
Level 2: CDN Cache (images, videos)
Level 3: Application Cache (Redis)
Level 4: Database Query Cache
```

### Geographic Distribution
```
Region: North America
- API Servers: us-east, us-west
- Database: Primary in us-east, Replica in us-west
- Media Storage: S3 in us-east with CloudFront

Region: Europe
- API Servers: eu-west, eu-central
- Database: Replica in eu-west
- Media Storage: S3 in eu-west with CloudFront

Region: Asia
- API Servers: ap-south, ap-east
- Database: Replica in ap-south
- Media Storage: S3 in ap-south with CloudFront
```

---

## Security Architecture

### Authentication & Authorization
```
1. User logs in → User Service validates credentials
2. JWT token generated (15 min expiry)
3. Refresh token stored in Redis (7 days expiry)
4. Every API request includes JWT in Authorization header
5. API Gateway validates JWT before routing
6. Service extracts user_id from JWT for authorization
```

### Data Security
- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- Database credentials stored in secrets manager
- API keys rotated regularly
- No sensitive data in logs

### Rate Limiting
```
Tier 1 (Unauthenticated): 10 requests/minute
Tier 2 (Authenticated User): 100 requests/minute
Tier 3 (Verified Solver): 500 requests/minute
Tier 4 (API Partner): 10,000 requests/minute
```

### DDoS Protection
- CloudFlare in front of infrastructure
- Auto-scaling to handle traffic spikes
- Request throttling per IP
- Challenge pages for suspicious traffic

---

## Monitoring & Observability

### Metrics (Prometheus)
- Request rate, latency, error rate per service
- Database query performance
- Cache hit/miss rates
- Queue depth (Kafka)
- Resource utilization (CPU, memory, disk)

### Logging (ELK Stack)
- Centralized logging from all services
- Structured JSON logs
- Request tracing with correlation IDs
- Error tracking and alerting

### Tracing (Jaeger/Zipkin)
- Distributed tracing across services
- Identify bottlenecks in request flow
- Visualize service dependencies

### Alerts
- High error rate (>5%)
- Slow response time (>500ms p95)
- Database connection pool exhaustion
- High queue lag (Kafka)
- Disk space low (<20%)

---

## Deployment Strategy

### Environments
1. **Local Development**: Docker Compose
2. **Staging**: Kubernetes cluster (reduced capacity)
3. **Production**: Multi-region Kubernetes

### CI/CD Pipeline
```
1. Developer pushes code to GitHub
   ↓
2. GitHub Actions triggers build
   ↓
3. Run tests (unit, integration, e2e)
   ↓
4. Build Docker image
   ↓
5. Push to container registry
   ↓
6. Deploy to staging
   ↓
7. Run smoke tests
   ↓
8. Manual approval gate
   ↓
9. Deploy to production (rolling update)
   ↓
10. Monitor metrics for 15 minutes
   ↓
11. Auto-rollback if errors detected
```

### Blue-Green Deployment
- Maintain two identical production environments
- Deploy to "green" while "blue" serves traffic
- Switch traffic to "green" after validation
- Keep "blue" for quick rollback

---

## Technology Choices Rationale

### Why Node.js/TypeScript?
- Large ecosystem and community
- Excellent for I/O-bound operations
- Easy to hire developers
- Strong typing with TypeScript
- Good performance for web services

### Why PostgreSQL + PostGIS?
- Robust relational database
- Excellent geospatial support (PostGIS)
- ACID compliance
- Mature replication and backup
- Open source

### Why Kafka?
- High throughput
- Durable message storage
- Supports event sourcing patterns
- Decouples services effectively

### Why Kubernetes?
- Industry standard for orchestration
- Auto-scaling capabilities
- Self-healing
- Multi-cloud support
- Large ecosystem

---

**Last Updated**: 2025-11-07
