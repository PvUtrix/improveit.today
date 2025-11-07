# Getting Started with ImproveIt.Today

This guide will help you set up the development environment and get the platform running locally.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourorg/improveit.today.git
cd improveit.today
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all packages and services in the monorepo.

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials
- JWT secret
- API keys (Telegram, Mapbox, etc.)

### 4. Start Infrastructure Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL with PostGIS
- Redis
- Kafka + Zookeeper
- Elasticsearch
- MinIO (S3-compatible storage)
- TimescaleDB

### 5. Run Database Migrations

```bash
npm run db:migrate
```

This creates all necessary tables and indexes.

### 6. Seed Development Data (Optional)

```bash
npm run db:seed
```

Creates a test admin user: `admin@improveit.today` / `admin123`

### 7. Start Development Servers

#### Option A: Start All Services

```bash
npm run dev
```

This starts all microservices, the Telegram bot, and the web app concurrently.

#### Option B: Start Individual Services

```bash
# API Gateway
npm run dev:api-gateway

# User Service
npm run dev:user-service

# Problem Service
npm run dev:problem-service

# Telegram Bot
npm run dev:telegram-bot

# Web App
npm run dev:web-app
```

## Service URLs

Once running, services are available at:

- **API Gateway**: http://localhost:8000
- **Web App**: http://localhost:3000
- **User Service**: http://localhost:8001
- **Problem Service**: http://localhost:8002
- **MinIO Console**: http://localhost:9001

## Testing the Platform

### 1. Test the API

```bash
# Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Create a problem (use token from login response)
curl -X POST http://localhost:8000/api/problems \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "userId": "USER_ID",
    "title": "Pothole on Main Street",
    "description": "Large pothole causing traffic issues",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "category": "roads"
  }'
```

### 2. Test the Telegram Bot

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Add the bot token to `.env`: `TELEGRAM_BOT_TOKEN=your-token`
3. Start the bot: `npm run dev:telegram-bot`
4. Send `/start` to your bot on Telegram

### 3. Test the Web App

1. Open http://localhost:3000
2. Navigate to the Map view
3. See reported problems on the interactive map

## Development Workflow

### Project Structure

```
improveit.today/
├── packages/          # Shared packages
│   ├── common/        # Shared types and utilities
│   └── database/      # Database schemas and migrations
├── services/          # Microservices
│   ├── api-gateway/
│   ├── user-service/
│   ├── problem-service/
│   └── ...
└── interfaces/        # User interfaces
    ├── telegram-bot/
    ├── web-app/
    └── globe-visualization/
```

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run tests:
   ```bash
   npm run test
   ```

4. Lint and format:
   ```bash
   npm run lint
   npm run format
   ```

5. Commit and push:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

### Adding a New Service

1. Create service directory:
   ```bash
   mkdir -p services/my-service/src
   ```

2. Copy `package.json` from another service and modify

3. Create `src/index.ts` with basic Express server

4. Add to API Gateway proxy routes

5. Add to `turbo.json` pipeline

## Common Tasks

### Rebuild Database

```bash
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
npm run db:seed
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Access Database

```bash
docker exec -it improveit-postgres psql -U improveit -d improveit_dev
```

### Access Redis

```bash
docker exec -it improveit-redis redis-cli
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using port
lsof -ti:8000 | xargs kill -9

# Or stop all Docker containers
docker-compose down
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## Next Steps

1. Read [ROADMAP.md](./ROADMAP.md) for development plan
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Read [FEATURES.md](./FEATURES.md) for feature specifications
4. Join our community (links TBD)
5. Start contributing!

## Need Help?

- 📖 Documentation: [docs](./docs)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourorg/improveit.today/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/yourorg/improveit.today/issues)
- 📧 Email: support@improveit.today (TBD)
