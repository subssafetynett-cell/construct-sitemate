#!/bin/sh
set -e

# Always run from the backend directory (works in Docker /app and local npm scripts).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load DATABASE_URL from repo-root .env for local runs (npm run db:init, etc.).
# We only read DATABASE_URL — do not `source` the whole file (values like SMTP_FROM break sh).
if [ -z "$DATABASE_URL" ]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
  ENV_FILE="$REPO_ROOT/.env"
  if [ -f "$ENV_FILE" ]; then
    DATABASE_URL="$(grep -E '^[[:space:]]*DATABASE_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
    export DATABASE_URL
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Set it in Coolify / .env (PostgreSQL connection string)."
  exit 1
fi

echo "Running Prisma migrations..."

# Neon / Coolify often reuse a DB that already has tables but no _prisma_migrations rows.
# Baselining first avoids Prisma P3005 ("database schema is not empty").
STATE="$(node "$SCRIPT_DIR/prisma-baseline.js")"
case "$STATE" in
  client=0*|client=1*) ;;
  *)
    echo "Warning: prisma-baseline returned unexpected output; using safe default."
    STATE="client=0 lastLogin=0"
    ;;
esac
echo "Database state: $STATE"

baseline_migration() {
  migration_name="$1"
  echo "Marking migration as applied: $migration_name"
  npx prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
}

if echo "$STATE" | grep -q 'client=1'; then
  echo "Existing schema detected (Client table). Baselining init migration..."
  baseline_migration "20250513180000_init"
fi

if echo "$STATE" | grep -q 'lastLogin=1'; then
  echo "Existing lastLoginAt column detected. Baselining user_last_activity migration..."
  baseline_migration "20260513120000_user_last_activity"
fi

set +e
MIGRATION_OUTPUT="$(npx prisma migrate deploy 2>&1)"
MIGRATION_EXIT_CODE=$?
set -e

echo "$MIGRATION_OUTPUT"

if [ "$MIGRATION_EXIT_CODE" -ne 0 ]; then
  if echo "$MIGRATION_OUTPUT" | grep -q 'P1010'; then
    echo ""
    echo "Hint: P1010 often means DATABASE_URL points at the wrong Postgres."
    echo "  - Docker stack (this repo): use localhost:5434 in .env (see docker-compose.local.yaml)."
    echo "  - Or run migrations inside the container: npm run db:init:docker"
    echo "  - Mac with Postgres.app/Homebrew on 5432: keep that on 5432; use 5434 for Docker only."
  fi
  if echo "$MIGRATION_OUTPUT" | grep -q 'P3005'; then
    echo "Prisma P3005: non-empty database without migration history. Baselining and retrying..."
    baseline_migration "20250513180000_init"
    if echo "$STATE" | grep -q 'lastLogin=1'; then
      baseline_migration "20260513120000_user_last_activity"
    fi
    npx prisma migrate deploy
  else
    exit "$MIGRATION_EXIT_CODE"
  fi
fi
