#!/bin/sh
# Tahap 13 — backup manual via CLI: PostgreSQL + seluruh media → tar.gz → age.
# Kunci privat TIDAK dipakai di sini; hanya kunci publik dari environment.
# Output: path arsip terenkripsi di baris terakhir stdout.
set -eu

: "${DATABASE_URL:?DATABASE_URL wajib diatur}"
: "${AKIRA_BACKUP_AGE_PUBLIC_KEY:?AKIRA_BACKUP_AGE_PUBLIC_KEY wajib diatur}"

UNTUK_DIR="${AKIRA_BACKUP_DIR:-$(pwd)/backup-arsip}"
MEDIA_DIR="${AKIRA_BACKUP_MEDIA_DIR:-$(pwd)/storage}"
mkdir -p "$UNTUK_DIR" "$MEDIA_DIR"

CAP_WAKTU="$(date -u +%Y%m%dT%H%M%SZ)"
NAMA_FILE="akira-backup-${CAP_WAKTU}-cli.tar.gz.age"
SEMENTARA="$(mktemp -d "$UNTUK_DIR/.sementara.XXXXXX")"
KONTEN="$SEMENTARA/konten"
mkdir -p "$KONTEN"

bersihkan() { rm -rf "$SEMENTARA"; }
trap bersihkan EXIT INT TERM

# Buang query string Prisma (?schema=public) karena bukan opsi libpq.
URL_PG="${DATABASE_URL%%\?*}"

pg_dump --dbname="$URL_PG" --format=custom --file="$KONTEN/database.dump"
tar -czf "$KONTEN/media.tar.gz" -C "$MEDIA_DIR" .
cat > "$KONTEN/manifest.json" <<EOF
{
  "versi": 1,
  "aplikasi": "Akira Books",
  "dibuatPada": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "database.dump",
  "media": "media.tar.gz"
}
EOF
tar -czf "$SEMENTARA/gabungan.tar.gz" -C "$KONTEN" .
age -r "$AKIRA_BACKUP_AGE_PUBLIC_KEY" -o "$UNTUK_DIR/$NAMA_FILE" "$SEMENTARA/gabungan.tar.gz"

echo "Arsip: $UNTUK_DIR/$NAMA_FILE"
echo "SHA-256: $(sha256sum "$UNTUK_DIR/$NAMA_FILE" | cut -d' ' -f1)"
echo "$UNTUK_DIR/$NAMA_FILE"
