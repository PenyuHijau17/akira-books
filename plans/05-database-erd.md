# RANCANGAN STRUKTUR DATABASE (ERD)
## AKIRA BOOKS

```text
User {
    string id PK
    string email UK
    string passwordHash
    string name
    string whatsapp
    enum role "CUSTOMER | ADMIN_BIASA | ADMIN_UTAMA"
    boolean isActive
    string deactivationReason
    datetime deletionRequestedAt
}

Session {
    string id PK
    string userId FK
    string tokenHash UK
    datetime expiresAt
}

OtpAndRecoveryToken {
    string id PK
    string userId FK
    string codeHash
    enum type "OTP_SENSITIF | RESET_PASSWORD | RECOVERY_ADMIN"
    int failedAttempts
    datetime expiresAt
    datetime usedAt
}

Book {
    string id PK
    string code UK
    string title
    string author
    string publisher
    int publishYear
    string imageUrl
    string description
    int sellingPrice
    int costPrice "Rahasia: Khusus Admin Utama"
    int stockTotal "Stok agregat >= 0"
    int stockReserved "Stok ditahan order aktif"
    enum status "TERSEDIA | SEDANG_DIPESAN | TERJUAL | NONAKTIF"
}

Category {
    string id PK
    string name UK
}

BookCategory {
    string bookId PK, FK
    string categoryId PK, FK
}

BookCostHistory {
    string id PK
    string bookId FK
    int oldCostPrice
    int newCostPrice
    string reason
    string changedById FK
    datetime createdAt
}

Cart {
    string id PK
    string userId FK
    int approvedVersion "Naik jika item terjual offline"
    boolean requiresReapproval
}

CartItem {
    string id PK
    string cartId FK
    string bookId FK
    int quantity
}

Order {
    string id PK
    string orderNumber UK
    string idempotencyKey UK
    string customerId FK
    enum orderStatus "MENUNGGU_PEMBAYARAN | SUDAH_DIBAYAR | MENUNGGU_DIAMBIL | SELESAI | DIBATALKAN"
    enum paymentProofStatus "BELUM_DIUNGGAH | MENUNGGU_VERIFIKASI | PERLU_BUKTI_BARU | TERVERIFIKASI"
    enum pickupStatus "MENUNGGU_KONFIRMASI | DISETUJUI | PERLU_TANGGAL_BARU | PERUBAHAN_MENUNGGU_PERSETUJUAN"
    enum refundStatus "TIDAK_BERLAKU | PERLU_DIPROSES | DIKEMBALIKAN_SEBAGIAN | SELESAI"
    enum paymentMethod "QRIS | TUNAI_CFD"
    date pickupSundayDate
    string pickupGroupId "Opsional: gabung jadwal"
    datetime paymentDeadline
    int pausedRemainingSeconds "Jeda saat ubah metode bayar"
    string lockedByAdminId
    datetime lockExpiresAt
}

OrderItem {
    string id PK
    string orderId FK
    string bookId FK
    string snapshotTitle
    int quantity
    int snapshotSellingPrice
    int snapshotCostPrice "Rahasia: Khusus Admin Utama"
}

OrderStatusHistory {
    string id PK
    string orderId FK
    string domain "ORDER | PAYMENT | PICKUP | REFUND"
    string oldStatus
    string newStatus
    string reason
    string actorId FK
    string actorRole "CUSTOMER | ADMIN | SYSTEM"
    datetime createdAt
}

QrisConfig {
    string id PK
    string imageUrl
    boolean isActive
    string uploadedById FK
    datetime createdAt
}

PaymentEvidence {
    string id PK
    string qrisConfigId FK
    string imageUrl
    enum status "MENUNGGU_VERIFIKASI | PERLU_BUKTI_BARU | TERVERIFIKASI"
    int rejectionCount
    string initialCheckedById FK
    string finalApprovedById FK
    string rejectionReason
    datetime uploadedAt
}

OrderPaymentAllocation {
    string id PK
    string orderId FK
    string paymentEvidenceId FK
    int allocatedAmount "Mendukung 1 bukti untuk multi-order"
}

RefundRecord {
    string id PK
    string orderId FK
    int refundAmount
    string reason
    string processedById FK
    datetime refundedAt
}

OfflineSale {
    string id PK
    string recordedById FK
    datetime soldAt
}

OfflineSaleItem {
    string id PK
    string offlineSaleId FK
    string bookId FK
    int quantity
    int actualSellingPrice
    int snapshotCostPrice "Rahasia: Khusus Admin Utama"
}

OfflinePriceCorrection {
    string id PK
    string offlineSaleId FK
    int oldPrice
    int newPrice
    string reason
    string proposedById FK
    string approvedById FK
    enum status "PENDING | DISETUJUI | DITOLAK"
}

StoreStatus {
    string id PK
    boolean isOpen
    string activeClosureReason
    datetime updatedAt
}

StoreClosureHistory {
    string id PK
    datetime closedAt
    datetime reopenedAt
    string actorNameSnapshot
    string actorRoleSnapshot
    string lastReason
}

Notification {
    string id PK
    string userId FK
    string groupKey
    string message
    boolean isRead
    int retryCount
    datetime createdAt
}

ScheduledReminder {
    string id PK
    string orderId FK
    enum type "REMINDER_BUKTI_2JAM | REMINDER_JADWAL_2JAM | AUTO_CANCEL_TENGGAT"
    datetime nextRunAt
    boolean isResolved
}

AdminAuditLog {
    string id PK
    string actorId FK
    string actorRoleSnapshot
    string action
    string targetEntity
    string targetId
    json oldValue
    json newValue
    string reason
    datetime createdAt "Append-only / Immutable"
}