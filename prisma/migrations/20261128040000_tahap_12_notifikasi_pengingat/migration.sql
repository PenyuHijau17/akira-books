-- Tahap 12: Notifikasi, Outbox, dan Pengingat Persisten
-- FR-DUE-001, FR-PICK-001, NFR-01, BR-003, BR-008, BR-025, GR-03, GR-06

-- Notifikasi: kategori, entitas, metadata, waktu baca, dan identitas pengiriman per penerima.
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "kategori" TEXT NOT NULL DEFAULT 'UMUM',
  ADD COLUMN IF NOT EXISTS "entitasId" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- BR-008: hapus duplikat lama sebelum membuat kunci unik (data terbaru tetap satu baris).
DELETE FROM "Notification" a
USING "Notification" b
WHERE a."id" > b."id"
  AND a."userId" = b."userId"
  AND a."groupKey" = b."groupKey";

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_userId_groupKey_key"
  ON "Notification"("userId", "groupKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx"
  ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_kategori_entitasId_idx"
  ON "Notification"("userId", "kategori", "entitasId");

-- Pengingat persisten: interval WIB, kunci antrean, dan jejak eksekusi pasca-restart.
ALTER TABLE "ScheduledReminder"
  ADD COLUMN IF NOT EXISTS "jobKey" TEXT,
  ADD COLUMN IF NOT EXISTS "intervalMenit" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS "zonaWaktu" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  ADD COLUMN IF NOT EXISTS "terakhirDijalankan" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ScheduledReminder" SET "jobKey" = "id" WHERE "jobKey" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledReminder_jobKey_key"
  ON "ScheduledReminder"("jobKey");
CREATE INDEX IF NOT EXISTS "ScheduledReminder_isResolved_nextRunAt_idx"
  ON "ScheduledReminder"("isResolved", "nextRunAt");

-- Outbox pengiriman eksternal dengan retry bertahap dan eskalasi Admin Utama.
CREATE TABLE IF NOT EXISTS "NotificationOutbox" (
  "id" TEXT NOT NULL,
  "deliveryKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kanal" TEXT NOT NULL DEFAULT 'IN_APP',
  "kategori" TEXT NOT NULL DEFAULT 'UMUM',
  "entitasId" TEXT,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "escalationNotified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationOutbox_deliveryKey_key"
  ON "NotificationOutbox"("deliveryKey");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_nextAttemptAt_idx"
  ON "NotificationOutbox"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_userId_status_idx"
  ON "NotificationOutbox"("userId", "status");
