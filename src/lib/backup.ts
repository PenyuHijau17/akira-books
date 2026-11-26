// src/lib/backup.ts
// Tahap 13 — logika murni backup terenkripsi age, retensi 30 hari, dan izin Admin Utama.
// Tidak mengakses database atau filesystem sehingga mudah diuji (GR-10).

export const RETENSI_HARI_DEFAULT = 30
export const JAM_BACKUP_HARIAN_DEFAULT = '02:00' // WIB

export type JenisBackup = 'HARIAN' | 'MANUAL'
export type StatusBackup = 'BERHASIL' | 'GAGAL' | 'DIHAPUS'

export type ArsipRetensi = {
  namaFile: string
  dibuatPada: Date
  status?: string
}

/** Nama arsip deterministik agar tidak menimpa backup lain pada hari/menit sama. */
export function namaArsipBackup(jenis: JenisBackup, waktu: Date = new Date()): string {
  const capWaktu = waktu.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return `akira-backup-${capWaktu}-${jenis.toLowerCase()}.tar.gz.age`
}

/** Batas retensi dihitung dari waktu pembuatan, bukan waktu penghapusan. */
export function batasRetensi(
  dibuatPada: Date,
  sekarang: Date = new Date(),
  hari: number = RETENSI_HARI_DEFAULT
): Date {
  return new Date(dibuatPada.getTime() + Math.max(0, hari) * 24 * 60 * 60 * 1000)
}

export function apakahKedaluwarsa(
  dibuatPada: Date,
  sekarang: Date = new Date(),
  hari: number = RETENSI_HARI_DEFAULT
): boolean {
  return batasRetensi(dibuatPada, sekarang, hari).getTime() <= sekarang.getTime()
}

/** Arsip yang sudah DIHAPUS tidak perlu dihapus ulang. */
export function daftarKedaluwarsa<T extends ArsipRetensi>(
  daftar: T[],
  sekarang: Date = new Date(),
  hari: number = RETENSI_HARI_DEFAULT
): T[] {
  return daftar.filter(
    (item) =>
      item.status !== 'DIHAPUS' &&
      apakahKedaluwarsa(new Date(item.dibuatPada), sekarang, hari)
  )
}

export type RingkasanRetensi = {
  batasHari: number
  total: number
  tersimpan: number
  kedaluwarsa: number
  sudahDihapus: number
  batasWaktuTerdekat: string | null
}

export function ringkasanRetensi<T extends ArsipRetensi>(
  daftar: T[],
  sekarang: Date = new Date(),
  hari: number = RETENSI_HARI_DEFAULT
): RingkasanRetensi {
  const aktif = daftar.filter((item) => item.status !== 'DIHAPUS')
  const kedaluwarsa = daftarKedaluwarsa(daftar, sekarang, hari)
  const belumKedaluwarsa = aktif
    .filter((item) => !apakahKedaluwarsa(new Date(item.dibuatPada), sekarang, hari))
    .map((item) => batasRetensi(new Date(item.dibuatPada), sekarang, hari).getTime())

  return {
    batasHari: hari,
    total: daftar.length,
    tersimpan: aktif.length - kedaluwarsa.length,
    kedaluwarsa: kedaluwarsa.length,
    sudahDihapus: daftar.filter((item) => item.status === 'DIHAPUS').length,
    batasWaktuTerdekat: belumKedaluwarsa.length
      ? new Date(Math.min(...belumKedaluwarsa)).toISOString()
      : null,
  }
}

/**
 * Kunci publik/penerima age disimpan terpisah oleh pemilik toko dan hanya dibaca
 * dari environment variable. Kunci privat TIDAK pernah dibaca aplikasi.
 */
export function validasiKunciPublikAge(
  kunci: string | null | undefined
): { valid: boolean; alasan: string | null } {
  const nilai = String(kunci || '').trim()
  if (!nilai) {
    return { valid: false, alasan: 'Kunci publik age belum diatur (AKIRA_BACKUP_AGE_PUBLIC_KEY).' }
  }
  if (/^age1[0-9a-z]{20,}$/i.test(nilai)) return { valid: true, alasan: null }
  return {
    valid: false,
    alasan: 'Kunci publik age tidak valid. Gunakan bentuk age1... (hasil age-keygen -y).',
  }
}

/** GR-02: backup/restore hanya untuk Admin Utama. */
export function bolehKelolaBackup(peran: string | null | undefined): boolean {
  return peran === 'ADMIN_UTAMA'
}

export function formatUkuranByte(byte: number): string {
  const nilai = Math.max(0, Number(byte) || 0)
  if (nilai < 1024) return `${nilai} B`
  if (nilai < 1024 * 1024) return `${(nilai / 1024).toFixed(1)} KB`
  if (nilai < 1024 * 1024 * 1024) return `${(nilai / (1024 * 1024)).toFixed(1)} MB`
  return `${(nilai / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function tanggalWIB(waktu: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(waktu)
}

function menitWIB(waktu: Date): number {
  const bagian = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(waktu)
  const jam = Number(bagian.find((p) => p.type === 'hour')?.value || '0')
  const menit = Number(bagian.find((p) => p.type === 'minute')?.value || '0')
  return jam * 60 + menit
}

export function jamWIBValid(jam: string | null | undefined): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(jam || '').trim())
}

/**
 * Backup harian cukup sekali per hari WIB, setelah jam yang ditentukan.
 * Percobaan gagal tidak ditandai berhasil sehingga bisa diulang pada siklus berikutnya.
 */
export function sudahWaktunyaBackupHarian(params: {
  sekarang: Date
  jamWIB?: string
  backupBerhasilTerakhirPada?: Date | null
}): boolean {
  const jam = jamWIBValid(params.jamWIB) ? String(params.jamWIB) : JAM_BACKUP_HARIAN_DEFAULT
  const [jamTarget, menitTarget] = jam.split(':').map(Number)
  if (menitWIB(params.sekarang) < jamTarget * 60 + menitTarget) return false

  const terakhir = params.backupBerhasilTerakhirPada
  if (!terakhir) return true
  return tanggalWIB(terakhir) !== tanggalWIB(params.sekarang)
}
