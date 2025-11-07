# Project Structure

## Monorepo Organization

```
improveit.today/
├── README.md
├── ROADMAP.md
├── ARCHITECTURE.md
├── FEATURES.md
├── PROJECT_STRUCTURE.md
├── LICENSE
├── .gitignore
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd-staging.yml
│       └── cd-production.yml
│
├── packages/                    # Shared packages
│   ├── common/                  # Shared types, utilities
│   ├── database/                # Database schemas, migrations
│   └── proto/                   # Protocol buffers (if using gRPC)
│
├── services/                    # Microservices
│   ├── api-gateway/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── problem-service/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── voting-service/
│   ├── geolocation-service/
│   ├── authority-service/
│   ├── payment-service/
│   ├── bidding-service/
│   ├── notification-service/
│   ├── search-service/
│   ├── media-service/
│   ├── analytics-service/
│   └── moderation-service/
│
├── interfaces/                  # User-facing interfaces
│   ├── telegram-bot/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   ├── handlers/
│   │   │   ├── keyboards/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web-app/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── globe-visualization/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── three/           # Three.js scenes
│   │   │   ├── shaders/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── authority-dashboard/
│       ├── src/
│       └── package.json
│
├── mobile/                      # Future: React Native apps
│   ├── ios/
│   └── android/
│
├── infrastructure/              # Infrastructure as Code
│   ├── kubernetes/
│   │   ├── base/
│   │   ├── staging/
│   │   └── production/
│   ├── terraform/
│   │   ├── aws/
│   │   ├── gcp/
│   │   └── azure/
│   └── helm/
│
├── scripts/                     # Utility scripts
│   ├── seed-data.ts
│   ├── migrate.ts
│   └── setup-dev.sh
│
└── docs/                        # Additional documentation
    ├── api/
    │   ├── openapi.yml
    │   └── postman-collection.json
    ├── guides/
    │   ├── getting-started.md
    │   ├── development.md
    │   ├── deployment.md
    │   └── contributing.md
    └── diagrams/
        ├── architecture.svg
        └── data-flow.svg
```

---

## Service Details

### API Gateway
**Port**: 8000
**Tech**: Kong or Express.js
**Responsibilities**:
- Request routing
- Authentication (JWT validation)
- Rate limiting
- Request/response transformation
- API versioning

### User Service
**Port**: 8001
**Database**: PostgreSQL
**Endpoints**:
- `/auth/*` - Authentication
- `/users/*` - User management
- `/profiles/*` - User profiles
- `/reputation/*` - Reputation system

### Problem Service
**Port**: 8002
**Database**: PostgreSQL + PostGIS
**Endpoints**:
- `/problems/*` - CRUD operations
- `/problems/:id/media` - Media attachments
- `/problems/:id/history` - Change history

### Voting Service
**Port**: 8003
**Database**: PostgreSQL + Redis (cache)
**Endpoints**:
- `/votes/*` - Vote management
- `/problems/:id/votes` - Vote aggregates

### Geolocation Service
**Port**: 8004
**External APIs**: OSM Nominatim, Google Maps
**Endpoints**:
- `/geocode` - Address to coordinates
- `/reverse-geocode` - Coordinates to address
- `/jurisdiction` - Find jurisdiction

### Authority Service
**Port**: 8005
**Database**: PostgreSQL
**Endpoints**:
- `/authorities/*` - Authority management
- `/authorities/:id/notify` - Send notifications
- `/authorities/:id/problems` - Problems in jurisdiction

### Payment Service
**Port**: 8006
**External**: Stripe, PayPal
**Endpoints**:
- `/payments/*` - Payment operations
- `/crowdfunding/*` - Crowdfunding campaigns
- `/escrow/*` - Escrow accounts

### Bidding Service
**Port**: 8007
**Database**: PostgreSQL
**Endpoints**:
- `/bids/*` - Bid management
- `/solvers/*` - Solver profiles

### Notification Service
**Port**: 8008
**External**: SendGrid, Twilio, FCM
**Endpoints**:
- `/notifications/*` - Send & manage notifications
- `/preferences/*` - User preferences

### Search Service
**Port**: 8009
**Database**: Elasticsearch
**Endpoints**:
- `/search` - Full-text search
- `/suggest` - Auto-complete

### Media Service
**Port**: 8010
**Storage**: S3/MinIO
**Endpoints**:
- `/media/upload` - Upload files
- `/media/:id` - Get/delete files

### Analytics Service
**Port**: 8011
**Database**: TimescaleDB
**Endpoints**:
- `/analytics/stats` - Global statistics
- `/analytics/trends` - Trending data
- `/analytics/heatmap` - Geographic heatmap

### Moderation Service
**Port**: 8012
**Database**: PostgreSQL
**ML Models**: Content classification
**Endpoints**:
- `/moderation/flag` - Flag content
- `/moderation/queue` - Moderation queue
- `/moderation/review` - Review content

---

## Telegram Bot Structure

