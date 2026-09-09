#!/usr/bin/env bash
# Restore a backup. SPEC.md §11 requires this command to be in the runbook *and*
# to have been tested — an untested restore is a backup you do not have.
#
#   scripts/restore.sh /backups/daily/db-20260908-031500.dump [media.tar.gz]
#
# Refuses to run against a database that already has content unless FORCE=1, so
# a mistyped command cannot overwrite production while trying to seed a spare.
set -euo pipefail

DUMP="${1:-}"
MEDIA_ARCHIVE="${2:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-cida}"
DB_NAME="${DB_NAME:-cida}"
MEDIA_DIR="${MEDIA_DIR:-/data/media}"

if [[ -z "$DUMP" ]]; then
  echo "usage: $0 <db-dump> [media-tar-gz]" >&2
  exit 2
fi
if [[ ! -f "$DUMP" ]]; then
  echo "no such dump: $DUMP" >&2
  exit 2
fi

echo "[restore] target ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

existing=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
  "select count(*) from information_schema.tables where table_schema = 'public'" 2>/dev/null || echo 0)

if [[ "$existing" != "0" && "${FORCE:-0}" != "1" ]]; then
  echo "[restore] refusing: $DB_NAME already has $existing tables. Re-run with FORCE=1 to overwrite." >&2
  exit 1
fi

# --clean --if-exists drops what it is about to recreate, so a FORCE restore
# over a populated database is a replacement rather than a merge.
echo "[restore] restoring schema and data"
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --no-acl "$DUMP"

if [[ -n "$MEDIA_ARCHIVE" ]]; then
  if [[ ! -f "$MEDIA_ARCHIVE" ]]; then
    echo "[restore] no such media archive: $MEDIA_ARCHIVE" >&2
    exit 2
  fi
  echo "[restore] unpacking media into $MEDIA_DIR"
  mkdir -p "$MEDIA_DIR"
  tar -xzf "$MEDIA_ARCHIVE" -C "$MEDIA_DIR"
fi

echo "[restore] row counts:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  select 'products' as table, count(*) from products
  union all select 'categories', count(*) from categories
  union all select 'posts', count(*) from posts
  union all select 'media', count(*) from media
  union all select 'users', count(*) from users
  union all select 'settings', count(*) from settings
  order by 1;"

echo "[restore] done"
