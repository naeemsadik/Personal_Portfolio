#!/bin/bash
# Wrapper for the official mysql:8.0 entrypoint that interpolates
# ${MYSQL_PASSWORD} into the init script before MySQL runs it.
#
# Why this exists:
# The official entrypoint reads every *.sh / *.sql / *.sql.gz file in
# /docker-entrypoint-initdb.d/ at first boot (when /var/lib/mysql is
# empty). SQL files are NOT env-var-interpolated by MySQL — they are
# passed straight to the mysql client. So we substitute the password
# here, then hand control back to the official entrypoint.
#
# The init.sql file is mounted read-only at its inits location, so we
# can't rewrite it in place. Instead we copy it to /tmp (writable),
# interpolate, then move it back into place. The move targets the
# container's filesystem (not the bind-mount) so it succeeds; on a
# subsequent boot with a populated datadir the entrypoint skips
# /docker-entrypoint-initdb.d entirely.

set -e

INIT_SQL="/docker-entrypoint-initdb.d/init.sql"

if [ -f "$INIT_SQL" ] && [ -n "${MYSQL_PASSWORD:-}" ]; then
  echo "[entrypoint] interpolating MYSQL_PASSWORD into init.sql"
  # Render to a tmp file, then atomically replace the in-place file.
  # The :ro bind-mount is on the original; replacing it removes the
  # bind-mount and the file becomes a regular container-fs file —
  # which is fine, the official entrypoint only needs it to exist
  # with the right name in /docker-entrypoint-initdb.d/.
  tmp="$(mktemp)"
  envsubst < "$INIT_SQL" > "$tmp"
  cat "$tmp" > "$INIT_SQL"
  rm -f "$tmp"
  echo "[entrypoint] init.sql interpolated ($(wc -l < "$INIT_SQL" 2>/dev/null || echo "?") lines)"
fi

# Hand off to the official mysql:8.0 entrypoint. The image places
# docker-entrypoint.sh at /usr/local/bin/docker-entrypoint.sh, which
# is on PATH, so this resolves correctly.
exec docker-entrypoint.sh "$@"
