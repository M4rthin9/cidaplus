#!/usr/bin/env bash
# Deploy one image tag. SPEC.md §11:
#   pull image → drizzle-kit migrate → up -d --no-deps web → health check
#   → roll back to the previous image tag on failure.
#
#   ./deploy.sh ghcr.io/m4rthin9/cidaplus:sha-abc1234
#   ./deploy.sh                 # re-deploy whatever WEB_IMAGE currently names
#
# Run from the app directory on the box, as the deploy user.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cidaplus}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
HEALTH_TRIES="${HEALTH_TRIES:-30}"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "no env file at $ENV_FILE" >&2
  exit 1
fi

compose() { docker compose --env-file "$ENV_FILE" "$@"; }

set -a
# shellcheck disable=SC1090 # the path is configurable by design
source "$ENV_FILE"
set +a

PREVIOUS_IMAGE="${WEB_IMAGE:-}"
NEW_IMAGE="${1:-$PREVIOUS_IMAGE}"

if [[ -z "$NEW_IMAGE" ]]; then
  echo "usage: $0 <image>   (or set WEB_IMAGE in $ENV_FILE)" >&2
  exit 2
fi

echo "[deploy] current: ${PREVIOUS_IMAGE:-none}"
echo "[deploy] target:  $NEW_IMAGE"

# --- pull first -------------------------------------------------------------
# Before touching anything: a pull that fails on a typo'd tag should cost
# nothing, and pulling while the old container still serves keeps the gap short.
echo "[deploy] pulling"
docker pull "$NEW_IMAGE"

write_image() {
  if grep -q '^WEB_IMAGE=' "$ENV_FILE"; then
    sed -i "s|^WEB_IMAGE=.*|WEB_IMAGE=$1|" "$ENV_FILE"
  else
    echo "WEB_IMAGE=$1" >> "$ENV_FILE"
  fi
}

rollback() {
  if [[ -z "$PREVIOUS_IMAGE" || "$PREVIOUS_IMAGE" == "$NEW_IMAGE" ]]; then
    echo "[deploy] no previous image to roll back to — leaving the stack as it is" >&2
    echo "[deploy] logs: docker compose --env-file $ENV_FILE logs --tail 100 web" >&2
    exit 1
  fi
  echo "[deploy] rolling back to $PREVIOUS_IMAGE" >&2
  write_image "$PREVIOUS_IMAGE"
  compose up -d --no-deps web
  exit 1
}

# --- migrate ----------------------------------------------------------------
# Before the new container starts, so the schema is never behind the code that
# assumes it. Migrations run in the *new* image, which is the one that carries
# the migration files.
#
# This is the step with no automatic undo: drizzle-kit has no `down`. A
# destructive migration must be reviewed before it is deployed, and the nightly
# dump plus scripts/restore.sh is the recovery path. See RUNBOOK.
echo "[deploy] migrating"
if ! docker run --rm \
  --network "$(docker network ls --filter name=cidaplus_default --format '{{.Name}}' | head -1)" \
  --env-file "$ENV_FILE" \
  -e DATABASE_URL="postgres://cida:${POSTGRES_PASSWORD}@db:5432/cida" \
  --entrypoint node "$NEW_IMAGE" \
  node_modules/drizzle-kit/bin.cjs migrate 2>&1; then
  echo "[deploy] migration failed — not starting the new image" >&2
  exit 1
fi

# --- swap the web container -------------------------------------------------
echo "[deploy] starting $NEW_IMAGE"
write_image "$NEW_IMAGE"
compose up -d --no-deps web

# --- health -----------------------------------------------------------------
echo "[deploy] waiting for health"
for i in $(seq 1 "$HEALTH_TRIES"); do
  if compose exec -T web curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "[deploy] healthy after ${i}s"
    echo "[deploy] done: $NEW_IMAGE"
    exit 0
  fi
  sleep 1
done

echo "[deploy] never became healthy" >&2
compose logs --tail 50 web >&2 || true
rollback
