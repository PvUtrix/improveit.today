FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY services/bidding-service ./services/bidding-service

# Install dependencies
RUN npm install

# Build
RUN npx turbo run build --filter=bidding-service

FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/bidding-service/dist ./dist
COPY --from=builder /app/services/bidding-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 8007

CMD ["node", "dist/index.js"]
