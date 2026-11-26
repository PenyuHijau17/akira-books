import { describe, it, expect } from 'vitest'
import {
  UKURAN_MAKSIMAL_FILE,
  validasiAlokasiMultiOrder,
  validasiFileGambar,
  validasiKonfirmasiSensitif,
  validasiTandaTanganGambar,
} from '../pembayaran'

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16])
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
])

describe('Tahap 8 — Validasi berkas gambar (OD-04)', () => {
  it('menerima JPG, PNG, dan WebP yang sah', () => {
    expect(validasiFileGambar({ name: 'bukti.jpg', type: 'image/jpeg', size: 1000 }).valid).toBe(true)
    expect(validasiFileGambar({ name: 'bukti.png', type: 'image/png', size: 1000 }).valid).toBe(true)
    expect(validasiFileGambar({ name: 'bukti.webp', type: 'image/webp', size: 1000 }).valid).toBe(true)
  })

  it('menolak format dan ekstensi yang tidak sesuai', () => {
    expect(validasiFileGambar(null).valid).toBe(false)
    expect(validasiFileGambar({ name: 'bukti.gif', type: 'image/gif', size: 1000 }).valid).toBe(false)
    expect(validasiFileGambar({ name: 'bukti.png', type: 'image/jpeg', size: 1000 }).valid).toBe(false)
    expect(validasiFileGambar({ name: 'bukti.jpg', type: 'image/jpeg', size: 0 }).valid).toBe(false)
  })

  it('menolak berkas lebih dari 5 MB', () => {
    const hasil = validasiFileGambar({
      name: 'bukti.png',
      type: 'image/png',
      size: UKURAN_MAKSIMAL_FILE + 1,
    })
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toContain('5 MB')
  })

  it('tanda tangan biner menolak berkas yang hanya mengganti ekstensi', () => {
    expect(validasiTandaTanganGambar(png, 'image/png').valid).toBe(true)
    expect(validasiTandaTanganGambar(jpeg, 'image/jpeg').valid).toBe(true)
    expect(validasiTandaTanganGambar(webp, 'image/webp').valid).toBe(true)
    expect(validasiTandaTanganGambar(new TextEncoder().encode('bukan gambar'), 'image/png').valid).toBe(false)
    expect(validasiTandaTanganGambar(png, 'image/jpeg').valid).toBe(false)
  })
})

describe('Tahap 8 — Konfirmasi tindakan sensitif (FR-PAY-001)', () => {
  it('wajib memuat konfirmasi YA, kata sandi, dan OTP 6 digit', () => {
    expect(validasiKonfirmasiSensitif({ konfirmasi: 'YA', password: 'rahasia', otp: '123456' }).valid).toBe(true)
    expect(validasiKonfirmasiSensitif({ konfirmasi: 'ya', password: 'rahasia', otp: '123456' }).valid).toBe(true)
    expect(validasiKonfirmasiSensitif({ konfirmasi: 'TIDAK', password: 'rahasia', otp: '123456' }).valid).toBe(false)
    expect(validasiKonfirmasiSensitif({ konfirmasi: 'YA', password: '', otp: '123456' }).valid).toBe(false)
    expect(validasiKonfirmasiSensitif({ konfirmasi: 'YA', password: 'rahasia', otp: '12345' }).valid).toBe(false)
  })
})

describe('Tahap 8 — Alokasi satu transfer untuk banyak pesanan (OD-03)', () => {
  const orders = [
    { id: 'order-1', totalAmount: 75000 },
    { id: 'order-2', totalAmount: 125000 },
  ]

  it('menerima alokasi dua pesanan dengan total pas', () => {
    const hasil = validasiAlokasiMultiOrder({ orders, totalTransfer: 200000 })
    expect(hasil.valid).toBe(true)
    expect(hasil.alokasi).toEqual([
      { orderId: 'order-1', allocatedAmount: 75000 },
      { orderId: 'order-2', allocatedAmount: 125000 },
    ])
  })

  it('menolak total transfer yang tidak sesuai', () => {
    const hasil = validasiAlokasiMultiOrder({ orders, totalTransfer: 190000 })
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toContain('Total transfer')
  })

  it('menolak pesanan ganda, kosong, atau nominal tidak valid', () => {
    expect(validasiAlokasiMultiOrder({ orders: [], totalTransfer: 1 }).valid).toBe(false)
    expect(validasiAlokasiMultiOrder({ orders: [orders[0], orders[0]], totalTransfer: 150000 }).valid).toBe(false)
    expect(
      validasiAlokasiMultiOrder({
        orders: [{ id: 'order-3', totalAmount: -1 }],
        totalTransfer: -1,
      }).valid
    ).toBe(false)
    expect(validasiAlokasiMultiOrder({ orders, totalTransfer: 0 }).valid).toBe(false)
  })
})
