-- Tahap 10: Pembatalan, Refund terpisah, dan Koreksi Selesai
-- FR-CAN-001, FR-RFD-001, FR-DONE-001, BR-006, BR-007, BR-008, BR-020, BR-024

-- Provenance pembatalan & idempotensi pelepasan stok.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledById" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledByRole" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelReasonTambahan" TEXT,
  ADD COLUMN IF NOT EXISTS "stockReleasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stockReleasedById" TEXT,
  ADD COLUMN IF NOT EXISTS "refundNominal" INTEGER,
  ADD COLUMN IF NOT EXISTS "koreksiSelesaiAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "koreksiSelesaiById" TEXT;

-- Status proses refund terpisah dari status pesanan; catatan persetujuan Admin Utama.
ALTER TABLE "RefundRecord"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SELESAI',
  ADD COLUMN IF NOT EXISTS "metode" TEXT,
  ADD COLUMN IF NOT EXISTS "bukti" TEXT,
  ADD COLUMN IF NOT EXISTS "catatan" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "RefundRecord_orderId_status_idx" ON "RefundRecord"("orderId", "status");
