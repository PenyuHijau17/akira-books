// src/lib/notifikasi.ts
// Logika murni Tahap 12: pengelompokan notifikasi sejenis, isolasi penerima, dan label WIB.
// Tidak mengakses database agar dapat diuji unit (GR-10).
// Referensi: NFR-01, BR-003, BR-008, BR-009, GR-03.

export type KategoriNotifikasi =
  | 'PEMBAYARAN'
  | 'JADWAL'
  | 'PESANAN'
  | 'PENJUALAN'
  | 'SISTEM'
  | 'UMUM'

export type NotifikasiItem = {
  id: string
  kategori?: string | null
  entitasId?: string | null
  groupKey?: string | null
  message: string
  isRead?: boolean
  createdAt: Date | string
}

export type GrupNotifikasi = {
  kunci: string
  kategori: string
  label: string
  entitasId: string | null
  jumlah: number
  belumDibaca: number
  waktuTerbaru: string
  items: NotifikasiItem[]
}

const LABEL_KATEGORI: Record<string, string> = {
  PEMBAYARAN: 'Pembayaran',
  JADWAL: 'Jadwal Pengambilan',
  PESANAN: 'Pesanan',
  PENJUALAN: 'Penjualan',
  SISTEM: 'Sistem',
  UMUM: 'Lainnya',
}

/** Tetapkan kategori dari kunci pengiriman (kompatibel dengan notifikasi lama). */
export function kategoriDariKunci(groupKey: string | null | undefined): KategoriNotifikasi {
  const kunci = String(groupKey || '')
  if (kunci.startsWith('jadwal:') || kunci.startsWith('pengingat:PENGINGAT_JADWAL')) return 'JADWAL'
  if (kunci.startsWith('pengingat:')) return 'PEMBAYARAN'
  if (
    kunci.startsWith('auto-cancel:') ||
    kunci.startsWith('refund:') ||
    kunci.startsWith('pembayaran:') ||
    kunci.startsWith('bukti:') ||
    kunci.startsWith('putusan:') ||
    kunci.startsWith('metode:') ||
    kunci.startsWith('tenggat:') ||
    kunci.startsWith('qris:')
  )
    return 'PEMBAYARAN'
  if (kunci.startsWith('koreksi-offline:') || kunci.startsWith('penjualan:')) return 'PENJUALAN'
  if (
    kunci.startsWith('keranjang:') ||
    kunci.startsWith('pesanan:') ||
    kunci.startsWith('pembatalan:')
  )
    return 'PESANAN'
  if (kunci.startsWith('outbox:') || kunci.startsWith('sistem:') || kunci.startsWith('toko:'))
    return 'SISTEM'
  return 'UMUM'
}

export function labelKategori(kategori: string | null | undefined): string {
  return LABEL_KATEGORI[String(kategori || 'UMUM')] || 'Lainnya'
}

function waktu(item: NotifikasiItem): number {
  const nilai = item.createdAt instanceof Date ? item.createdAt.getTime() : new Date(item.createdAt).getTime()
  return Number.isFinite(nilai) ? nilai : 0
}

/**
 * Kelompokkan notifikasi sejenis yang berdekatan (kategori + entitas sama) setelah diurutkan
 * terbaru lebih dulu. Detail setiap item tetap dipertahankan di `items` (NFR-01).
 */
export function kelompokkanNotifikasi(
  daftar: NotifikasiItem[],
  opsi: { kategoriDifromKunci?: boolean } = {}
): GrupNotifikasi[] {
  const terurut = [...daftar].sort((a, b) => waktu(b) - waktu(a))
  const hasil: GrupNotifikasi[] = []
  const indeks = new Map<string, GrupNotifikasi>()

  for (const item of terurut) {
    const kategori =
      item.kategori || (opsi.kategoriDifromKunci ? kategoriDariKunci(item.groupKey) : 'UMUM')
    const entitasId = item.entitasId || null
    const kunci = `${kategori}:${entitasId || '-'}`
    const grup = indeks.get(kunci)

    if (grup) {
      // Detail individual dipertahankan; hanya tampilan yang digabung.
      grup.items.push(item)
      grup.jumlah += 1
      if (!item.isRead) grup.belumDibaca += 1
      continue
    }

    const grupBaru: GrupNotifikasi = {
      kunci,
      kategori,
      label: labelKategori(kategori),
      entitasId,
      jumlah: 1,
      belumDibaca: item.isRead ? 0 : 1,
      waktuTerbaru: new Date(waktu(item)).toISOString(),
      items: [item],
    }
    indeks.set(kunci, grupBaru)
    hasil.push(grupBaru)
  }

  return hasil
}

/** BR-003/BR-002: notifikasi hanya dapat dibaca oleh pemilik akun. */
export function bolehBacaNotifikasi(
  pengguna: { id: string } | null | undefined,
  notifikasi: { userId: string } | null | undefined
): boolean {
  if (!pengguna || !notifikasi) return false
  return pengguna.id === notifikasi.userId
}

/** Badge jumlah belum dibaca di navigasi (dibatasi agar tidak menyesatkan). */
export function formatBadgeBelumDibaca(jumlah: number): string {
  if (!Number.isFinite(jumlah) || jumlah <= 0) return ''
  return jumlah > 99 ? '99+' : String(Math.floor(jumlah))
}

