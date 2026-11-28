import { describe, expect, it } from 'vitest'
import {
  bolehUbahAkun,
  dtoAkunPengguna,
  ringkasanPeran,
  saringAkunPengguna,
} from '@/lib/kelolaPengguna'

/** Logika murni panel Kelola Pengguna (GR-02/GR-03), tanpa database. */
describe('Kelola Pengguna — DTO dan aturan peran', () => {
  const baris = {
    id: 'akun-1',
    name: 'Ana Wijaya',
    email: 'ana@example.test',
    whatsapp: '08123456789',
    avatarUrl: '/uploads/avatars/ana.png',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date('2026-11-28T01:00:00.000Z'),
    // Field sensitif sengaja disisipkan untuk memastikan DTO membuangnya.
    passwordHash: 'rahasia',
    sessionUserId: 'sesi-1',
    deactivationReason: 'alasan lama',
  }

  it('hanya mengembalikan field yang diizinkan dan menghitung jumlah pesanan', () => {
    const hasil = dtoAkunPengguna(baris, 3)
    expect(hasil).toEqual({
      id: 'akun-1',
      nama: 'Ana Wijaya',
      email: 'ana@example.test',
      whatsapp: '08123456789',
      avatarUrl: '/uploads/avatars/ana.png',
      peran: 'CUSTOMER',
      isActive: true,
      tanggalDaftar: '2026-11-28T01:00:00.000Z',
      jumlahPesanan: 3,
    })
    for (const kunci of Object.keys(hasil)) {
      expect(kunci).not.toMatch(/password|hash|deactivation|session/i)
    }
  })

  it('mengganti nama kosong dan tanggal tidak valid dengan nilai aman', () => {
    const hasil = dtoAkunPengguna(
      { ...baris, name: null, createdAt: 'bukan-tanggal', role: 'ASING' },
      -5
    )
    expect(hasil.nama).toBe('Tanpa nama')
    expect(hasil.tanggalDaftar).toBeNull()
    expect(hasil.peran).toBe('CUSTOMER')
    expect(hasil.jumlahPesanan).toBe(0)
  })

  it('mencegah Admin Utama mengubah akunnya sendiri atau Admin Utama lain', () => {
    expect(bolehUbahAkun('utama-1', 'utama-1', 'ADMIN_UTAMA')).toBe(false)
    expect(bolehUbahAkun('utama-1', 'utama-2', 'ADMIN_UTAMA')).toBe(false)
    expect(bolehUbahAkun('utama-1', 'biasa-1', 'ADMIN_BIASA')).toBe(true)
    expect(bolehUbahAkun('utama-1', 'pelanggan-1', 'CUSTOMER')).toBe(true)
  })

  it('menyaring akun berdasarkan nama/email dan peran', () => {
    const daftar = [
      dtoAkunPengguna(baris, 1),
      dtoAkunPengguna({ ...baris, id: 'akun-2', name: 'Budi', email: 'budi@toko.test', role: 'ADMIN_BIASA' }, 0),
    ]
    expect(saringAkunPengguna(daftar, 'ANA', 'SEMUA').map((a) => a.id)).toEqual(['akun-1'])
    expect(saringAkunPengguna(daftar, 'toko.test', 'ADMIN_BIASA').map((a) => a.id)).toEqual([
      'akun-2',
    ])
    expect(saringAkunPengguna(daftar, '', 'CUSTOMER')).toHaveLength(1)
    expect(ringkasanPeran(daftar)).toEqual({
      CUSTOMER: 1,
      ADMIN_BIASA: 1,
      ADMIN_UTAMA: 0,
      total: 2,
    })
  })
})
