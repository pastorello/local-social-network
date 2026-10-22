#!/bin/bash
# Nightly backup of the two things that are not in git: the database and the
# uploads (docs/deploy.md). Run by cron on the VPS, keeping 14 days:
#
#   0 3 * * * $HOME/local-social-network/deploy/backup.sh >> $HOME/backups/backup.log 2>&1
#
# pipefail is the point. Without it a pg_dump that cannot connect still lets
# gzip write a 20-byte file and exit 0: a backup that reports success every
# night and contains nothing (deploy.md, found 2026-09-10).
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="${BACKUP_DIR:-$HOME/backups}"
D=$(date +%F)
mkdir -p "$OUT"
# Each file is written as .part and renamed only once it is complete, so a
# failed run leaves nothing that looks like a backup.
trap 'rm -f "$OUT"/*.part' EXIT

# The single quotes keep $POSTGRES_USER/$POSTGRES_DB for the container's shell,
# which is the only place they exist.
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$OUT/db-$D.sql.gz.part"
mv "$OUT/db-$D.sql.gz.part" "$OUT/db-$D.sql.gz"
docker run --rm -v vivere-gaeta_media:/media -v "$OUT":/out alpine \
  tar czf "/out/media-$D.tar.gz.part" -C /media .
mv "$OUT/media-$D.tar.gz.part" "$OUT/media-$D.tar.gz"

find "$OUT" -name '*.gz' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "$(date "+%F %T") backup ok: db $(du -h "$OUT/db-$D.sql.gz" | cut -f1), media $(du -h "$OUT/media-$D.tar.gz" | cut -f1)"
