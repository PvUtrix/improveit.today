FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json turbo.json ./
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway

# Install dependencies
RUN npm install

# Build
RUN npm run build --filter=api-gateway

FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8000

CMD ["node", "dist/index.js"]
