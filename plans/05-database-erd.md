erDiagram
    %% 1. PENGGUNA & KEAMANAN
    User ||--o{ Session : "memiliki"
    User ||--o{ OtpAndRecoveryToken : "memiliki"
    User ||--o| Cart : "memiliki"
    User ||--o{ Order : "membuat (customer)"
    User ||--o{ Notification : "menerima"
    User ||--o{ AdminAuditLog : "mencatat aksi"
    User ||--o{ BannerSubmission : "mengajukan (admin biasa)"
    User ||--o{ OfflineSale : "mencatat (admin)"

    %% 2. KATALOG & STOK AGREGAT PER JUDUL
    Book ||--o{ BookCategory : "memiliki"
    Category ||--o{ BookCategory : "mengelompokkan"
    Book ||--o{ BookCostHistory : "riwayat modal"
    Book ||--o{ CartItem : "dimasukkan ke"
    Book ||--o{ OrderItem : "disimpan sebagai snapshot"
    Book ||--o{ OfflineSaleItem : "terjual di"

    %% 3. KERANJANG & PEMESANAN
    Cart ||--o{ CartItem : "berisi"
    Order ||--o{ OrderItem : "memiliki item"
    Order ||--o{ OrderStatusHistory : "memiliki riwayat status"
    Order ||--o{ OrderPaymentAllocation : "dibayar melalui"
    Order ||--o{ RefundRecord : "memiliki refund"
    Order ||--o{ ScheduledReminder : "memiliki pengingat"

    %% 4. PEMBAYARAN QRIS & OFFLINE
    QrisConfig ||--o{ PaymentEvidence : "acuan QRIS"
    PaymentEvidence ||--o{ OrderPaymentAllocation : "dialokasikan ke"
    OfflineSale ||--o{ OfflineSaleItem : "berisi"
    OfflineSale ||--o{ OfflinePriceCorrection : "koreksi harga"

    %% 5. BANNER & TOKO LIBUR
    BannerSubmission ||--o| PublishedBanner : "diterbitkan menjadi"
    StoreStatus ||--o{ StoreClosureHistory : "mencatat riwayat"

    %% DEFINISI ATRIBUT UTAMA
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