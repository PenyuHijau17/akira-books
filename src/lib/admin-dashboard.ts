// src/lib/admin-dashboard.ts
// Logika murni Dashboard Admin (/admin) — tanpa akses database agar mudah diuji.
// Referensi: FR-ACC-001, GR-02 (otorisasi server), GR-03 (isolasi modal/laba).

import { filterForRole } from '@/lib/isolasi'

export type RoleDashboard = 'PENGUNGGUNG' | 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'

// Rekomendasi teknis (bukan keputusan bisnis): batas stok menipis pada kartu ringkasan.
// Nilai ini hanya dipakai untuk penandaan UI, bukan untuk aturan transaksi.
export const AMBANG_STOK_MENIPIS = 5

/** Tujuan setelah login: kedua peran admin masuk ke Dashboard Utama. */
export function tentukanTujuanSetelahLogin(role: unknown): string {
  return role === 'ADMIN_UTAMA' || role === 'ADMIN_BIASA' ? '/admin' : '/katalog'
}

/** Hanya field stok/status yang dibutuhkan dashboard: sengaja TANPA costPrice/laba (GR-03). */
export type BukuRingkasDashboard = {
  status: string
  stockTotal: number
  stockReserved: number
  mergedIntoBookId?: string | null
}

export type RingkasanBukuDashboard = {
  judulTersedia: number
  stokMenipis: number
}

/**
 * Hitung jumlah judul tersedia dan judul dengan stok menipis.
 * Stok tersedia = stockTotal - stockReserved (BR-010). Buku hasil merge duplikat tidak dihitung ulang.
 */
export function hitungRingkasanBuku(buku: BukuRingkasDashboard[]): RingkasanBukuDashboard {
  let judulTersedia = 0
  let stokMenipis = 0

  for (const item of buku) {
    if (item.status !== 'TERSEDIA' || item.mergedIntoBookId) continue
    const sisa = Number(item.stockTotal) - Number(item.stockReserved)
    if (!Number.isFinite(sisa) || sisa <= 0) continue
    judulTersedia += 1
    if (sisa <= AMBANG_STOK_MENIPIS) stokMenipis += 1
  }

  return { judulTersedia, stokMenipis }
}

export type RingkasanDashboard = {
  pembayaranMenungguVerifikasi: number
  jadwalMingguTerdekat: number
  tanggalMingguTerdekat: string | null
  pembatalanRefundAktif: number
  judulTersedia: number
  stokMenipis: number
  tokoBuka: boolean
  alasanLibur: string | null
}

/**
 * Whitelist payload dashboard. Filter GR-03 dipakai sebagai pertahanan berlapis:
 * field modal/laba yang mungkin tersisip tidak boleh sampai ke Admin Biasa.
 */
export function saringRingkasanDashboardUntukPeran(
  ringkasan: RingkasanDashboard & Record<string, unknown>,
  role: RoleDashboard
): RingkasanDashboard {
  const aman = filterForRole({ ...ringkasan }, role) as Record<string, unknown>

  return {
    pembayaranMenungguVerifikasi: Number(aman.pembayaranMenungguVerifikasi) || 0,
    jadwalMingguTerdekat: Number(aman.jadwalMingguTerdekat) || 0,
    tanggalMingguTerdekat:
      typeof aman.tanggalMingguTerdekat === 'string' ? aman.tanggalMingguTerdekat : null,
    pembatalanRefundAktif: Number(aman.pembatalanRefundAktif) || 0,
    judulTersedia: Number(aman.judulTersedia) || 0,
    stokMenipis: Number(aman.stokMenipis) || 0,
    tokoBuka: Boolean(aman.tokoBuka),
    alasanLibur: typeof aman.alasanLibur === 'string' ? aman.alasanLibur : null,
  }
}

export type PintasanAdmin = {
  href: string
  label: string
  deskripsi: string
}

const PINTASAN_BERSAMA: PintasanAdmin[] = [
  { href: '/admin/buku', label: 'Kelola Buku', deskripsi: 'Judul, stok, dan katalog toko' },
  { href: '/admin/pembayaran', label: 'Verifikasi Pembayaran', deskripsi: 'Bukti QRIS dan putusan pembayaran' },
  { href: '/admin/jadwal', label: 'Jadwal Pengambilan', deskripsi: 'Minggu pengambilan dan penyerahan buku' },
  { href: '/admin/penjualan-offline', label: 'Penjualan Offline', deskripsi: 'Penjualan langsung di booth CFD' },
  { href: '/admin/banner', label: 'Banner Promo', deskripsi: 'Pengajuan dan pengelolaan banner' },
  { href: '/admin/qris', label: 'QRIS Toko', deskripsi: 'Gambar QRIS aktif dan riwayatnya' },
]

const PINTASAN_ADMIN_UTAMA: PintasanAdmin[] = [
  { href: '/admin/laporan', label: 'Laporan Keuangan', deskripsi: 'Ringkasan penjualan dan laba (Admin Utama)' },
  { href: '/admin/backup', label: 'Backup & Pemulihan', deskripsi: 'Arsip terenkripsi dan uji pulihkan data' },
  { href: '/admin/pengguna', label: 'Kelola Pengguna', deskripsi: 'Akun, peran, dan status seluruh pengguna' },
]

/** Pintasan quick actions; laporan & backup hanya untuk Admin Utama. */
export function daftarPintasanAdmin(role: RoleDashboard): PintasanAdmin[] {
  if (role !== 'ADMIN_BIASA' && role !== 'ADMIN_UTAMA') return []
  return [
    { href: '/admin', label: 'Dashboard Admin', deskripsi: 'Ringkasan operasional toko' },
    ...PINTASAN_BERSAMA,
    ...(role === 'ADMIN_UTAMA' ? PINTASAN_ADMIN_UTAMA : []),
  ]
}
