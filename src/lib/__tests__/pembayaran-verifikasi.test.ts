import { describe, it, expect } from 'vitest'
import {
  ajukanPemeriksaanAwal,
  ambilAlih,
  bolehUnggahBukti,
  bolehUnggahUlang,
  mintaBuktiBaru,
  putuskanFinal,
  saringDataAdminBiasa,
  statusPesananSetelahLunas,
  validasiBayarCfd,
  validasiKoreksi,
  type StateVerifikasi,
} from '../pembayaran'

const adminBiasa = { id: 'admin-biasa-1', role: 'ADMIN_BIASA' }
const adminBiasaLain = { id: 'admin-biasa-2', role: 'ADMIN_BIASA' }
const adminUtama = { id: 'admin-utama', role: 'ADMIN_UTAMA' }
const customer = { id: 'customer-1', role: 'CUSTOMER' }

function stateAwal(): StateVerifikasi {
  return {
    orderStatus: 'MENUNGGU_PEMBAYARAN',
    paymentProofStatus: 'MENUNGGU_VERIFIKASI',
    paymentReviewStatus: 'BELUM_DIPERIKSA',
    paymentReviewerId: null,
    paymentRejectedCount: 0,
  }
}

describe('Tahap 8 — Verifikasi 2 tahap (BR-014, FR-PAY-003)', () => {
  it('Admin Biasa meneruskan bukti ke putusan final Admin Utama', () => {
    const hasil = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN')
    expect(hasil.boleh).toBe(true)
    expect(hasil.state.paymentReviewStatus).toBe('MENUNGGU_PUTUSAN_UTAMA')
    expect(hasil.state.paymentReviewerId).toBe(adminBiasa.id)
    expect(hasil.state.paymentProofStatus).toBe('MENUNGGU_VERIFIKASI')
  })

  it('memblokir Admin Utama melakukan pemeriksaan awal', () => {
    const hasil = ajukanPemeriksaanAwal(stateAwal(), adminUtama, 'DITERUSKAN')
    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('Admin Biasa')
  })

  it('penolakan awal wajib disertai alasan', () => {
    const hasil = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITOLAK', '  ')
    expect(hasil.boleh).toBe(false)
    expect(hasil.state.paymentReviewStatus).toBe('BELUM_DIPERIKSA')
  })

  it('Admin Biasa tidak dapat memutuskan final', () => {
    const state = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const hasil = putuskanFinal(state, adminBiasa, 'DISETUJUI', '', 'BELUM_DISETUJUI')
    expect(hasil.boleh).toBe(false)
    expect(hasil.state.orderStatus).toBe('MENUNGGU_PEMBAYARAN')
  })

  it('putusan final tidak mungkin terjadi sebelum pemeriksaan awal', () => {
    const hasil = putuskanFinal(stateAwal(), adminUtama, 'DISETUJUI', '', 'BELUM_DISETUJUI')
    expect(hasil.boleh).toBe(false)
  })

  it('persetujuan final mengikuti OD-01 (jadwal disetujui → Menunggu Diambil)', () => {
    const state = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const hasil = putuskanFinal(state, adminUtama, 'DISETUJUI', '', 'DISETUJUI')
    expect(hasil.boleh).toBe(true)
    expect(hasil.state.orderStatus).toBe('MENUNGGU_DIAMBIL')
    expect(hasil.statusBuktiAkhir).toBe('TERVERIFIKASI')
  })

  it('persetujuan final tanpa jadwal disetujui → Sudah Dibayar', () => {
    const state = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const hasil = putuskanFinal(state, adminUtama, 'DISETUJUI', '', 'MENUNGGU_PERSETUJUAN')
    expect(hasil.state.orderStatus).toBe('SUDAH_DIBAYAR')
    expect(statusPesananSetelahLunas('DISETUJUI')).toBe('MENUNGGU_DIAMBIL')
  })

  it('putusan final wajib beralasan', () => {
    const state = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const hasil = putuskanFinal(state, adminUtama, 'DITOLAK', '', 'BELUM_DISETUJUI')
    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('alasan')
  })
})

