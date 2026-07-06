# IMPORTANT — Coolify compatibility:
# Coolify auto-injects every env var as an `ARG` declaration at the top
# of every stage, and rewrites `RUN` / `ENV` blocks. This Dockerfile
# keeps every `RUN` and `ENV` on a single line so Coolify's injection
# doesn't break shell line-continuations.

# --- Stage 1: install dependencies with full devDeps so `next build` works ---
FROM node:20-alpine AS deps

WORKDIR /app

# Install with `--legacy-peer-deps` to avoid React 18 / Next.js 14 peer
# dep churn. Cache the layer on package-lock.json only.
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# --- Stage 2: build the Next.js app ---
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse the installed node_modules from `deps` so we don't pay the
# install cost twice.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These are baked into the client bundle at build time. Coolify
# auto-injects them as ARG with matching names from `docker-compose.yml`
# `args:` block + the resource env vars, so we don't redeclare them
# here. The ENV then materialises the ARG into the build environment.
ENV NEXT_TELEMETRY_DISABLED=1

# `next build` outputs the production app to .next/standalone if
# `output: 'standalone'` is set in next.config.mjs. We don't set it
# today, so we ship the regular .next build and rely on `next start`.
RUN npm run build

# --- Stage 3: minimal runtime image ---
FROM node:20-alpine AS runtime

WORKDIR /app

# Single-line ENV: Coolify rewrites multi-line ones and breaks them.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Non-root user for the runtime.
RUN addgroup -g 10001 -S app && adduser -S -u 10001 -G app app

# Copy the standalone-ish bits we need at runtime.
# next start requires: node_modules, .next, public, package.json
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/next.config.mjs ./next.config.mjs

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
