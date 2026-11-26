-- Tahap 11: Penjualan Offline & Laporan Keuangan
-- FR-OFF-001, FR-REP-001, BR-012, BR-021, BR-022, BR-024, GR-03, GR-06

-- Transaksi offline: status akhir, catatan, dan kunci idempotensi.
ALTER TABLE "OfflineSale"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SELESAI',
  ADD COLUMN IF NOT EXISTS "catatan" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "OfflineSale_idempotencyKey_key" ON "OfflineSale"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "OfflineSale_soldAt_idx" ON "OfflineSale"("soldAt");

-- Snapshot item offline dipakai untuk laba historis (modal tidak berubah saat modal master diubah).
ALTER TABLE "OfflineSaleItem"
  ADD COLUMN IF NOT EXISTS "snapshotTitle" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "snapshotCode" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "subtotal" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "OfflineSaleItem_offlineSaleId_idx" ON "OfflineSaleItem"("offlineSaleId");

-- Alur usul/persetujuan koreksi harga offline (berlaku setelah persetujuan Admin Utama).
CREATE TABLE IF NOT EXISTS "OfflinePriceCorrection" (
  "id" TEXT NOT NULL,
  "offlineSaleId" TEXT NOT NULL,
  "offlineSaleItemId" TEXT NOT NULL,
  "pengajuId" TEXT NOT NULL,
  "peranPengaju" TEXT NOT NULL,
  "hargaLama" INTEGER NOT NULL,
  "hargaBaru" INTEGER NOT NULL,
  "alasan" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
  "disetujuiOlehId" TEXT,
  "disetujuiPada" TIMESTAMP(3),
  "alasanKeputusan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfflinePriceCorrection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OfflinePriceCorrection_offlineSaleId_status_idx"
  ON "OfflinePriceCorrection"("offlineSaleId", "status");
CREATE INDEX IF NOT EXISTS "OfflinePriceCorrection_status_idx"
  ON "OfflinePriceCorrection"("status");