describe('Tahap 8 — Tolak dua kali & pengambilan alih (BR-014)', () => {
  it('tolak final ke-1 kembali ke pemeriksa awal yang sama', () => {
    const awal = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const tolak1 = putuskanFinal(awal, adminUtama, 'DITOLAK', 'Bukti buram', 'BELUM_DISETUJUI')
    expect(tolak1.boleh).toBe(true)
    expect(tolak1.state.paymentRejectedCount).toBe(1)
    expect(tolak1.state.paymentReviewStatus).toBe('DIKEMBALIKAN_KE_PEMERIKSA')
    expect(tolak1.state.paymentReviewerId).toBe(adminBiasa.id)
    expect(tolak1.statusBuktiAkhir).toBe('MENUNGGU_VERIFIKASI')
  })

  it('pemeriksa awal lain tidak boleh memproses hasil tolakan ke-1', () => {
    const awal = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const tolak1 = putuskanFinal(awal, adminUtama, 'DITOLAK', 'Bukti buram', 'BELUM_DISETUJUI').state
    const hasil = ajukanPemeriksaanAwal(tolak1, adminBiasaLain, 'DITERUSKAN')
    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('pemeriksa awal yang sama')
  })

  it('pemeriksa awal yang sama boleh memproses ulang tolakan ke-1', () => {
    const awal = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const tolak1 = putuskanFinal(awal, adminUtama, 'DITOLAK', 'Bukti buram', 'BELUM_DISETUJUI').state
    const ulang = ajukanPemeriksaanAwal(tolak1, adminBiasa, 'DITERUSKAN')
    expect(ulang.boleh).toBe(true)
    expect(ulang.state.paymentReviewStatus).toBe('MENUNGGU_PUTUSAN_UTAMA')
  })

  it('tolak final ke-2 mengambil alih kasus ke Admin Utama', () => {
    const awal = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const tolak1 = putuskanFinal(awal, adminUtama, 'DITOLAK', 'Bukti buram', 'BELUM_DISETUJUI').state
    const periksaUlang = ajukanPemeriksaanAwal(tolak1, adminBiasa, 'DITERUSKAN').state
    const tolak2 = putuskanFinal(periksaUlang, adminUtama, 'DITOLAK', 'Nominal beda', 'BELUM_DISETUJUI')
    expect(tolak2.boleh).toBe(true)
    expect(tolak2.state.paymentRejectedCount).toBe(2)
    expect(tolak2.state.paymentReviewStatus).toBe('DIAMBIL_ALIH_UTAMA')
    expect(tolak2.statusBuktiAkhir).toBe('PERLU_BUKTI_BARU')
  })

  it('tidak ada persetujuan otomatis setelah penolakan', () => {
    const awal = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const tolak = putuskanFinal(awal, adminUtama, 'DITOLAK', 'Bukti buram', 'BELUM_DISETUJUI').state
    expect(tolak.orderStatus).toBe('MENUNGGU_PEMBAYARAN')
    expect(tolak.paymentProofStatus).not.toBe('TERVERIFIKASI')
  })

  it('Admin Utama dapat mengambil alih setelah tolak ke-1', () => {
    const awal = ajukanPemeriksaanAwal(stateAwal(), adminBiasa, 'DITERUSKAN').state
    const tolak1 = putuskanFinal(awal, adminUtama, 'DITOLAK', 'Bukti buram', 'BELUM_DISETUJUI').state
    const hasil = ambilAlih(tolak1, adminUtama)
    expect(hasil.boleh).toBe(true)
    expect(hasil.state.paymentReviewStatus).toBe('DIAMBIL_ALIH_UTAMA')
  })

  it('ambil alih ditolak sebelum ada penolakan', () => {
    const hasil = ambilAlih(stateAwal(), adminUtama)
    expect(hasil.boleh).toBe(false)
  })
})

