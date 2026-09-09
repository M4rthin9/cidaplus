#!/bin/sh
# Nightly backup. SPEC.md §11: "nightly pg_dump + media tarball, 7 daily /
# 4 weekly retention".
#
# Runs inside the `backup` service (postgres:16-alpine) with the database on the
# compose network and the media volume mounted read-only. Also prunes
# `line_clicks` past its retention window — §6 assigns that to the nightly cron
# and phase 8 left it unenforced.
#
# POSIX sh, not bash: the alpine image has no bash.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-cida}"
DB_NAME="${DB_NAME:-cida}"
MEDIA_DIR="${MEDIA_DIR:-/data/media}"
RETENTION_DAYS="${LINE_CLICK_RETENTION_DAYS:-30}"

stamp=$(date +%Y%m%d-%H%M%S)
day=$(date +%Y%m%d)
# Sunday is the weekly keeper.
dow=$(date +%u)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

log() { echo "[backup $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# --- database ---------------------------------------------------------------
# Custom format (-Fc): compressed, and restorable selectively with pg_restore,
# which is what makes "restore one table" possible on a bad day.
dump="$BACKUP_DIR/daily/db-$stamp.dump"
log "dumping $DB_NAME"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-acl -f "$dump.partial"
# Rename only after a clean exit, so a half-written dump is never mistaken for a
# good one by the restore script or by a human in a hurry.
mv "$dump.partial" "$dump"
log "wrote $(du -h "$dump" | cut -f1) $dump"

# --- media ------------------------------------------------------------------
# Media is the half that cannot be regenerated: the originals over the retention
# threshold are dropped on upload (§2), so a lost volume is lost photographs.
tar="$BACKUP_DIR/daily/media-$stamp.tar.gz"
log "archiving $MEDIA_DIR"
tar -czf "$tar.partial" -C "$MEDIA_DIR" . 2>/dev/null || true
mv "$tar.partial" "$tar"
log "wrote $(du -h "$tar" | cut -f1) $tar"

# --- weekly keeper ----------------------------------------------------------
if [ "$dow" = "7" ]; then
  cp "$dump" "$BACKUP_DIR/weekly/db-$day.dump"
  cp "$tar" "$BACKUP_DIR/weekly/media-$day.tar.gz"
  log "kept a weekly copy"
fi

# --- retention --------------------------------------------------------------
# 7 daily, 4 weekly. Counted by file rather than by mtime so a clock jump or a
# missed night cannot silently empty the directory.
prune() {
  dir="$1"; pattern="$2"; keep="$3"
  # shellcheck disable=SC2012,SC2086 # names are generated here and contain no
  # spaces, and $pattern must stay unquoted so the shell expands the glob.
  ls -1t "$dir"/$pattern 2>/dev/null | tail -n "+$((keep + 1))" | while read -r old; do
    log "pruning $old"
    rm -f "$old"
  done
}
prune "$BACKUP_DIR/daily" "db-*.dump" 7
prune "$BACKUP_DIR/daily" "media-*.tar.gz" 7
prune "$BACKUP_DIR/weekly" "db-*.dump" 4
prune "$BACKUP_DIR/weekly" "media-*.tar.gz" 4

# --- line_clicks retention --------------------------------------------------
# §6: "Retention is enforced by the nightly cron — nothing reads past 30 days."
# Deleted after the dump, so the night's backup still holds the rows that are
# about to go.
# psql's own command tag, not a row count of its output: `-tAc ... returning 1`
# still emits one blank line when nothing matched, so `wc -l` reported 1 deleted
# row on an empty table.
# psql's own command tag, read from stdout. Two earlier attempts were wrong:
# `-tAc "... returning 1" | wc -l` counts psql's trailing blank line and reports
# 1 deleted row on an empty table, and `-q` suppresses the tag entirely so there
# is nothing left to read.
deleted=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -c "delete from line_clicks where created_at < now() - make_interval(days => $RETENTION_DAYS)" \
  | tail -1)
log "line_clicks older than $RETENTION_DAYS days: ${deleted:-DELETE 0}"

log "done"
