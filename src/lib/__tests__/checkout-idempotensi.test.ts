import { describe, it, expect } from 'vitest'
import {
  cekIdempotensi,
  validasiIdempotencyKey,
  hitungTenggatPembayaran,
} from '../pesanan'

describe('Tahap 7 — Idempotensi checkout (BR-008)', () => {
  it('menandai pesanan baru ketika kunci belum digunakan', () => {
    expect(cekIdempotensi(null, 'customer-1')).toBe('BARU')
  })

  it('mengembalikan pesanan lama untuk pelanggan yang sama', () => {
    expect(cekIdempotensi({ customerId: 'customer-1' }, 'customer-1')).toBe(
      'GUNAKAN_PESANAN_LAMA'
    )
  })

  it('menolak kunci yang dipakai pelanggan lain', () => {
    expect(cekIdempotensi({ customerId: 'customer-2' }, 'customer-1')).toBe(
      'KONFLIK_PENGGUNA'
    )
  })

  it('memvalidasi panjang kunci idempotensi', () => {
    expect(validasiIdempotencyKey('pendek')).toBe(false)
    expect(validasiIdempotencyKey('   ')).toBe(false)
    expect(validasiIdempotencyKey('kunci-idempotensi-123')).toBe(true)
    expect(validasiIdempotencyKey(12345)).toBe(false)
  })

  it('menghitung tenggat pembayaran tepat 24 jam', () => {
    const awal = new Date('2026-11-26T00:00:00.000Z')
    const tenggat = hitungTenggatPembayaran(awal)
    const selisihJam = (tenggat.getTime() - awal.getTime()) / (60 * 60 * 1000)

    expect(selisihJam).toBe(24)
  })
})
