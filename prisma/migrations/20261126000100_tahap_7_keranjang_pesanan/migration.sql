-- Tahap 7: Keranjang & Pemesanan
-- Catatan: perubahan ini sudah diterapkan pada database pengembangan,
-- sehingga migrasi ditandai sebagai applied dengan `prisma migrate resolve`.
-- Untuk lingkungan baru, jalankan SQL ini sebagai migrasi normal.

-- Cart: versi, tinjauan ulang, dan timestamp (BR-012)
ALTER TABLE "Cart" ADD COLUMN     "approvedVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cart" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Cart" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cart" ADD COLUMN     "reviewReason" TEXT;
ALTER TABLE "Cart" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Cart" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CartItem: timestamp dan satu entri per buku per keranjang
ALTER TABLE "CartItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CartItem" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Order: total snapshot dan timestamp, plus indeks query umum
ALTER TABLE "Order" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN     "totalAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- OrderItem: snapshot kode buku dan subtotal (BR-011)
ALTER TABLE "OrderItem" ADD COLUMN     "snapshotCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItem" ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
CREATE UNIQUE INDEX "CartItem_cartId_bookId_key" ON "CartItem"("cartId", "bookId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");
