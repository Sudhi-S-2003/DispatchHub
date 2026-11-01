# -------------------------------------------------------------
# Stage 1: Dependencies Cache (Node 22 LTS Alpine)
# -------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# -------------------------------------------------------------
# Stage 2: Production TypeScript Builder (Node 22 LTS)
# -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# -------------------------------------------------------------
# Stage 3: Hardened Rootless Production Runner (Node 22 LTS)
# -------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOME=/home/nestjs

# Create dedicated non-root system group and user (UID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --home /home/nestjs nestjs && \
    mkdir -p /home/nestjs /app && \
    chown -R nestjs:nodejs /home/nestjs /app

# Copy built application and pruned production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nestjs

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node dist/main.js"]