describe('Tahap 8 — Permintaan bukti baru & unggah ulang (BR-015)', () => {
  it('meminta bukti baru wajib alasan dan tenggat di masa depan', () => {
    const sekarang = new Date('2026-11-26T00:00:00.000Z')
    const tanpaAlasan = mintaBuktiBaru(stateAwal(), adminBiasa, '', '2026-11-27T00:00:00.000Z', sekarang)
    expect(tanpaAlasan.boleh).toBe(false)

    const tenggatLama = mintaBuktiBaru(stateAwal(), adminBiasa, 'Bukti buram', '2026-11-25T00:00:00.000Z', sekarang)
    expect(tenggatLama.boleh).toBe(false)

    const hasil = mintaBuktiBaru(stateAwal(), adminBiasa, 'Bukti buram', '2026-11-27T00:00:00.000Z', sekarang)
    expect(hasil.boleh).toBe(true)
    expect(hasil.state.paymentProofStatus).toBe('PERLU_BUKTI_BARU')
    expect(hasil.tenggatBaru?.toISOString()).toBe('2026-11-27T00:00:00.000Z')
  })

  it('Customer tidak dapat meminta bukti baru', () => {
    const hasil = mintaBuktiBaru(stateAwal(), customer, 'Alasan', '2026-11-27T00:00:00.000Z')
    expect(hasil.boleh).toBe(false)
  })

  it('hanya bukti menunggu atau perlu diganti yang boleh diunggah ulang', () => {
    expect(bolehUnggahUlang('MENUNGGU_VERIFIKASI')).toBe(true)
    expect(bolehUnggahUlang('PERLU_BUKTI_BARU')).toBe(true)
    expect(bolehUnggahUlang('BELUM_DIUNGGAH')).toBe(false)
    expect(bolehUnggahUlang('TERVERIFIKASI')).toBe(false)
    expect(bolehUnggahUlang('DIGANTIKAN')).toBe(false)
  })

  it('unggah pertama mengizinkan status belum diunggah', () => {
    expect(bolehUnggahBukti('BELUM_DIUNGGAH')).toBe(true)
    expect(bolehUnggahBukti('MENUNGGU_VERIFIKASI')).toBe(true)
    expect(bolehUnggahBukti('PERLU_BUKTI_BARU')).toBe(true)
    expect(bolehUnggahBukti('TERVERIFIKASI')).toBe(false)
    expect(bolehUnggahBukti('DIGANTIKAN')).toBe(false)
  })
})

describe('Tahap 8 — Koreksi, CFD, dan isolasi modal (BR-017, GR-03)', () => {
  it('koreksi hanya Admin Utama dan tidak boleh mengubah nominal', () => {
    const ditolak = validasiKoreksi({
      actorRole: 'ADMIN_BIASA',
      alasan: 'Salah metode',
      perubahan: { paymentMethod: 'QRIS' },
    })
    expect(ditolak.valid).toBe(false)

    const nominal = validasiKoreksi({
      actorRole: 'ADMIN_UTAMA',
      alasan: 'Salah nominal',
      perubahan: { totalAmount: 999999 },
    })
    expect(nominal.valid).toBe(false)
    expect(nominal.alasan).toContain('Nominal')

    const sah = validasiKoreksi({
      actorRole: 'ADMIN_UTAMA',
      alasan: 'Salah metode',
      perubahan: { paymentMethod: 'TUNAI_CFD' },
    })
    expect(sah.valid).toBe(true)
  })

  it('pembayaran CFD hanya admin dan hanya saat menunggu bayar', () => {
    expect(validasiBayarCfd({ actorRole: 'CUSTOMER', orderStatus: 'MENUNGGU_PEMBAYARAN' }).valid).toBe(false)
    expect(validasiBayarCfd({ actorRole: 'ADMIN_BIASA', orderStatus: 'SUDAH_DIBAYAR' }).valid).toBe(false)
    expect(validasiBayarCfd({ actorRole: 'ADMIN_BIASA', orderStatus: 'MENUNGGU_PEMBAYARAN' }).valid).toBe(true)
  })

  it('Admin Biasa tidak menerima field modal/laba', () => {
    const data = {
      orderNumber: 'AB-001',
      totalAmount: 100000,
      modalPerUnit: 50000,
      item: { snapshotTitle: 'Buku', laba: 50000 },
      riwayat: [{ margin: 0.5, isLatest: true }],
    }
    const hasil = saringDataAdminBiasa(data) as any
    expect(hasil.orderNumber).toBe('AB-001')
    expect(hasil.totalAmount).toBe(100000)
    expect(JSON.stringify(hasil)).not.toContain('modalPerUnit')
    expect(JSON.stringify(hasil)).not.toContain('laba')
    expect(JSON.stringify(hasil)).not.toContain('margin')
    expect(hasil.item.snapshotTitle).toBe('Buku')
    expect(hasil.riwayat[0].isLatest).toBe(true)
  })
})
