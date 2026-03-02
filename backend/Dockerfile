# ─────────────────────────────────────────────
# Stage 1 : Builder — compile TypeScript → dist/
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ─────────────────────────────────────────────
# Stage 2 : Production — runtime minimal
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="DSI — Ministère de l'Éducation Nationale"
LABEL description="GED Backend API — Plateforme Documentaire"

RUN apk add --no-cache dumb-init \
 && addgroup -S ged && adduser -S ged -G ged

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R ged:ged /app
USER ged

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
