-- Tahap 9: menyimpan status jadwal sebelum usulan dibuat, agar pembatalan usulan
-- dapat mengembalikan status ke kondisi sebelumnya yang benar-benar tercatat.
ALTER TABLE "JadwalPerubahan"
  ADD COLUMN IF NOT EXISTS "statusSebelumnya" TEXT;
