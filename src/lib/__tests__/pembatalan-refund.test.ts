import { describe, it, expect } from 'vitest'
import { labelStatusRefund } from '../pesanan'
import {
  METODE_REFUND,
  penilaianPembatalan,
  rencanaRilisStok,
  ringkasanRefund,
  statusRefundBerdasarkanNominal,
  statusSebelumSelesai,
  validasiKoreksiSelesai,
  validasiMetodeRefund,
  validasiNominalRefund,
  validasiStokKoreksi,
  sudahDisetujuiFinal,
} from '../pembatalan'

const belumLunas = {
  orderStatus: 'MENUNGGU_PEMBAYARAN',
  paymentProofStatus: 'MENUNGGU_VERIFIKASI',
  paymentReviewStatus: 'BELUM_DIPERIKSA',
  paidAt: null,
}

const sudahLunas = {
  orderStatus: 'SUDAH_DIBAYAR',
  paymentProofStatus: 'TERVERIFIKASI',
  paymentReviewStatus: 'DISETUJUI',
  paidAt: new Date('2026-11-26T00:00:00.000Z'),
}

const riwayatSelesai = (oldStatus: string, tanggal = '2026-11-26T02:00:00.000Z') => [
  {
    domain: 'ORDER',
    oldStatus,
    newStatus: 'SELESAI',
    reason: 'Serah terima buku',
    createdAt: new Date(tanggal),
  },
]

describe('Tahap 10 — Aturan pembatalan per peran (FR-CAN-001, BR-007, BR-020)', () => {
  it('Customer hanya membatalkan sebelum pembayaran disetujui final', () => {
    const hasil = penilaianPembatalan({ ...belumLunas, peran: 'CUSTOMER' })
    expect(hasil.boleh).toBe(true)
    expect(hasil.statusRefundAwal).toBe('TIDAK_BERLAKU')
    expect(hasil.perluAlasanTambahan).toBe(false)

    const ditolak = penilaianPembatalan({ ...sudahLunas, peran: 'CUSTOMER' })
    expect(ditolak.boleh).toBe(false)
    expect(ditolak.alasan).toContain('hubungi admin')
  })

  it('Admin Biasa hanya membatalkan sebelum persetujuan final dan wajib alasan', () => {
    expect(penilaianPembatalan({ ...belumLunas, peran: 'ADMIN_BIASA' }).boleh).toBe(false)
    const valid = penilaianPembatalan({
      ...belumLunas,
      peran: 'ADMIN_BIASA',
      alasan: 'Customer minta batal',
    })
    expect(valid.boleh).toBe(true)
    const final = penilaianPembatalan({
      ...sudahLunas,
      peran: 'ADMIN_BIASA',
      alasan: 'Customer minta batal',
    })
    expect(final.boleh).toBe(false)
    expect(final.alasan).toContain('Admin Utama')
  })

  it('Admin Utama dapat membatalkan setelah lunas; satu-satunya Admin Utama wajib alasan tambahan', () => {
    const tanpaTambahan = penilaianPembatalan({
      ...sudahLunas,
      peran: 'ADMIN_UTAMA',
      alasan: 'Permintaan pembatalan',
    })
    expect(tanpaTambahan.boleh).toBe(false)
    expect(tanpaTambahan.alasan).toContain('alasan tambahan')

    const lengkap = penilaianPembatalan({
      ...sudahLunas,
      peran: 'ADMIN_UTAMA',
      alasan: 'Permintaan pembatalan',
      alasanTambahan: 'Buku rusak saat disiapkan',
      jumlahAdminUtama: 1,
    })
    expect(lengkap.boleh).toBe(true)
    expect(lengkap.perluAlasanTambahan).toBe(true)
    expect(lengkap.statusRefundAwal).toBe('PERLU_DIPROSES')

    const banyakAdmin = penilaianPembatalan({
      ...sudahLunas,
      peran: 'ADMIN_UTAMA',
      alasan: 'Permintaan pembatalan',
      jumlahAdminUtama: 2,
    })
    expect(banyakAdmin.boleh).toBe(true)
    expect(banyakAdmin.perluAlasanTambahan).toBe(false)
  })

  it('mendeteksi pembayaran final dari paidAt, bukti terverifikasi, atau keputusan final', () => {
    expect(sudahDisetujuiFinal(sudahLunas)).toBe(true)
    expect(sudahDisetujuiFinal({ ...belumLunas, paidAt: new Date() })).toBe(true)
    expect(sudahDisetujuiFinal({ ...belumLunas, paymentProofStatus: 'TERVERIFIKASI' })).toBe(true)
    expect(sudahDisetujuiFinal({ ...belumLunas, paymentReviewStatus: 'DISETUJUI' })).toBe(true)
    expect(sudahDisetujuiFinal(belumLunas)).toBe(false)
  })

  it('pembatalan bersifat final untuk pesanan Selesai atau DIBATALKAN', () => {
    for (const status of ['SELESAI', 'DIBATALKAN']) {
      const hasil = penilaianPembatalan({
        ...belumLunas,
        orderStatus: status,
        peran: 'ADMIN_UTAMA',
        alasan: 'Alasan cukup',
        alasanTambahan: 'Alasan tambahan',
      })
      expect(hasil.boleh).toBe(false)
      expect(hasil.alasan).toContain('final')
    }
  })

  it('sistem tidak membatalkan pesanan lunas dan menolak pengunjung', () => {
    expect(penilaianPembatalan({ ...belumLunas, peran: 'PENGUNGGUNG' as any }).boleh).toBe(false)
    expect(penilaianPembatalan({ ...sudahLunas, peran: 'SYSTEM', alasan: 'Auto' }).boleh).toBe(false)
    expect(penilaianPembatalan({ ...belumLunas, peran: 'SYSTEM', alasan: 'Auto' }).boleh).toBe(true)
  })
})

