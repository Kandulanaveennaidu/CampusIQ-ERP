# ─────────────────────────────────────────────────────────────────────────────
# CampusIQ — Production Dockerfile (Pre-built)
# ─────────────────────────────────────────────────────────────────────────────
# For low-RAM servers (t2.micro = 1GB), build on the HOST first:
#   npm install
#   NODE_OPTIONS="--max_old_space_size=1536" npm run build
# Then: docker compose up -d --build
#
# For high-RAM servers or CI/CD (GitHub Actions), use multi-stage build.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy pre-built application from host
COPY package.json ./
COPY node_modules ./node_modules
COPY .next ./.next
COPY public ./public
COPY server.js ./
COPY next.config.mjs ./

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]