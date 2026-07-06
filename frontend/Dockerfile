# IMPORTANT — Coolify compatibility:
# Coolify auto-injects every env var as an `ARG` declaration at the top
# of every stage, and rewrites RUN / ENV blocks. This Dockerfile keeps
# every RUN and ENV on a single line so Coolify's injection doesn't
# break shell line-continuations.

# --- Stage 1: install dependencies ---
FROM node:20-alpine AS deps

WORKDIR /app

# `wget` is needed for the runtime HEALTHCHECK below; install it once
# in the deps stage so it ends up cached in the final image.
RUN apk add --no-cache wget

# Install with `--legacy-peer-deps` to avoid React 18 / Next.js 14
# peer dep churn. Cache the layer on package-lock.json only.
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# --- Stage 2: build the Next.js app ---
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse the installed node_modules from `deps` so we don't pay the
# install cost twice.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Coolify auto-injects NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_API_URL /
# API_INTERNAL_URL as ARGs at the top of this stage (see the
# `args:` block in docker-compose.yml). We have to declare them
# here and then materialise them into the build environment so
# `next build` sees them. Without these lines, `process.env.NEXT_PUBLIC_*`
# is `undefined` and Next.js inlines an empty string into the client
# bundle — which then breaks every fetch at runtime.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG API_INTERNAL_URL

# NEXT_PHASE=phase-production-build tells our server components to
# short-circuit all backend fetches to local fallbacks (see
# `lib/content/read.ts::isBuildPhase`). Without this, `next build`
# will try to reach $API_INTERNAL_URL during static generation and
# either hang or fail.
#
# NODE_OPTIONS=--max-old-space-size=2048 bumps the V8 heap so the
# `next build` step doesn't OOM-kill on small-CPU Coolify hosts.
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PHASE=phase-production-build NODE_OPTIONS=--max-old-space-size=2048 NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL API_INTERNAL_URL=$API_INTERNAL_URL

# `next build` outputs the production app to .next/standalone if
# `output: 'standalone'` is set in next.config.mjs. We don't set it
# today, so we ship the regular .next build and rely on `next start`.
# `set -ex` echoes every command and aborts on the first failure so
# the real error (not just the exit code) shows up in Coolify's log.
RUN set -ex && npm run build

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

# Copy the wget binary from the deps stage so HEALTHCHECK works.
COPY --from=deps /usr/bin/wget /usr/bin/wget

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
