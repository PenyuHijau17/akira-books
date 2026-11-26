import { describe, it, expect } from 'vitest'
import {
  bolehAutoCancel,
  buktiTepatWaktu,
  hitungSisaDetik,
  hitungTenggatPerpanjangan,
  jedaTimer,
  lanjutkanTimer,
  pesanPeringatanQris,
} from '../pembayaran'

const sekarang = new Date('2026-11-26T12:00:00.000Z')
const tenggat = new Date('2026-11-27T12:00:00.000Z')

describe('Tahap 8 — Timer & jeda (BR-016, FR-DUE-001)', () => {
  it('menghitung sisa detik sampai tenggat 24 jam', () => {
    expect(hitungSisaDetik({ paymentDeadline: tenggat, sekarang })).toBe(24 * 3600)
  })

  it('jeda menyimpan sisa waktu dan tidak bergerak meski waktu berjalan', () => {
    const jeda = jedaTimer({ paymentDeadline: tenggat, sekarang })
    expect(jeda.pausedRemainingSeconds).toBe(24 * 3600)
    expect(jeda.pausedAt.getTime()).toBe(sekarang.getTime())

    const nanti = new Date(sekarang.getTime() + 3 * 60 * 60 * 1000)
    expect(
      hitungSisaDetik({
        paymentDeadline: tenggat,
        sekarang: nanti,
        pausedAt: jeda.pausedAt,
        pausedRemainingSeconds: jeda.pausedRemainingSeconds,
      })
    ).toBe(24 * 3600)
  })

  it('jeda dua kali tidak mengulang sisa waktu', () => {
    const jeda1 = jedaTimer({ paymentDeadline: tenggat, sekarang })
    const nanti = new Date(sekarang.getTime() + 60 * 1000)
    const jeda2 = jedaTimer({
      paymentDeadline: tenggat,
      sekarang: nanti,
      pausedAt: jeda1.pausedAt,
      pausedRemainingSeconds: jeda1.pausedRemainingSeconds,
    })
    expect(jeda2.pausedRemainingSeconds).toBe(jeda1.pausedRemainingSeconds)
    expect(jeda2.pausedAt.getTime()).toBe(jeda1.pausedAt.getTime())
  })

  it('lanjutkan timer memulihkan tenggat dari sisa waktu', () => {
    const jeda = jedaTimer({ paymentDeadline: tenggat, sekarang })
    const putusan = new Date(sekarang.getTime() + 2 * 60 * 60 * 1000)
    const lanjut = lanjutkanTimer({
      paymentDeadline: tenggat,
      sekarang: putusan,
      pausedAt: jeda.pausedAt,
      pausedRemainingSeconds: jeda.pausedRemainingSeconds,
    })
    expect(lanjut.pausedAt).toBeNull()
    expect(lanjut.pausedRemainingSeconds).toBeNull()
    expect(lanjut.paymentDeadline.getTime()).toBe(putusan.getTime() + 24 * 3600 * 1000)
  })

  it('tenggat habis tetap mengembalikan nol setelah dilanjutkan', () => {
    const lewat = new Date(sekarang.getTime() + 25 * 60 * 60 * 1000)
    const lanjut = lanjutkanTimer({ paymentDeadline: tenggat, sekarang: lewat })
    expect(lanjut.paymentDeadline.getTime()).toBe(lewat.getTime())
  })

  it('perpanjangan tenggat tidak menjeda dan dihitung dari tenggat lama', () => {
    const hasil = hitungTenggatPerpanjangan(tenggat, 24, sekarang)
    expect(hasil.getTime() - tenggat.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('pengajuan perpanjangan setelah tenggat lewat tetap menghitung dari sekarang', () => {
    const lewat = new Date(sekarang.getTime() + 30 * 60 * 60 * 1000)
    const hasil = hitungTenggatPerpanjangan(tenggat, 12, lewat)
    expect(hasil.getTime() - lewat.getTime()).toBe(12 * 60 * 60 * 1000)
  })
})

describe('Tahap 8 — Race upload vs auto-cancel (BR-015)', () => {
  it('bukti yang masuk tepat pada tenggat dianggap sah', () => {
    expect(buktiTepatWaktu(tenggat, tenggat)).toBe(true)
    expect(buktiTepatWaktu(new Date(tenggat.getTime() + 1000), tenggat)).toBe(false)
  })

  it('auto-cancel tidak boleh saat bukti masuk sebelum tenggat', () => {
    const hasil = bolehAutoCancel({
      orderStatus: 'MENUNGGU_PEMBAYARAN',
      paymentDeadline: tenggat,
      sekarang: new Date(tenggat.getTime() + 1000),
      uploadedAt: new Date(tenggat.getTime() - 1000),
    })
    expect(hasil).toBe(false)
  })

  it('auto-cancel boleh saat tenggat lewat tanpa bukti', () => {
    const hasil = bolehAutoCancel({
      orderStatus: 'MENUNGGU_PEMBAYARAN',
      paymentDeadline: tenggat,
      sekarang: new Date(tenggat.getTime() + 1000),
      uploadedAt: null,
    })
    expect(hasil).toBe(true)
  })

  it('auto-cancel diblokir saat timer dijeda pengajuan ubah metode', () => {
    const hasil = bolehAutoCancel({
      orderStatus: 'MENUNGGU_PEMBAYARAN',
      paymentDeadline: tenggat,
      sekarang: new Date(sekarang.getTime() + 30 * 60 * 60 * 1000),
      pausedAt: sekarang,
      pausedRemainingSeconds: 3600,
    })
    expect(hasil).toBe(false)
  })

  it('auto-cancel hanya sekali (flag stok & autoCancelled)', () => {
    const dasar = {
      orderStatus: 'MENUNGGU_PEMBAYARAN',
      paymentDeadline: tenggat,
      sekarang: new Date(tenggat.getTime() + 1000),
    }
    expect(bolehAutoCancel({ ...dasar, stockReleased: true })).toBe(false)
    expect(bolehAutoCancel({ ...dasar, autoCancelled: true })).toBe(false)
    expect(bolehAutoCancel({ ...dasar, orderStatus: 'SUDAH_DIBAYAR' })).toBe(false)
  })
})

describe('Tahap 8 — Pemberitahuan QRIS', () => {
  it('tidak ada peringatan tanpa pesanan aktif', () => {
    expect(pesanPeringatanQris(0)).toBeNull()
  })

  it('ada peringatan saat pesanan aktif terdampak', () => {
    const pesan = pesanPeringatanQris(3)
    expect(pesan).toContain('3')
    expect(pesan).toContain('Menunggu Pembayaran')
  })
})
