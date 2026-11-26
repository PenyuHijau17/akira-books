-- Tahap 9: Jadwal dan Pengambilan (FR-PICK, BR-018, BR-019, BR-025, FR-DONE)

-- Status jadwal baru untuk ketidakhadiran customer (BR-019).
ALTER TYPE "PickupStatus" ADD VALUE IF NOT EXISTS 'TIDAK_HADIR';

-- Field pendukung no-show, penyerahan fisik, dan idempotensi stok.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "noShowAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "noShowHoldDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "noShowReason" TEXT,
  ADD COLUMN IF NOT EXISTS "noShowCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedById" TEXT,
  ADD COLUMN IF NOT EXISTS "stockSold" BOOLEAN NOT NULL DEFAULT false;

-- Riwayat pengajuan/usulan perubahan jadwal. Tanggal aktif tidak berubah sebelum disetujui.
CREATE TABLE IF NOT EXISTS "JadwalPerubahan" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "jenis" TEXT NOT NULL,
  "pengajuId" TEXT NOT NULL,
  "peranPengaju" TEXT NOT NULL,
  "tanggalLama" TIMESTAMP(3) NOT NULL,
  "tanggalBaru" TIMESTAMP(3) NOT NULL,
  "alasan" TEXT,
  "status" TEXT NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
  "diputuskanOleh" TEXT,
  "diputuskanPeran" TEXT,
  "alasanKeputusan" TEXT,
  "diputuskanPada" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JadwalPerubahan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JadwalPerubahan_orderId_status_idx" ON "JadwalPerubahan"("orderId", "status");
