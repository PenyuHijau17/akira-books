// src/lib/navigasiAdmin.ts
// Konfigurasi navigasi admin yang dipakai bersama oleh Header (bar desktop &
// FAB mobile) dan hub /admin/penjualan.
//
// GR-02: ini hanya pengelompokan tautan UI, bukan pembatas akses. Otorisasi
//       tetap dilakukan di server pada masing-masing halaman/API.
// GR-03: helper ringkasan di bawah sengaja memakai daftar putih field agar
//       modal/laba tidak pernah ikut terkirim ke tampilan Admin Biasa.

export type RoleAdmin = 'ADMIN_BIASA' | 'ADMIN_UTAMA'

export type TautanAdmin = {
  href: string
  label: string
  deskripsi: string
  /** true hanya untuk menu yang benar-benar dikunci Admin Utama di server. */
  hanyaUtama?: boolean
}

/** Enam modul transaksi yang dikelompokkan di bawah hub Penjualan. */
export const MODUL_PENJUALAN: TautanAdmin[] = [
  {
    href: '/admin/pembayaran',
    label: 'Verifikasi Bayar',
    deskripsi: 'Periksa bukti transfer QRIS pesanan masuk.',
  },
  {
    href: '/admin/jadwal',
    label: 'Jadwal Pengambilan',
    deskripsi: 'Kelola antrean dan serah terima buku di booth CFD Minggu pagi.',
  },
  {
    href: '/admin/pembatalan',
    label: 'Pembatalan',
    deskripsi: 'Tinjau pengajuan pembatalan pesanan pelanggan.',
  },
  {
    href: '/admin/refund',
    label: 'Refund',
    deskripsi: 'Proses pengembalian dana untuk pesanan batal atau ditolak.',
  },
  {
    href: '/admin/penjualan-offline',
    label: 'Penjualan Offline',
    deskripsi: 'Catat transaksi tunai atau QRIS langsung di booth CFD.',
  },
  {
    href: '/admin/qris',
    label: 'QRIS Toko',
    deskripsi: 'Atur gambar QRIS aktif toko dan riwayatnya.',
    hanyaUtama: true,
  },
]

/** Tujuh item yang tampil di bar MENU ADMIN desktop. */
export const MENU_ADMIN: TautanAdmin[] = [
  {
    href: '/admin',
    label: 'Dashboard Admin',
    deskripsi: 'Ringkasan operasional toko dalam satu halaman.',
  },
  {
    href: '/admin/buku',
    label: 'Kelola Buku',
    deskripsi: 'Judul, stok, dan katalog toko.',
  },
  {
    href: '/admin/penjualan',
    label: 'Penjualan',
    deskripsi: 'Pusat seluruh operasional transaksi toko.',
  },
  {
    href: '/admin/banner',
    label: 'Banner Promo',
    deskripsi: 'Pengajuan dan pengelolaan banner toko.',
  },
  {
    href: '/admin/laporan',
    label: 'Laporan Keuangan',
    deskripsi: 'Ringkasan penjualan dan laba.',
    hanyaUtama: true,
  },
  {
    href: '/admin/notifikasi',
    label: 'Peringatan Notifikasi',
    deskripsi: 'Inbox peringatan dan antrean pengiriman notifikasi.',
  },
  {
    href: '/admin/backup',
    label: 'Backup & Pemulihan',
    deskripsi: 'Arsip terenkripsi dan uji pemulihan data.',
    hanyaUtama: true,
  },
]

export function adalahRoleAdmin(role: unknown): role is RoleAdmin {
  return role === 'ADMIN_UTAMA' || role === 'ADMIN_BIASA'
}

export function bolehBukaTautan(role: unknown, tautan: TautanAdmin): boolean {
  return !tautan.hanyaUtama || role === 'ADMIN_UTAMA'
}

/** Menu admin yang boleh ditampilkan/dibuka sesuai peran. */
export function daftarMenuAdmin(role: unknown): TautanAdmin[] {
  return adalahRoleAdmin(role) ? MENU_ADMIN.filter((t) => bolehBukaTautan(role, t)) : []
}

/** Enam modul penjualan yang boleh ditampilkan/dibuka sesuai peran. */
export function daftarModulPenjualan(role: unknown): TautanAdmin[] {
  return adalahRoleAdmin(role) ? MODUL_PENJUALAN.filter((t) => bolehBukaTautan(role, t)) : []
}

