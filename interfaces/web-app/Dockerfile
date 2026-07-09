# syntax=docker/dockerfile:1
# Web app (Vite SPA) — built in the monorepo, served by nginx.
# The build context is the REPO ROOT (see docker-compose.coolify.yml / Coolify
# "Base Directory = /"), because the app depends on the @improveit/common
# workspace and the root lockfile.

# ---- build stage ----------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Vite inlines env vars prefixed with VITE_ at BUILD time, so the Mapbox token
# must be present here, not at runtime. Passed via docker build-arg / compose
# build.args. Empty is allowed (the map simply won't render without a token).
ARG VITE_MAPBOX_TOKEN=""
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

# Root manifests + only the workspaces this build needs. The workspace globs
# (packages/*, interfaces/*) match only what's copied, so npm install is happy
# without the other services present.
COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY interfaces/web-app ./interfaces/web-app

RUN npm install

# turbo builds @improveit/common first (build dependency), then the web app.
RUN npx turbo run build --filter=web-app

# ---- runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine

# SPA + /api reverse-proxy config.
COPY interfaces/web-app/nginx.conf /etc/nginx/conf.d/default.conf

# Static build output.
COPY --from=builder /app/interfaces/web-app/dist /usr/share/nginx/html

EXPOSE 80

# nginx runs in the foreground by default via its base image CMD.
