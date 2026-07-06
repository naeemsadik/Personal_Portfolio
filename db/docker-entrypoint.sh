#!/bin/bash
# Wrapper for the official mysql:8.0 entrypoint.
#
# What this does:
#   1. Substitutes ${MYSQL_PASSWORD} (and any other ${VAR} placeholders)
#      into /docker-entrypoint-initdb.d/init.sql BEFORE the official
#      mysql entrypoint reads it.
#   2. Hands control to the official /usr/local/bin/docker-entrypoint.sh
#      which then runs the (now-substituted) init.sql during first boot.
#
# Why a wrapper is needed:
#   - SQL files in /docker-entrypoint-initdb.d/ are passed straight to
#     the mysql client — MySQL does NOT expand shell env-var syntax
#     like ${MYSQL_PASSWORD}. So without this wrapper, init.sql would
#     send the literal text "${MYSQL_PASSWORD}" to mysql and fail.
#   - The official entrypoint only runs /docker-entrypoint-initdb.d/
#     files ONCE — when /var/lib/mysql is empty.
#
# How this wrapper gets into the container:
#   It's baked into a custom image by db/Dockerfile, copied to
#   /usr/local/bin/custom-entrypoint.sh and set as ENTRYPOINT.
#   The companion file init.sql is also baked in at
#   /docker-entrypoint-initdb.d/init.sql. This avoids the bind-mount
#   approach that hit a "is a directory" runc error in earlier
#   deploys — baking files into the image makes them part of the
#   immutable filesystem layers, so the entrypoint exec path always
#   resolves to a real file.

set -e

INIT_SQL="/docker-entrypoint-initdb.d/init.sql"

# Step 1: envsubst ${MYSQL_PASSWORD} into init.sql.
# Only do this on first boot (when the datadir is empty) — the
# official entrypoint skips init scripts on subsequent boots anyway,
# but rewriting init.sql every time would lose the original
# placeholder syntax (e.g. ${MYSQL_PASSWORD}) which makes debugging
# confusing. The shell `test -d /var/lib/mysql/mysql` returns true
# once MySQL has been initialized, so the absence of that subdir
# means "first boot".
if [ -f "$INIT_SQL" ] && [ ! -d /var/lib/mysql/mysql ]; then
  if [ -n "${MYSQL_PASSWORD:-}" ]; then
    echo "[wrapper] interpolating MYSQL_PASSWORD into $INIT_SQL"
    tmp="$(mktemp)"
    envsubst < "$INIT_SQL" > "$tmp"
    cat "$tmp" > "$INIT_SQL"
    rm -f "$tmp"
  else
    echo "[wrapper] WARNING: MYSQL_PASSWORD not set; init.sql will not be interpolated" >&2
  fi
fi

# Step 2: hand off to the official entrypoint. The mysql:8.0 image
# places its entrypoint at /usr/local/bin/docker-entrypoint.sh and
# exec's whatever we pass as $@ (typically `mysqld` from CMD).
exec /usr/local/bin/docker-entrypoint.sh "$@"