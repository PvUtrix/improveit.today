FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY services/search-service ./services/search-service

# Install dependencies
RUN npm install

# Build
RUN npx turbo run build --filter=search-service

FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/search-service/dist ./dist
COPY --from=builder /app/services/search-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 8009

CMD ["node", "dist/index.js"]
