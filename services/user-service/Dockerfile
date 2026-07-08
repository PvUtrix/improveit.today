FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY services/user-service ./services/user-service

# Install dependencies
RUN npm install

# Build
RUN npx turbo run build --filter=user-service

FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/user-service/dist ./dist
COPY --from=builder /app/services/user-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 8001

CMD ["node", "dist/index.js"]
