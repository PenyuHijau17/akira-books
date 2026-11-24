import { describe, it, expect } from 'vitest'
import { toWIB, toWIBString, ZONE_WIB, TENGGAT_DEFAULT_MENIT, formatRupiah, hitungSelisihMenit, cekTenggatLewati, cekPeringkat2Jam } from '../timezone'

describe('Helper Waktu WIB (BR-009, NFR-06)', () => {
  describe('Konstanta Waktu', () => {
    it('ZONE_WIB harus equals "Asia/Jakarta"', () => {
      expect(ZONE_WIB).toBe('Asia/Jakarta')
    })

    it('TENGGAT_DEFAULT_MENit harus 1440 (24 jam)', () => {
      expect(TENGGAT_DEFAULT_MENIT).toBe(1440)
    })
  })

  describe('toWIB', () => {
    it('seharusnya menambah 7 jam ke tanggal UTC', () => {
      // 03:00 UTC + 7 jam = 10:00 WIB
      const result = toWIB(new Date('2026-11-24T03:00:00Z'))
      expect(result.getHours()).toBe(10)
      expect(result.getDate()).toBe(24)
    })

    it('seharusnya mengembalikan objek Date', () => {
      const result = toWIB(new Date())
      expect(result instanceof Date).toBe(true)
    })
  })

  describe('toWIBString', () => {
    it('seharusnya mengembalikan string format WIB lengkap', () => {
      const result = toWIBString(new Date())
      expect(typeof result).toBe('string')
      expect(result).not.toBeNull()
      // Format: "Selasa, 24 November 2026 pukul 20.14"
      expect(result).toMatch(/^\w+, \d+ \w+ \d+ pukul \d{2}.\d{2}$/)
    })
  })

  describe('formatRupiah', () => {
    it('seharusnya men-format angka dengan format Rupiah', () => {
      const formatted = formatRupiah(50000)
      expect(formatted).toContain('Rp')
      // Format Indonesia: "Rp 50.000" (with non-breaking space)
      expect(formatted).toMatch(/^Rp\s+\d+(?:\.\d{3})*/)
    })

    it('seharusnya format angka positif dengan Rupiah', () => {
      const formatted = formatRupiah(1000)
      expect(formatted).toMatch(/^Rp\s+\d+/)
    })
  })

  describe('hitungSelisihMenit', () => {
    it('seharusnya menghitung selisih menit antara dua tanggal', () => {
      const dari = new Date('2026-11-24T10:00:00')
      const ke = new Date('2026-11-24T12:00:00')
      const selisih = hitungSelisihMenit(dari, ke)
      expect(selisih).toBe(120)
    })
  })

  describe('cekTenggatLewati', () => {
    it('seharusnya mengembalikan boolean', () => {
      const tanggalDibuat = new Date('2026-11-24T10:00:00')
      const result = cekTenggatLewati(tanggalDibuat)
      expect(result).toBeTypeOf('boolean')
    })
  })

  describe('cekPeringkat2Jam', () => {
    it('seharusnya mengembalikan boolean', () => {
      const tanggalDibuat = new Date('2026-11-24T10:00:00')
      const result = cekPeringkat2Jam(tanggalDibuat)
      expect(result).toBeTypeOf('boolean')
    })
  })
})