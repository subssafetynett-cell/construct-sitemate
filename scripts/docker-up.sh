#!/usr/bin/env bash
# Start Docker Desktop if needed (macOS), wait until the engine is ready, then bring up the stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MAX_WAIT="${DOCKER_UP_MAX_WAIT:-180}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker: command not found. Install Docker Desktop: https://docs.docker.com/desktop/"
  exit 1
fi

opened_desktop=0
elapsed=0
while ! docker info >/dev/null 2>&1; do
  if [[ "$(uname -s)" == "Darwin" ]] && (( opened_desktop == 0 )); then
    echo "Docker engine is not responding. Trying to open Docker Desktop..."
    if open -a Docker 2>/dev/null; then
      opened_desktop=1
      echo "Waiting for Docker Desktop to finish starting (up to ${MAX_WAIT}s)..."
    else
      echo "Could not launch Docker Desktop. Open it from Applications, then run this script again."
      exit 1
    fi
  elif [[ "$(uname -s)" != "Darwin" ]] && (( elapsed == 0 )); then
    echo "Docker is not running. Start the Docker service, then run:"
    echo "  docker compose up -d --build"
    exit 1
  fi
  if (( elapsed >= MAX_WAIT )); then
    echo "Timed out after ${MAX_WAIT}s waiting for Docker."
    echo "Ensure Docker Desktop is running, then:"
    echo "  cd \"${ROOT}\" && docker compose -f docker-compose.yaml up -d --build"
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
  printf "."
done
echo ""

if [[ ! -f .env ]]; then
  echo "Warning: no .env in ${ROOT}. The backend service may fail without required variables."
  echo "Copy or create .env (see your team docs) before relying on the API."
  echo ""
fi

echo "Starting containers (with localhost port publish: 8080→SPA, 4000→API, 5434→Postgres)..."
docker compose -f docker-compose.yaml -f docker-compose.local.yaml up -d --build "$@"
echo ""
docker compose -f docker-compose.yaml -f docker-compose.local.yaml ps
