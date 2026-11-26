// src/lib/outbox.ts
// Logika murni outbox Tahap 12: retry bertahap, kunci idempoten, dan eskalasi kegagalan.
// Tidak mengakses database atau layanan eksternal (GR-01, NFR-01, BR-008).

/** Backoff bertahap (menit): 5, 15, 45, 120, 360. */
export const JEDA_RETRY_MENIT = [5, 15, 45, 120, 360] as const

export type OutboxDasar = {
  deliveryKey: string
  userId: string
  kanal: string
  kategori?: string | null
  entitasId?: string | null
  message: string
  attempts: number
  maxAttempts: number
  status: string
  lastError?: string | null
}

export type HasilPengiriman = {
  berhasil: boolean
  error?: string | null
}

export type KeputusanOutbox = {
  status: 'PENDING' | 'TERKIRIM' | 'GAGAL'
  attempts: number
  nextAttemptAt: Date
  sentAt: Date | null
  lastError: string | null
  butuhEskalasi: boolean
}

/** Jeda retry untuk attempt ke-N (1 = kegagalan pertama). Selector bertahap, bukan acak. */
export function jedaRetryMenit(attempts: number): number {
  const indeks = Math.min(Math.max(1, Math.floor(attempts)) - 1, JEDA_RETRY_MENIT.length - 1)
  return JEDA_RETRY_MENIT[indeks]
}

export function jadwalRetry(attempts: number, sekarang: Date = new Date()): Date {
  return new Date(sekarang.getTime() + jedaRetryMenit(attempts) * 60 * 1000)
}

/**
 * Kunci pengiriman deterministik: pengulangan permintaan/klik tidak boleh membuat antrean ganda.
 */
export function kunciPengiriman(args: {
  kanal: string
  userId: string
  groupKey: string
  kategori?: string | null
  entitasId?: string | null
}): string {
  const bagian = [
    String(args.kanal || 'IN_APP').toUpperCase(),
    String(args.userId || ''),
    String(args.kategori || 'UMUM').toUpperCase(),
    String(args.entitasId || '-'),
    String(args.groupKey || ''),
  ]
  return bagian.join('|')
}

/** BR-008/NFR-01: eskalasi hanya setelah attempts mencapai batas maksimal. */
export function penilaianEskalasi(attempts: number, maxAttempts: number): boolean {
  return Number(attempts) >= Number(maxAttempts)
}

/**
 * Hitung status berikutnya setelah satu percobaan kirim. Dipakai oleh pelaksana outbox
 * sehingga seluruh transisi dapat diuji tanpa jaringan.
 */
export function penilaianPengirimanOutbox(args: {
  attempts: number
  maxAttempts: number
  kirim: HasilPengiriman
  sekarang: Date
}): KeputusanOutbox {
  const attemptsBaru = Math.max(0, Number(args.attempts)) + 1
  const batas = Math.max(1, Number(args.maxAttempts))

  if (args.kirim.berhasil) {
    return {
      status: 'TERKIRIM',
      attempts: attemptsBaru,
      nextAttemptAt: args.sekarang,
      sentAt: args.sekarang,
      lastError: null,
      butuhEskalasi: false,
    }
  }

  const error = String(args.kirim.error || 'Kegagalan pengiriman tidak diketahui').slice(0, 500)
  const gagalFinal = penilaianEskalasi(attemptsBaru, batas)
  return {
    status: gagalFinal ? 'GAGAL' : 'PENDING',
    attempts: attemptsBaru,
    nextAttemptAt: gagalFinal ? args.sekarang : jadwalRetry(attemptsBaru, args.sekarang),
    sentAt: null,
    lastError: error,
    butuhEskalasi: gagalFinal,
  }
}

/** Pesan peringatan untuk Admin Utama; sengaja tidak memuat modal/laba (GR-03). */
export function pesanEskalasiOutbox(item: OutboxDasar): string {
  return (
    `Pengiriman ${String(item.kanal || 'IN_APP').toLowerCase()} gagal berulang ` +
    `(${item.attempts}/${item.maxAttempts} percobaan) untuk notifikasi "${item.message}". ` +
    `Kunci pengiriman: ${item.deliveryKey}. Perlu tindak lanjut Admin Utama.`
  )
}

/** Hanya antrean PENDING yang boleh diproses otomatis. */
export function bolehDiprosesOutbox(item: { status: string }, sekarang: Date, nextAttemptAt: Date): boolean {
  return item.status === 'PENDING' && new Date(nextAttemptAt).getTime() <= sekarang.getTime()
}
