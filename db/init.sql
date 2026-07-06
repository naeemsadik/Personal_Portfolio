-- MySQL initialization for the nas-portfolio backend.
--
-- This file is mounted at /docker-entrypoint-initdb.d/ in the
-- MySQL container and runs ONCE — only on the very first boot
-- when /var/lib/mysql is empty. Subsequent boots skip it.
--
-- The official mysql:8.0 image normally creates the database and
-- user from MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD env vars,
-- but it only does so the first time the datadir is empty — and
-- once the volume is created with one set of credentials, changing
-- the env vars later leaves you with a 'Access denied' mismatch.
--
-- This script is the authoritative initializer: it always ensures
-- the `portfolio` database and the `portfolio`@'%' user exist with
-- the exact password from MYSQL_PASSWORD. It's also idempotent
-- (`IF NOT EXISTS` / `IF EXISTS`) so it's safe to re-run.
--
-- Variable interpolation:
-- `${MYSQL_PASSWORD}` is NOT a SQL syntax — it's a shell-style
-- placeholder that gets substituted by `envsubst` in
-- db/docker-entrypoint.sh BEFORE MySQL reads this file. SQL files
-- mounted into /docker-entrypoint-initdb.d/ are passed straight to
-- the mysql client (no env-var expansion), so the wrapper script
-- is required.

-- Ensure the database exists with the right charset.
CREATE DATABASE IF NOT EXISTS `portfolio`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Recreate the `portfolio` user with the password from MYSQL_PASSWORD.
-- The '%' host wildcard lets the backend connect from any host
-- (it's on the compose-internal network, not localhost, so the
-- default 'localhost'-only user would not be reachable).
--
-- CREATE USER IF NOT EXISTS first so a fresh volume creates the
-- user cleanly.
CREATE USER IF NOT EXISTS 'portfolio'@'%'
  IDENTIFIED BY '${MYSQL_PASSWORD}';

-- ALTER USER always runs — even if CREATE USER was a no-op. This
-- is the line that fixes the 'Access denied' issue when the
-- volume was initialized with one password and the env var now
-- holds a different one. Without this, changing MYSQL_PASSWORD
-- in Coolify without wiping the volume would break logins.
ALTER USER 'portfolio'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- Drop the 'localhost' user if it exists. The env-var path on the
-- official image sometimes creates both a 'localhost' and a '%'
-- user, and the 'localhost' one can shadow the '%' one in some
-- MySQL configurations. We only want the '%' user for the
-- docker-network case.
DROP USER IF EXISTS 'portfolio'@'localhost';

-- Grant full control over the `portfolio` database. The backend
-- uses SQLAlchemy's Base.metadata.create_all() to bootstrap tables
-- (in app/prestart.py), and may also run DDL during seeding, so
-- we need ALL PRIVILEGES rather than a minimal CRUD set.
GRANT ALL PRIVILEGES ON `portfolio`.* TO 'portfolio'@'%';

-- Apply the grants immediately so the backend can connect on its
-- first attempt.
FLUSH PRIVILEGES;
