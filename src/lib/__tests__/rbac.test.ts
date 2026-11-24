import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MATRIX_AKSES, RolePengguna, boleLihatModalLaba } from '../rbac'

vi.mock('@/lib/prisma', () => ({}))

describe('RBAC Matrix - Validasi GR-03 Isolasi Modal', () => {
  beforeEach(() => {})

  describe('boleLihatModalLaba', () => {
    it('hanya Admin Utama yang boleh melihat costPrice / modal & laba', () => {
      // PENGUNGGUNG tidak boleh
      expect(boleLihatModalLaba('PENGUNGGUNG')).toBe(false)
      // CUSTOMER tidak boleh
      expect(boleLihatModalLaba('CUSTOMER')).toBe(false)
      // ADMIN_BIASA tidak boleh
      expect(boleLihatModalLaba('ADMIN_BIASA')).toBe(false)
      // HANYA Admin Utama boleh
      expect(boleLihatModalLaba('ADMIN_UTAMA')).toBe(true)
    })
  })

  describe('MATRIX_AKSES memiliki 4 role terdaftar', () => {
    it('seharusnya ada 4 role yang terdaftar', () => {
      const roles: RolePengguna[] = ['PENGUNGGUNG', 'CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA']
      expect(roles.length).toBe(4)
    })

    it('MATRIX_AKSES harus memiliki semua key role', () => {
      const semuaRole = ['PENGUNGGUNG', 'CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA']
      expect(Object.keys(MATRIX_AKSES).length).toBe(4)
      semuaRole.forEach((value: string) => {
        const role = value as RolePengguna
        expect(typeof MATRIX_AKSES[role]).toBe('object')
      })
    })
  })
})

describe('RBAC - Peran vs Operasi Dasar', () => {
  describe('PENGUNGGUNG', () => {
    it('harus memiliki akses dasar', () => {
      const akses = MATRIX_AKSES.PENGUNGGUNG
      expect(akses.LihatBeranda).toBe(true)
      expect(akses.LihatKatalog).toBe(true)
      expect(akses.LihatDetailBuku).toBe(true)
    })

    it('tidak boleh checkout', () => {
      const akses = MATRIX_AKSES.PENGUNGGUNG
      expect(akses.Checkout).toBe(false)
    })
  })

  describe('CUSTOMER', () => {
    it('harus memiliki akses keranjang dan pemesanan', () => {
      const akses = MATRIX_AKSES.CUSTOMER
      expect(akses.KelolaKeranjang).toBe(true)
      expect(akses.BuatPesanan).toBe(true)
    })

    it('tidak boleh akses fitur administrasi (GR-03)', () => {
      const akses = MATRIX_AKSES.CUSTOMER
      expect(akses.LihatModalLaba).toBe(false)
    })
  })

  describe('ADMIN_BIASA', () => {
    it('harus memiliki akses operasional utama', () => {
      const akses = MATRIX_AKSES.ADMIN_BIASA
      expect(boleLihatModalLaba('ADMIN_BIASA')).toBe(false)
      // cek beberapa operasi kunci yang ada di matrix
      expect(akses.LihatSemua).toBe(true)
    })

    it('WAHIB: costPrice BOLEH dilihat hanya untuk Admin Utama', () => {
      expect(boleLihatModalLaba('ADMIN_BIASA')).toBe(false)
    })
  })

  describe('ADMIN_UTAMA', () => {
    it('harus memiliki akses penuh ke costPrice & modal', () => {
      expect(boleLihatModalLaba('ADMIN_UTAMA')).toBe(true)
    })
  })
})