```
telegram-bot/
├── src/
│   ├── commands/
│   │   ├── start.ts           # /start command
│   │   ├── report.ts          # /report command
│   │   ├── nearby.ts          # /nearby command
│   │   ├── my-reports.ts      # /my_reports command
│   │   ├── search.ts          # /search command
│   │   └── index.ts
│   │
│   ├── handlers/
│   │   ├── location.ts        # Location sharing handler
│   │   ├── photo.ts           # Photo upload handler
│   │   ├── text.ts            # Text message handler
│   │   ├── callback.ts        # Inline keyboard callbacks
│   │   └── index.ts
│   │
│   ├── keyboards/
│   │   ├── main-menu.ts       # Main menu keyboard
│   │   ├── categories.ts      # Category selection
│   │   ├── problem-actions.ts # Problem action buttons
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── api-client.ts      # HTTP client for backend APIs
│   │   ├── problem.ts         # Problem-related logic
│   │   ├── user.ts            # User-related logic
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts      # Message formatting
│   │   ├── validators.ts      # Input validation
│   │   ├── constants.ts       # Constants
│   │   └── logger.ts          # Logging utility
│   │
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── rate-limit.ts      # Rate limiting
│   │   └── error-handler.ts   # Error handling
│   │
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   │
│   └── index.ts               # Bot entry point
│
├── tests/
│   ├── commands/
│   ├── handlers/
│   └── integration/
│
├── .env.example
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## Web App Structure

```
web-app/
├── public/
│   ├── index.html
│   └── assets/
│
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── Map.tsx
│   │   │   ├── ProblemMarker.tsx
│   │   │   ├── Filters.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── ProblemDetails/
│   │   │   ├── ProblemDetails.tsx
│   │   │   ├── VoteButton.tsx
│   │   │   ├── FundingProgress.tsx
│   │   │   ├── BidList.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── Globe/
│   │   │   ├── Globe.tsx
│   │   │   ├── GlobeScene.ts
│   │   │   └── index.ts
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── index.ts
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── MapView.tsx
│   │   ├── GlobeView.tsx
│   │   ├── ProblemDetail.tsx
│   │   ├── Profile.tsx
│   │   ├── SolverDashboard.tsx
│   │   └── AuthorityDashboard.tsx
│   │
│   ├── services/
│   │   ├── api.ts             # API client
│   │   ├── auth.ts            # Auth service
│   │   ├── websocket.ts       # WebSocket client
│   │   └── index.ts
│   │
│   ├── hooks/
│   │   ├── useProblems.ts
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   └── index.ts
│   │
│   ├── store/                 # State management (Redux/Zustand)
│   │   ├── slices/
│   │   └── store.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   └── theme.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── App.tsx
│   └── index.tsx
│
├── tests/
├── package.json
└── tsconfig.json
```

---

## Database Schema Files

```
packages/database/
├── migrations/                # SQL migration files
│   ├── 001_initial_schema.sql
│   ├── 002_add_voting.sql
│   ├── 003_add_payments.sql
│   └── ...
│
├── seeds/                     # Seed data for development
│   ├── users.sql
│   ├── jurisdictions.sql
│   └── sample-problems.sql
│
├── schemas/                   # Schema definitions
│   ├── users.sql
│   ├── problems.sql
│   ├── votes.sql
│   ├── authorities.sql
│   └── ...
│
└── scripts/
    ├── migrate.ts
    ├── rollback.ts
    └── seed.ts
```

---

## Environment Variables

### Development
```env
# API Gateway
API_GATEWAY_PORT=8000
JWT_SECRET=dev-secret-key

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=improveit
POSTGRES_PASSWORD=dev-password
POSTGRES_DB=improveit_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Services
USER_SERVICE_URL=http://localhost:8001
PROBLEM_SERVICE_URL=http://localhost:8002
# ... other services

# External APIs
TELEGRAM_BOT_TOKEN=your-bot-token
MAPBOX_API_KEY=your-mapbox-key
STRIPE_SECRET_KEY=your-stripe-key
SENDGRID_API_KEY=your-sendgrid-key

# Storage
S3_BUCKET=improveit-dev
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

---

## Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: improveit_dev
      POSTGRES_USER: improveit
      POSTGRES_PASSWORD: dev-password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  elasticsearch:
    image: elasticsearch:8.9.0
    environment:
      discovery.type: single-node
    ports:
      - "9200:9200"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

volumes:
  postgres-data:
  minio-data:
```

---

## Development Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone https://github.com/yourorg/improveit.today.git
cd improveit.today

# Install dependencies
npm install

# Start infrastructure (Docker)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start all services in development mode
npm run dev
```

### 2. Development
```bash
# Start specific service
npm run dev:user-service
npm run dev:telegram-bot
npm run dev:web-app

# Run tests
npm run test                    # All tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests

# Linting & formatting
npm run lint
npm run format

# Type checking
npm run typecheck
```

### 3. Building
```bash
# Build all services
npm run build

# Build specific service
npm run build:user-service
npm run build:web-app

# Build Docker images
docker build -t improveit/user-service:latest ./services/user-service
```

---

## Deployment

### Staging
```bash
# Deploy to staging
npm run deploy:staging

# Or via CI/CD (GitHub Actions)
git push origin develop
```

### Production
```bash
# Deploy to production (requires approval)
npm run deploy:production

# Or via CI/CD
git push origin main
```

---

**Last Updated**: 2025-11-07
