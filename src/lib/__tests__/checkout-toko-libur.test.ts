import { describe, it, expect } from 'vitest'
import { cekTokoBuka } from '../pesanan'

describe('Tahap 7 — Blokir checkout saat Toko Libur (BR-013)', () => {
  it('menolak checkout ketika toko sedang tutup', () => {
    const hasil = cekTokoBuka({ isOpen: false })

    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('libur')
    expect(hasil.alasan).toContain('Keranjang Anda tetap tersimpan')
  })

  it('mengizinkan checkout ketika toko terbuka', () => {
    const hasil = cekTokoBuka({ isOpen: true })

    expect(hasil.boleh).toBe(true)
    expect(hasil.alasan).toBeNull()
  })

  it('mengizinkan checkout bila belum ada catatan status toko', () => {
    expect(cekTokoBuka(null).boleh).toBe(true)
  })

  it('menolak checkout bila status toko gagal diverifikasi', () => {
    const hasil = cekTokoBuka({ isOpen: true }, false)

    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('verifikasi')
  })

  it('tetap menolak meskipun status terlihat terbuka tetapi tidak terverifikasi', () => {
    expect(cekTokoBuka({ isOpen: false }, false).boleh).toBe(false)
  })
})
