#!/bin/bash

# Script to generate basic service structure for all microservices

SERVICES=(
  "problem-service:8002"
  "voting-service:8003"
  "geolocation-service:8004"
  "authority-service:8005"
  "payment-service:8006"
  "bidding-service:8007"
  "notification-service:8008"
  "search-service:8009"
  "media-service:8010"
  "analytics-service:8011"
  "moderation-service:8012"
)

for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_info"

  SERVICE_DIR="services/$service"

  echo "Generating $service..."

  # Create package.json
  cat > "$SERVICE_DIR/package.json" <<EOF
{
  "name": "@improveit/$service",
  "version": "0.1.0",
  "description": "$service for ImproveIt.Today",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@improveit/common": "*",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/pg": "^8.10.9",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
EOF

  # Create tsconfig.json
  cat > "$SERVICE_DIR/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

  # Create basic index.ts
  cat > "$SERVICE_DIR/src/index.ts" <<EOF
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || $port;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '$service' });
});

// Add your routes here

app.listen(PORT, () => {
  console.log(\`$service running on port \${PORT}\`);
});
EOF

  echo "✓ $service generated"
done

echo "All services generated successfully!"
