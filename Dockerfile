# syntax=docker/dockerfile:1.7

# ---------- Stage 1: deps (full deps for dev + build) ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: dev (used by docker compose, hot reload) ----------
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---------- Stage 3: builder (compile TS, resolve path aliases) ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 4: prod-deps (runtime deps only) ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Stage 5: prod (minimal runtime image) ----------
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
RUN addgroup -S nibras && adduser -S nibras -G nibras
COPY --from=prod-deps --chown=nibras:nibras /app/node_modules ./node_modules
COPY --from=builder   --chown=nibras:nibras /app/dist ./dist
COPY --chown=nibras:nibras package.json ./
USER nibras
EXPOSE 3000
CMD ["node", "dist/main.js"]
