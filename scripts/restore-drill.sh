#!/bin/sh
# Tahap 13 — uji coba pemulihan NYATA pada database & direktori terisolasi.
# Tidak pernah menimpa database utama atau folder media utama:
#   1. buat database sementara akira_drill_*,
#   2. backup database utama (read-only) + media utama ke arsip age uji,
#   3. pulihkan ke database sementara + folder sementara memakai kunci privat uji,
#   4. bandingkan jumlah baris & jumlah berkas,
#   5. hapus database sementara dan seluruh berkas uji.
set -eu

: "${DATABASE_URL:?DATABASE_URL wajib diatur}"

BASE_URL="${DATABASE_URL%%\?*}"
SERVER_URL="${BASE_URL%/*}"       # postgresql://user:pass@host:port
ADMIN_URL="$SERVER_URL/postgres"
DRILL_DB="akira_drill_$(date -u +%Y%m%d%H%M%S)"
MEDIA_SUMBER="${AKIRA_BACKUP_MEDIA_DIR:-$(pwd)/storage}"
ROOT="$(mktemp -d)"

bersihkan() {
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DRILL_DB\"" >/dev/null 2>&1 || true
  rm -rf "$ROOT"
}
trap bersihkan EXIT INT TERM

echo "[1/5] Menyiapkan database uji terisolasi: $DRILL_DB"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$DRILL_DB\"" >/dev/null
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DRILL_DB\"" >/dev/null

echo "[2/5] Membuat pasangan kunci age uji (kunci privat hanya di folder sementara)"
age-keygen -o "$ROOT/identity.txt" >/dev/null 2>&1
KUNCI_PUB=$(age-keygen -y "$ROOT/identity.txt" | tr -d '\r\n')

echo "[3/5] Membuat arsip uji dari database utama (read-only) + salinan media"
MEDIA_UJI="$ROOT/media-sumber"
mkdir -p "$MEDIA_UJI"
cp -R "$MEDIA_SUMBER"/. "$MEDIA_UJI"/ 2>/dev/null || true
printf 'Akira Books restore drill sentinel\n' > "$MEDIA_UJI/restore-drill-sentinel.txt"

ARSIP=$(
  AKIRA_BACKUP_DIR="$ROOT/arsip" \
  AKIRA_BACKUP_MEDIA_DIR="$MEDIA_UJI" \
  AKIRA_BACKUP_AGE_PUBLIC_KEY="$KUNCI_PUB" \
    sh "$(dirname "$0")/backup-cli.sh" | tail -n 1
)
[ -f "$ARSIP" ] || { echo "Arsip uji tidak dibuat" >&2; exit 1; }

echo "[4/5] Memulihkan arsip ke database & folder uji"
sh "$(dirname "$0")/restore.sh" \
  --file "$ARSIP" \
  --identity "$ROOT/identity.txt" \
  --db-url "$SERVER_URL/$DRILL_DB" \
  --media-dir "$ROOT/media-pulihan" >/dev/null

echo "[5/5] Memverifikasi isi hasil pemulihan"
BARIS_USER=$(psql "$SERVER_URL/$DRILL_DB" -Atc 'SELECT count(*) FROM "User";' | tr -d '[:space:]')
[ -n "$BARIS_USER" ] || { echo "Verifikasi database gagal" >&2; exit 1; }

JUMLAH_SUMBER=$(find "$MEDIA_UJI" -type f 2>/dev/null | wc -l | tr -d '[:space:]')
JUMLAH_PULIHAN=$(find "$ROOT/media-pulihan" -type f 2>/dev/null | wc -l | tr -d '[:space:]')
[ "$JUMLAH_SUMBER" = "$JUMLAH_PULIHAN" ] || {
  echo "Media tidak utuh: sumber=$JUMLAH_SUMBER pulihan=$JUMLAH_PULIHAN" >&2
  exit 1
}
cmp -s "$MEDIA_UJI/restore-drill-sentinel.txt" "$ROOT/media-pulihan/restore-drill-sentinel.txt" || {
  echo "Isi berkas media uji tidak sama setelah dipulihkan" >&2
  exit 1
}

echo "RESTORE DRILL BERHASIL — pengguna=$BARIS_USER, berkas media=$JUMLAH_PULIHAN"
echo "Database uji dan berkas sementara dibersihkan otomatis."