/** Hub Penjualan ikut menyala pada semua sub-halaman transaksi. */
export function adalahRutePenjualan(pathname: string): boolean {
  const jalur = String(pathname ?? '').replace(/\/+$/, '') || '/'
  return (
    jalur === '/admin/penjualan' ||
    MODUL_PENJUALAN.some((t) => jalur === t.href || jalur.startsWith(`${t.href}/`))
  )
}

/** Penanda aktif untuk tautan navigasi; `/admin` tidak menyala di semua sub-halaman. */
export function tautanSedangAktif(pathname: string, href: string): boolean {
  const jalur = String(pathname ?? '').replace(/\/+$/, '') || '/'
  const tujuan = String(href ?? '').replace(/\/+$/, '') || '/'

  if (tujuan === '/admin/penjualan') return adalahRutePenjualan(jalur)
  if (tujuan === '/') return jalur === '/'
  if (tujuan === '/admin') return jalur === '/admin'
  return jalur === tujuan || jalur.startsWith(`${tujuan}/`)
}

// ---------------------------------------------------------------------------
// Ringkasan badge hub — daftar putih, tanpa costPrice/laba (GR-03).
// ---------------------------------------------------------------------------

export type RingkasanBadgeHub = {
  pembayaran: number
  jadwal: number
  pembatalanRefund: number
}

function angkaAman(nilai: unknown): number {
  const angka = Number(nilai)
  return Number.isFinite(angka) && angka > 0 ? Math.floor(angka) : 0
}

/**
 * Ambil hanya tiga angka yang dibutuhkan hub dari respons /api/admin/dashboard.
 * Field lain (termasuk costPrice, snapshotCostPrice, laba) sengaja dibuang.
 */
export function ringkasBadgeDashboard(respons: unknown): RingkasanBadgeHub {
  const ringkasan =
    respons && typeof respons === 'object' && 'ringkasan' in respons
      ? (respons as { ringkasan?: unknown }).ringkasan
      : null
  const aman =
    ringkasan && typeof ringkasan === 'object'
      ? (ringkasan as Record<string, unknown>)
      : {}

  return {
    pembayaran: angkaAman(aman.pembayaranMenungguVerifikasi),
    jadwal: angkaAman(aman.jadwalMingguTerdekat),
    pembatalanRefund: angkaAman(aman.pembatalanRefundAktif),
  }
}

export type StatusQrisHub = 'aktif' | 'kosong' | 'terkunci' | null

/** Status QRIS untuk kartu hub. Admin Biasa tidak memanggil API QRIS. */
export function statusQrisDariRespons(respons: unknown): Exclude<StatusQrisHub, null> {
  if (!respons || typeof respons !== 'object') return 'kosong'
  const data = respons as { aktif?: unknown }
  return data.aktif ? 'aktif' : 'kosong'
}

export type BadgeModul = {
  teks: string
  variant: 'success' | 'warning' | 'neutral' | 'info'
}

export function badgeUntukModul(
  href: string,
  ringkasan: RingkasanBadgeHub,
  statusQris: StatusQrisHub
): BadgeModul | null {
  switch (href) {
    case '/admin/pembayaran':
      return ringkasan.pembayaran > 0
        ? { teks: `${ringkasan.pembayaran} menunggu`, variant: 'warning' }
        : { teks: 'Antrean kosong', variant: 'success' }
    case '/admin/jadwal':
      return ringkasan.jadwal > 0
        ? { teks: `${ringkasan.jadwal} pesanan`, variant: 'warning' }
        : { teks: 'Antrean kosong', variant: 'success' }
    case '/admin/pembatalan':
    case '/admin/refund':
      return ringkasan.pembatalanRefund > 0
        ? { teks: `${ringkasan.pembatalanRefund} aktif`, variant: 'warning' }
        : { teks: 'Tidak ada', variant: 'success' }
    case '/admin/qris':
      if (statusQris === 'terkunci') return { teks: 'Khusus Admin Utama', variant: 'neutral' }
      if (statusQris === 'aktif') return { teks: 'QRIS aktif', variant: 'success' }
      if (statusQris === 'kosong') return { teks: 'Belum diatur', variant: 'warning' }
      return null
    default:
      return null
  }
}
