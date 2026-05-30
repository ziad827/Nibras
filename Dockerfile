FROM node:22-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=optional

COPY . .

EXPOSE 3000

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=optional

COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=optional --production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