/** Tampilan waktu WIB untuk antarmuka (NFR-06). */
export function formatWaktuWIB(tanggal: Date | string): string {
  const nilai = tanggal instanceof Date ? tanggal : new Date(tanggal)
  if (Number.isNaN(nilai.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(nilai)
}

// ==========================================
// Tampilan inbox: kelompok tanggal & tautan pesanan
// ==========================================

export type GrupTanggalNotifikasi = {
  kunci: 'HARI_INI' | 'KEMARIN' | 'SEBELUMNYA'
  label: 'Hari Ini' | 'Kemarin' | 'Sebelumnya'
  jumlah: number
  belumDibaca: number
  items: NotifikasiItem[]
}

const formatterHariWIB = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function kunciHariWIB(nilai: Date): string {
  return formatterHariWIB.format(nilai)
}

function hariSebelumnyaWIB(nilai: Date): string {
  const bagian = kunciHariWIB(nilai).split('-').map(Number)
  return kunciHariWIB(new Date(Date.UTC(bagian[0], bagian[1] - 1, bagian[2] - 1)))
}

/**
 * Kelompokkan inbox berdasarkan hari WIB agar tidak ada judul generik "Lainnya".
 * Detail tiap notifikasi tetap dipertahankan di `items` (NFR-01).
 */
export function kelompokkanNotifikasiPerTanggal(
  daftar: NotifikasiItem[],
  sekarang: Date = new Date()
): GrupTanggalNotifikasi[] {
  const hariIni = kunciHariWIB(sekarang)
  const kemarin = hariSebelumnyaWIB(sekarang)

  const terurut = [...daftar].sort((a, b) => waktu(b) - waktu(a))
  const peta = new Map<GrupTanggalNotifikasi['kunci'], GrupTanggalNotifikasi>()

  for (const item of terurut) {
    const kunciHari = kunciHariWIB(
      item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
    )
    const kunci: GrupTanggalNotifikasi['kunci'] =
      kunciHari === hariIni ? 'HARI_INI' : kunciHari === kemarin ? 'KEMARIN' : 'SEBELUMNYA'
    const label: GrupTanggalNotifikasi['label'] =
      kunci === 'HARI_INI' ? 'Hari Ini' : kunci === 'KEMARIN' ? 'Kemarin' : 'Sebelumnya'

    const grup = peta.get(kunci) || {
      kunci,
      label,
      jumlah: 0,
      belumDibaca: 0,
      items: [],
    }
    grup.items.push(item)
    grup.jumlah += 1
    if (!item.isRead) grup.belumDibaca += 1
    peta.set(kunci, grup)
  }

  const urutan: GrupTanggalNotifikasi['kunci'][] = ['HARI_INI', 'KEMARIN', 'SEBELUMNYA']
  return urutan
    .map((kunci) => peta.get(kunci))
    .filter((grup): grup is GrupTanggalNotifikasi => Boolean(grup))
}

const POLA_ID_PESANAN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const POLA_ID_PESANAN_GLOBAL =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const POLA_NOMOR_PESANAN = /AKB-\d{8}-\d{6}/i
const KATEGORI_PESANAN = new Set(['PEMBAYARAN', 'JADWAL', 'PESANAN'])

/**
 * Tautan detail pesanan hanya dibuat jika notifikasi benar-benar memuat
 * ID/nomor pesanan. Tidak ada tautan rusak untuk notifikasi sistem/umum.
 *
 * Kandidat ID dikumpulkan dari entitas, kunci grup, dan pesan lalu dicocokkan
 * ke daftar pesanan milik pengguna. Ini penting karena kunci seperti
 * `bukti:diunggah:<idBukti>:<idPenerima>` dan `qris:diganti:<idQris>:<idPesanan>`
 * memuat UUID yang bukan ID pesanan.
 */
export function tautanDetailPesanan(
  item: Pick<NotifikasiItem, 'kategori' | 'entitasId' | 'groupKey' | 'message'>,
  daftarPesanan: Array<{ id: string; orderNumber: string }> = []
): string | null {
  const teks = `${item.message || ''} ${item.groupKey || ''}`
  const nomor = teks.match(POLA_NOMOR_PESANAN)?.[0] || null
  const berkaitan = KATEGORI_PESANAN.has(String(item.kategori || '')) || Boolean(nomor)
  if (!berkaitan) return null

  const kandidat = [
    ...(item.entitasId?.match(POLA_ID_PESANAN) || []),
    ...(teks.match(POLA_ID_PESANAN_GLOBAL) || []),
  ]

  const cocokId = daftarPesanan.find((pesanan) => kandidat.includes(pesanan.id))
  if (cocokId?.id) return `/pesanan/${cocokId.id}`

  if (nomor) {
    const cocokNomor = daftarPesanan.find(
      (pesanan) => pesanan.orderNumber === nomor
    )
    if (cocokNomor?.id) return `/pesanan/${cocokNomor.id}`
  }

  const kunci = String(item.groupKey || '').toLowerCase()
  const idJelasPesanan =
    /^(pesanan|pengingat|jadwal|auto-cancel|refund):/.test(kunci) ||
    (Boolean(item.entitasId?.match(POLA_ID_PESANAN)) &&
      KATEGORI_PESANAN.has(String(item.kategori || '')))
  if (!idJelasPesanan) return null

  const id = kandidat[0]
  return id ? `/pesanan/${id}` : null
}
