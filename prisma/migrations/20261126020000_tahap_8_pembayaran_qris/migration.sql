-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "autoCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "methodChangeDecidedAt" TIMESTAMP(3),
ADD COLUMN     "methodChangeDecidedById" TEXT,
ADD COLUMN     "methodChangeReason" TEXT,
ADD COLUMN     "methodChangeRequestedAt" TIMESTAMP(3),
ADD COLUMN     "methodChangeStatus" TEXT NOT NULL DEFAULT 'TIDAK_ADA',
ADD COLUMN     "methodChangeTo" "PaymentMethod",
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentRecordedById" TEXT,
ADD COLUMN     "paymentRecordedMethod" "PaymentMethod",
ADD COLUMN     "paymentRejectReason" TEXT,
ADD COLUMN     "paymentRejectedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentReviewStatus" TEXT NOT NULL DEFAULT 'BELUM_DIPERIKSA',
ADD COLUMN     "paymentReviewerId" TEXT,
ADD COLUMN     "proofDeadline" TIMESTAMP(3),
ADD COLUMN     "proofRequestReason" TEXT,
ADD COLUMN     "reminderStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockReleased" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderPaymentAllocation" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PaymentEvidence" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalDecisionAt" TIMESTAMP(3),
ADD COLUMN     "initialCheckedAt" TIMESTAMP(3),
ADD COLUMN     "isLatest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "proofDeadline" TIMESTAMP(3),
ADD COLUMN     "proofRequestReason" TEXT,
ADD COLUMN     "qrisConfigId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "storageName" TEXT NOT NULL,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QrisConfig" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "keterangan" TEXT,
ADD COLUMN     "replacedAt" TIMESTAMP(3),
ADD COLUMN     "replacedById" TEXT,
ADD COLUMN     "storageName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PaymentVerificationRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentVerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodChangeRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "fromMethod" "PaymentMethod" NOT NULL,
    "toMethod" "PaymentMethod" NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethodChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDeadlineExtension" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "oldDeadline" TIMESTAMP(3) NOT NULL,
    "proposedDeadline" TIMESTAMP(3) NOT NULL,
    "approvedDeadline" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentDeadlineExtension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentVerificationRecord_orderId_idx" ON "PaymentVerificationRecord"("orderId");

-- CreateIndex
CREATE INDEX "PaymentMethodChangeRequest_orderId_idx" ON "PaymentMethodChangeRequest"("orderId");

-- CreateIndex
CREATE INDEX "PaymentDeadlineExtension_orderId_idx" ON "PaymentDeadlineExtension"("orderId");

-- CreateIndex
CREATE INDEX "OrderPaymentAllocation_paymentEvidenceId_idx" ON "OrderPaymentAllocation"("paymentEvidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentAllocation_orderId_paymentEvidenceId_key" ON "OrderPaymentAllocation"("orderId", "paymentEvidenceId");

-- CreateIndex
CREATE INDEX "PaymentEvidence_isLatest_idx" ON "PaymentEvidence"("isLatest");

-- CreateIndex
CREATE INDEX "QrisConfig_isActive_idx" ON "QrisConfig"("isActive");

-- GR-06 / BR-024: audit & riwayat keputusan bersifat append-only.
-- Pembatasan di level database melengkapi ketiadaan endpoint UPDATE/DELETE di aplikasi.
CREATE OR REPLACE FUNCTION akira_tolak_perubahan_audit() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% bersifat append-only (GR-06)', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_audit_log_append_only
BEFORE UPDATE OR DELETE ON "AdminAuditLog"
FOR EACH ROW EXECUTE FUNCTION akira_tolak_perubahan_audit();

CREATE TRIGGER order_status_history_append_only
BEFORE UPDATE OR DELETE ON "OrderStatusHistory"
FOR EACH ROW EXECUTE FUNCTION akira_tolak_perubahan_audit();

CREATE TRIGGER payment_verification_record_append_only
BEFORE UPDATE OR DELETE ON "PaymentVerificationRecord"
FOR EACH ROW EXECUTE FUNCTION akira_tolak_perubahan_audit();


