-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('TERSEDIA', 'SEDANG_DIPESAN', 'TERJUAL', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('MENUNGGU_PEMBAYARAN', 'SUDAH_DIBAYAR', 'MENUNGGU_DIAMBIL', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "PaymentProofStatus" AS ENUM ('BELUM_DIUNGGAH', 'MENUNGGU_VERIFIKASI', 'PERLU_BUKTI_BARU', 'TERVERIFIKASI');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('MENUNGGU_KONFIRMASI', 'DISETUJUI', 'PERLU_TANGGAL_BARU', 'PERUBAHAN_MENUNGGU_PERSETUJUAN');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('TIDAK_BERLAKU', 'PERLU_DIPROSES', 'DIKEMBALIKAN_SEBAGIAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'TUNAI_CFD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "whatsapp" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivationReason" TEXT,
    "deletionRequestedAt" TIMESTAMP(3),
    "sessionUserId" TEXT,
    "cartUserId" TEXT,
    "orderCustomerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userSessionId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpAndRecoveryToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userUserId" TEXT NOT NULL,

    CONSTRAINT "OtpAndRecoveryToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "publishYear" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "sellingPrice" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL,
    "stockTotal" INTEGER NOT NULL,
    "stockReserved" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "mergedIntoBookId" TEXT,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCategory" (
    "bookId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BookCostHistory" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "oldCostPrice" INTEGER NOT NULL,
    "newCostPrice" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookCostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userUserId" TEXT NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cartCartId" TEXT NOT NULL,
    "bookBookId" TEXT NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL,
    "paymentProofStatus" "PaymentProofStatus" NOT NULL,
    "pickupStatus" "PickupStatus" NOT NULL,
    "refundStatus" "RefundStatus" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "pickupSundayDate" TIMESTAMP(3) NOT NULL,
    "pickupGroupId" TEXT,
    "paymentDeadline" TIMESTAMP(3) NOT NULL,
    "pausedRemainingSeconds" INTEGER,
    "lockedByAdminId" TEXT,
    "lockExpiresAt" TIMESTAMP(3),
    "allocatedAmount" INTEGER,
    "customerUserId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "snapshotTitle" TEXT NOT NULL,
    "snapshotSellingPrice" INTEGER NOT NULL,
    "snapshotCostPrice" INTEGER NOT NULL,
    "orderOrderId" TEXT NOT NULL,
    "bookBookId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "oldStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderOrderId" TEXT NOT NULL,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrisConfig" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "userUserId" TEXT NOT NULL,

    CONSTRAINT "QrisConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvidence" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "initialCheckedById" TEXT,
    "finalApprovedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userUserId" TEXT NOT NULL,

    CONSTRAINT "PaymentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPaymentAllocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentEvidenceId" TEXT NOT NULL,
    "allocatedAmount" INTEGER NOT NULL,
    "orderOrderId" TEXT NOT NULL,
    "paymentEvidenceUserId" TEXT NOT NULL,

    CONSTRAINT "OrderPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "refundAmount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "processedById" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderOrderId" TEXT,
    "processorUserId" TEXT NOT NULL,

    CONSTRAINT "RefundRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineSale" (
    "id" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userUserId" TEXT NOT NULL,

    CONSTRAINT "OfflineSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineSaleItem" (
    "id" TEXT NOT NULL,
    "offlineSaleId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "actualSellingPrice" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL,
    "offlineSaleOfflineSaleId" TEXT NOT NULL,
    "bookBookId" TEXT NOT NULL,

    CONSTRAINT "OfflineSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreStatus" (
    "id" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "activeClosureReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreClosureHistory" (
    "id" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "reopenedAt" TIMESTAMP(3),
    "actorNameSnapshot" TEXT NOT NULL,
    "actorRoleSnapshot" TEXT NOT NULL,
    "lastReason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,

    CONSTRAINT "StoreClosureHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userUserId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReminder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "orderOrderId" TEXT,

    CONSTRAINT "ScheduledReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRoleSnapshot" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "oldValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Book_code_key" ON "Book"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BookCategory_bookId_categoryId_key" ON "BookCategory"("bookId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
