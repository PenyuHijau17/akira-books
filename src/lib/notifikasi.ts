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
  if (kunci.startsWith('auto-cancel:') || kunci.startsWith('refund:')) return 'PEMBAYARAN'
  if (kunci.startsWith('pembayaran:') || kunci.startsWith('bukti:')) return 'PEMBAYARAN'
  if (kunci.startsWith('koreksi-offline:') || kunci.startsWith('penjualan:')) return 'PENJUALAN'
  if (kunci.startsWith('keranjang:') || kunci.startsWith('pesanan:')) return 'PESANAN'
  if (kunci.startsWith('sistem:')) return 'SISTEM'
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
