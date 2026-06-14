#!/bin/sh
set -e

export DOTENV_CONFIG_QUIET=true

node /app/scripts/validate-deploy-env.cjs

/app/docker-migrate.sh

echo "Seeding superadmin (if missing)..." >&2
node /app/prisma/seed.js || echo "WARN: Superadmin seed skipped." >&2

echo "Starting API server..." >&2
exec node server.js
