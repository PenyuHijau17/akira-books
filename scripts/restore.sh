#!/bin/sh
# Tahap 13 — pemulihan arsip age ke database DAN direktori media target.
# Contoh:
#   sh scripts/restore.sh --file backup-arsip/arsip.age \
#     --identity /tempat/kunci-privat-age.txt \
#     --db-url postgresql://user:pass@host:5432/nama_db \
#     --media-dir /app/storage
set -eu

FILE_ARSIP=""
IDENTITAS=""
DB_URL=""
MEDIA_TARGET=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --file) FILE_ARSIP="$2"; shift 2 ;;
    --identity) IDENTITAS="$2"; shift 2 ;;
    --db-url) DB_URL="$2"; shift 2 ;;
    --media-dir) MEDIA_TARGET="$2"; shift 2 ;;
    *) echo "Argumen tidak dikenal: $1" >&2; exit 2 ;;
  esac
done

[ -n "$FILE_ARSIP" ] || { echo "--file wajib diisi" >&2; exit 2; }
[ -n "$IDENTITAS" ] || { echo "--identity (kunci privat age) wajib diisi" >&2; exit 2; }

SEMENTARA="$(mktemp -d)"
bersihkan() { rm -rf "$SEMENTARA"; }
trap bersihkan EXIT INT TERM

echo "Mendekripsi arsip dengan kunci privat pemilik toko…"
age -d -i "$IDENTITAS" -o "$SEMENTARA/gabungan.tar.gz" "$FILE_ARSIP"
tar -xzf "$SEMENTARA/gabungan.tar.gz" -C "$SEMENTARA"

if [ -n "$DB_URL" ]; then
  URL_PG="${DB_URL%%\?*}"
  echo "Memulihkan database ke target terisolasi…"
  pg_restore --dbname="$URL_PG" --no-owner --no-privileges --clean --if-exists \
    "$SEMENTARA/database.dump"
fi

if [ -n "$MEDIA_TARGET" ]; then
  mkdir -p "$MEDIA_TARGET"
  echo "Memulihkan berkas media ke $MEDIA_TARGET…"
  tar -xzf "$SEMENTARA/media.tar.gz" -C "$MEDIA_TARGET"
fi

echo "Pemulihan selesai."
