-- Tahap 13 — Backup terenkripsi age & retensi 30 hari (NFR-04).
-- Riwayat backup sengaja disimpan sebagai catatan; penghapusan arsip hanya menandai status.

CREATE TABLE "BackupArsip" (
    "id" TEXT NOT NULL,
    "namaFile" TEXT NOT NULL,
    "ukuranByte" INTEGER NOT NULL DEFAULT 0,
    "jenis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BERHASIL',
    "checksumSha256" TEXT,
    "dibuatOlehId" TEXT,
    "keterangan" TEXT,
    "dihapusPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupArsip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackupArsip_namaFile_key" ON "BackupArsip"("namaFile");
CREATE INDEX "BackupArsip_createdAt_status_idx" ON "BackupArsip"("createdAt", "status");
CREATE INDEX "BackupArsip_jenis_status_idx" ON "BackupArsip"("jenis", "status");