describe('Tahap 10 — Pelepasan stok tertahan tepat 1x (BR-008, BR-010)', () => {
  const buku = {
    b1: { id: 'b1', status: 'AKTIF', stockReserved: 4 },
    b2: { id: 'b2', status: 'NONAKTIF', stockReserved: 9 },
  }
  const items = [
    { bookId: 'b1', quantity: 2 },
    { bookId: 'b1', quantity: 1 },
    { bookId: 'b2', quantity: 1 },
  ]

  it('menggabungkan kuantitas per buku dan melewati buku nonaktif', () => {
    const hasil = rencanaRilisStok({ items, buku, stockReleased: false })
    expect(hasil.boleh).toBe(true)
    expect(hasil.urutanBookId).toEqual(['b1', 'b2'])
    expect(hasil.rilis).toEqual([{ bookId: 'b1', quantity: 3 }])
    expect(hasil.dilewati).toHaveLength(1)
    expect(hasil.dilewati[0].bookId).toBe('b2')
  })

  it('menolak rilis kedua apabila flag stockReleased sudah true', () => {
    const hasil = rencanaRilisStok({ items, buku, stockReleased: true })
    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('sudah dilepaskan')
    expect(hasil.rilis).toEqual([])
  })

  it('menolak stok tertahan tidak mencukupi sebelum transaksi dijalankan', () => {
    const hasil = rencanaRilisStok({
      items: [{ bookId: 'b1', quantity: 5 }],
      buku,
      stockReleased: false,
    })
    expect(hasil.boleh).toBe(false)
    expect(hasil.alasan).toContain('tidak mencukupi')
    expect(hasil.rilis).toEqual([])
  })

  it('menolak item kosong atau kuantitas tidak valid', () => {
    expect(rencanaRilisStok({ items: [], buku, stockReleased: false }).boleh).toBe(false)
    expect(
      rencanaRilisStok({
        items: [{ bookId: 'b1', quantity: 0 }],
        buku,
        stockReleased: false,
      }).boleh
    ).toBe(false)
  })
})

describe('Tahap 10 — Refund terpisah, bertahap, dan persetujuan Admin Utama (BR-006, BR-020)', () => {
  it('status refund dihitung dari nominal, bukan dari status pesanan', () => {
    expect(statusRefundBerdasarkanNominal({ nominalDibayar: 0, totalDisetujui: 0 })).toBe(
      'TIDAK_BERLAKU'
    )
    expect(statusRefundBerdasarkanNominal({ nominalDibayar: 100000, totalDisetujui: 0 })).toBe(
      'PERLU_DIPROSES'
    )
    expect(statusRefundBerdasarkanNominal({ nominalDibayar: 100000, totalDisetujui: 40000 })).toBe(
      'DIKEMBALIKAN_SEBAGIAN'
    )
    expect(statusRefundBerdasarkanNominal({ nominalDibayar: 100000, totalDisetujui: 100000 })).toBe(
      'SELESAI'
    )
  })

  it('menghitung sisa dana dengan memasukkan pengajuan menunggu persetujuan', () => {
    const ringkasan = ringkasanRefund({
      nominalDibayar: 200000,
      totalDisetujui: 50000,
      totalMenunggu: 40000,
    })
    expect(ringkasan.sisa).toBe(110000)
    expect(ringkasan.status).toBe('DIKEMBALIKAN_SEBAGIAN')
  })

  it('menerima refund sebagian selama total tidak melebihi nominal dibayar', () => {
    const dasar = { nominalDibayar: 200000, totalDisetujui: 50000, totalMenunggu: 40000 }
    const sah = validasiNominalRefund({ ...dasar, nominalBaru: 110000 })
    expect(sah.valid).toBe(true)
    expect(sah.sisa).toBe(110000)

    const lebih = validasiNominalRefund({ ...dasar, nominalBaru: 110001 })
    expect(lebih.valid).toBe(false)
    expect(lebih.alasan).toContain('melebihi')

    expect(validasiNominalRefund({ ...dasar, nominalBaru: 0 }).valid).toBe(false)
    expect(validasiNominalRefund({ ...dasar, nominalBaru: 1.5 }).valid).toBe(false)
    expect(validasiNominalRefund({ nominalDibayar: 0, totalDisetujui: 0, nominalBaru: 1 }).valid).toBe(
      false
    )
  })

  it('metode refund terbatas dan label status tersedia', () => {
    expect(METODE_REFUND).toEqual(['TRANSFER_BANK', 'TUNAI', 'QRIS', 'LAINNYA'])
    expect(validasiMetodeRefund('transfer_bank').metode).toBe('TRANSFER_BANK')
    expect(validasiMetodeRefund('').valid).toBe(false)
    expect(validasiMetodeRefund('COD').valid).toBe(false)
    expect(labelStatusRefund('DIKEMBALIKAN_SEBAGIAN')).toBe('Dikembalikan Sebagian')
    expect(labelStatusRefund('MENUNGGU_PERSETUJUAN')).toBe('Menunggu Persetujuan Admin Utama')
  })
})

