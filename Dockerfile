# ─────────────────────────────────────────────────────────────
# Puna Bot — production Dockerfile
# ─────────────────────────────────────────────────────────────

# 1. Base image: Node 20 LTS on Debian slim (smaller than full,
#    more compatible than Alpine for native modules like mongodb).
FROM node:20-bookworm-slim AS base

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Install Deoendencies
COPY package.json package-lock.json

# ─────────────────────────────────────────────────────────────
# Build stage: install deps (including devDeps for potential build)
# ─────────────────────────────────────────────────────────────
FROM base AS deps

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# ─────────────────────────────────────────────────────────────
# Runtime stage: copy source, drop privileges, run
# ─────────────────────────────────────────────────────────────
FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000

# Copy production node_modules from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy application source
COPY database.js ./
COPY src ./src

# Create a non-root user so the container doesn't run as root.
# node:20-* images already include a `node` user (uid 1000).
USER node

# Render injects $PORT; expose 3000 as a default for local `docker run`.
EXPOSE 3000

# Health check — matches the /health endpoint in instanceWake.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the bot
CMD ["node", "src/index.js"]
