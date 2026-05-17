#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Set it in Coolify / .env (PostgreSQL connection string)."
  exit 1
fi

/app/docker-migrate.sh

echo "Seeding default client and superadmin (idempotent)..."
node /app/prisma/seed.js

echo "Starting API server..."
exec node server.js
