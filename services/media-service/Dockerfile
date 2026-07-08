FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY services/media-service ./services/media-service

# Install dependencies
RUN npm install

# Build
RUN npx turbo run build --filter=media-service

FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/media-service/dist ./dist
COPY --from=builder /app/services/media-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 8010

CMD ["node", "dist/index.js"]
