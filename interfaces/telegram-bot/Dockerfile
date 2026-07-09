# Telegram bot — built in the monorepo, run with node.
# Build context is the REPO ROOT (depends on the @improveit/common workspace).

# ---- build stage ----------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY interfaces/telegram-bot ./interfaces/telegram-bot

RUN npm install

# turbo builds @improveit/common first, then the bot (tsc → dist/).
RUN npx turbo run build --filter=telegram-bot

# ---- runtime stage --------------------------------------------------------
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/interfaces/telegram-bot/dist ./dist
COPY --from=builder /app/interfaces/telegram-bot/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

CMD ["node", "dist/index.js"]