describe('Tahap 10 — Koreksi status SELESAI (FR-DONE-001)', () => {
  it('hanya Admin Utama yang boleh mengoreksi dan hanya dari riwayat yang tercatat', () => {
    const dasar = {
      orderStatus: 'SELESAI',
      stockSold: true,
      alasan: 'Salah tanda terima',
      statusSebelumnya: statusSebelumSelesai(riwayatSelesai('MENUNGGU_DIAMBIL')),
    }
    expect(validasiKoreksiSelesai({ ...dasar, peran: 'ADMIN_BIASA' }).valid).toBe(false)
    expect(validasiKoreksiSelesai({ ...dasar, peran: 'ADMIN_UTAMA' }).valid).toBe(true)
    expect(validasiKoreksiSelesai({ ...dasar, peran: 'ADMIN_UTAMA' }).statusTujuan).toBe(
      'MENUNGGU_DIAMBIL'
    )

    const statusSalah = validasiKoreksiSelesai({
      ...dasar,
      peran: 'ADMIN_UTAMA',
      statusSebelumnya: 'MENUNGGU_PEMBAYARAN',
    })
    expect(statusSalah.valid).toBe(false)
  })

  it('menolak koreksi tanpa alasan, tanpa riwayat, atau stok sudah dikembalikan', () => {
    const dasar = {
      peran: 'ADMIN_UTAMA' as const,
      orderStatus: 'SELESAI',
      stockSold: true,
      alasan: 'Alasan cukup panjang',
      statusSebelumnya: 'SUDAH_DIBAYAR',
    }
    expect(validasiKoreksiSelesai({ ...dasar, alasan: '' }).valid).toBe(false)
    expect(validasiKoreksiSelesai({ ...dasar, statusSebelumnya: null }).valid).toBe(false)
    expect(validasiKoreksiSelesai({ ...dasar, stockSold: false }).valid).toBe(false)
    expect(validasiKoreksiSelesai({ ...dasar, orderStatus: 'DIBATALKAN' }).valid).toBe(false)
  })

  it('mengambil transisi SELESAI terakhir dan menolak status tidak sah', () => {
    expect(
      statusSebelumSelesai([
        { ...riwayatSelesai('MENUNGGU_DIAMBIL')[0], createdAt: '2026-11-20T00:00:00.000Z' },
        { ...riwayatSelesai('SUDAH_DIBAYAR')[0], createdAt: '2026-11-26T00:00:00.000Z' },
      ])
    ).toBe('SUDAH_DIBAYAR')
    expect(statusSebelumSelesai(riwayatSelesai('MENUNGGU_PEMBAYARAN'))).toBeNull()
    expect(statusSebelumSelesai([])).toBeNull()
    expect(
      statusSebelumSelesai([
        {
          domain: 'PAYMENT',
          oldStatus: 'MENUNGGU_DIAMBIL',
          newStatus: 'SELESAI',
          createdAt: new Date(),
        },
      ])
    ).toBeNull()
  })

  it('validasi stok koreksi all-or-nothing dan urutan deterministik', () => {
    const buku = {
      b1: { id: 'b1', status: 'AKTIF' },
      b2: { id: 'b2', status: 'AKTIF' },
    }
    const hasil = validasiStokKoreksi(
      [
        { bookId: 'b2', quantity: 1 },
        { bookId: 'b1', quantity: 2 },
      ],
      buku
    )
    expect(hasil.valid).toBe(true)
    expect(hasil.urutanBookId).toEqual(['b1', 'b2'])

    expect(validasiStokKoreksi([{ bookId: 'b3', quantity: 1 }], buku).valid).toBe(false)
    expect(validasiStokKoreksi([], buku).valid).toBe(false)
  })
})
