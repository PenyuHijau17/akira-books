// src/lib/kelolaPengguna.ts
// Logika murni panel Kelola Pengguna (/admin/pengguna) — khusus Admin Utama.
// GR-02: pembatasan peran divalidasi ulang di API. GR-03: DTO memakai daftar
// putih field, sehingga passwordHash dan data sensitif lain tidak pernah keluar.

export type PeranKelola = 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'
export type PeranYangBolehDiubah = Extract<PeranKelola, 'CUSTOMER' | 'ADMIN_BIASA'>

export type AkunPengguna = {
  id: string
  nama: string
  email: string
  whatsapp: string | null
  avatarUrl: string | null
  peran: PeranKelola
  isActive: boolean
  tanggalDaftar: string | null
  jumlahPesanan: number
}

export type RingkasanPeran = {
  CUSTOMER: number
  ADMIN_BIASA: number
  ADMIN_UTAMA: number
  total: number
}

/** Baris database yang dibutuhkan DTO. Field lain sengaja tidak didefinisikan. */
export type BarisAkunMentah = {
  id: string
  name: string | null
  email: string
  whatsapp: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
  createdAt: Date | string
}

const PERAN_VALID: PeranKelola[] = ['CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA']

export function adalahPeranKelola(nilai: unknown): nilai is PeranKelola {
  return typeof nilai === 'string' && PERAN_VALID.includes(nilai as PeranKelola)
}

export function adalahPeranYangBolehDiubah(
  nilai: unknown
): nilai is PeranYangBolehDiubah {
  return nilai === 'CUSTOMER' || nilai === 'ADMIN_BIASA'
}

/** DTO daftar putih: tidak ada passwordHash, session FK, alasan nonaktif, dll. */
export function dtoAkunPengguna(
  baris: BarisAkunMentah,
  jumlahPesanan: number = 0
): AkunPengguna {
  const tanggal = baris.createdAt instanceof Date ? baris.createdAt : new Date(baris.createdAt)
  return {
    id: String(baris.id),
    nama: String(baris.name ?? '').trim() || 'Tanpa nama',
    email: String(baris.email ?? '').trim(),
    whatsapp: baris.whatsapp ? String(baris.whatsapp) : null,
    avatarUrl: baris.avatarUrl ? String(baris.avatarUrl) : null,
    peran: adalahPeranKelola(baris.role) ? baris.role : 'CUSTOMER',
    isActive: Boolean(baris.isActive),
    tanggalDaftar: Number.isNaN(tanggal.getTime()) ? null : tanggal.toISOString(),
    jumlahPesanan: Number.isFinite(Number(jumlahPesanan)) ? Math.max(0, Number(jumlahPesanan)) : 0,
  }
}

/** Filter ringan untuk tampilan; API juga memfilter server-side (GR-02). */
export function saringAkunPengguna(
  daftar: AkunPengguna[],
  cari: string,
  peran: string
): AkunPengguna[] {
  const kata = String(cari ?? '').trim().toLocaleLowerCase('id-ID')
  const peranDiminta = adalahPeranKelola(peran) ? peran : null
  return daftar.filter((akun) => {
    if (peranDiminta && akun.peran !== peranDiminta) return false
    if (!kata) return true
    return (
      akun.nama.toLocaleLowerCase('id-ID').includes(kata) ||
      akun.email.toLocaleLowerCase('id-ID').includes(kata)
    )
  })
}

/** Admin Utama tidak boleh menonaktifkan atau menurunkan peran akunnya sendiri. */
export function bolehUbahAkun(
  actorId: string,
  targetId: string,
  targetRole: string
): boolean {
  return String(actorId) !== String(targetId) && targetRole !== 'ADMIN_UTAMA'
}

/** Hitung ringkasan dari seluruh akun (sebelum pencarian/filter tampilan). */
export function ringkasanPeran(daftar: AkunPengguna[]): RingkasanPeran {
  const hasil: RingkasanPeran = {
    CUSTOMER: 0,
    ADMIN_BIASA: 0,
    ADMIN_UTAMA: 0,
    total: daftar.length,
  }
  for (const akun of daftar) {
    if (akun.peran in hasil) hasil[akun.peran] += 1
  }
  return hasil
}
