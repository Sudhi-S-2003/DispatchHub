# -------------------------------------------------------------
# Stage 1: Dependencies Cache (Node 22 LTS Alpine)
# -------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit

# -------------------------------------------------------------
# Stage 2: Next.js Production Builder (Node 22 LTS)
# -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN npm prune --omit=dev --no-audit

# -------------------------------------------------------------
# Stage 3: Hardened Rootless Production Runner (Node 22 LTS)
# -------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/home/nextjs

# Create dedicated non-root system group and user (UID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --home /home/nextjs nextjs && \
    mkdir -p /home/nextjs /app/.next /app/public && \
    chown -R nextjs:nodejs /home/nextjs /app

# Copy built application assets with non-root ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
