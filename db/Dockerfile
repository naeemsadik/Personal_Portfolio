# Custom MySQL image for nas-portfolio-backend.
#
# We start FROM the official mysql:8.0 image and ADD two things:
#   1. db/init.sql              — auto-run by the official entrypoint on
#                                  first boot (when /var/lib/mysql is empty)
#   2. db/docker-entrypoint.sh  — our wrapper that interpolates
#                                  ${MYSQL_PASSWORD} into init.sql via
#                                  envsubst BEFORE the official entrypoint
#                                  reads it.
#
# Why a custom image instead of bind mounts in docker-compose:
#
#   An earlier deploy used bind mounts to put the wrapper under
#   /usr/local/bin/custom-entrypoint.sh and init.sql under
#   /docker-entrypoint-initdb.d/init.sql. The runc exec for the
#   entrypoint path failed with "is a directory: permission denied"
#   because Coolify's git clone apparently didn't materialize the
#   wrapper file at the deploy path — leaving Docker to create an
#   empty directory at the bind-mount target, which then couldn't
#   be exec'd.
#
#   Baking both files into a custom image sidesteps the bind-mount
#   path entirely. The wrapper is now part of the image layers and
#   exec reliably.

FROM mysql:8.0

# Install envsubst (provided by gettext-base). The mysql:8.0 image
# doesn't include it on Debian-based builds. The official entrypoint
# uses envsubst for its OWN config templates, but we want to control
# the timing of substitution on init.sql, so we run it ourselves in
# the wrapper.
#
# Single-line RUN so any ARG-injection tool that prepends ARG
# declarations per RUN line doesn't break apt-get mid-command.
RUN apt-get update && apt-get install -y --no-install-recommends gettext-base && rm -rf /var/lib/apt/lists/*

# Copy our wrapper script. It will become the container entrypoint.
# We rename it `custom-entrypoint.sh` so it's clearly distinct from
# the official `docker-entrypoint.sh` already at /usr/local/bin/.
COPY docker-entrypoint.sh /usr/local/bin/custom-entrypoint.sh
RUN chmod 0755 /usr/local/bin/custom-entrypoint.sh

# Copy init.sql into the directory the official entrypoint scans
# on first boot. Our wrapper will rewrite this file in place with
# envsubst'd contents — having it baked into the image means we
# don't need a writable bind mount.
COPY init.sql /docker-entrypoint-initdb.d/init.sql

# Use the wrapper as the entrypoint. The official mysql entrypoint
# is then exec'd by the wrapper, with `mysqld` (from compose's
# command:) as its first argument. The official entrypoint will
# detect that we're root and switch to the dedicated `mysql` user
# via gosu before running any mysqld.
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
CMD ["mysqld"]