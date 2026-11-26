import { describe, it, expect } from 'vitest'
import { tanggalMingguKeDate, labelStatusJadwal } from '../pesanan'
import {
  ALASAN_NO_SHOW,
  JAM_TUTUP_WIB,
  TENGGAT_TAHAN_NO_SHOW_JAM,
  batasWaktuPengambilan,
  bolehAjukanCustomer,
  bolehUsulAdmin,
  daftarTanggalMinggu,
  penilaianNoShow,
  ringkasanUsulan,
  statusSaatUsulanDibatalkan,
  statusPesananSetelahJadwalDisetujui,
  statusSetelahBatalPengajuan,
  statusSetelahSetujuAdmin,
  statusSetelahSetujuCustomer,
  statusSetelahTolakAdmin,
  statusSetelahTolakCustomer,
  sudahLewatPengambilan,
  validasiAlasan,
  validasiPenggabungan,
  validasiPerpanjangTahan,
  validasiSelesai,
  validasiStokPenyerahan,
  validasiTanggalPengambilan,
} from '../jadwal'

// Kamis, 26 November 2026 pukul 07.00 WIB.
const sekarang = new Date('2026-11-26T00:00:00.000Z')
const minggu = '2026-11-29' // Minggu, 29 November 2026 (09.00 WIB = 02.00 UTC).
const mingguBerikut = '2026-12-06'
const tanggalAktif = tanggalMingguKeDate(minggu)
const tanggalUsulan = tanggalMingguKeDate(mingguBerikut)

describe('Tahap 9 — Validasi Minggu masa depan & batas 09.00 WIB (BR-018, FR-PICK-001)', () => {
  it('jam tutup booth tetap pukul 09.00 WIB dan tidak bisa diatur', () => {
    expect(JAM_TUTUP_WIB).toBe(9)
    expect(tanggalAktif.toISOString()).toBe('2026-11-29T02:00:00.000Z')
    expect(batasWaktuPengambilan(minggu).getTime()).toBe(tanggalAktif.getTime())
  })

  it('menerima tanggal YYYY-MM-DD Minggu yang akan datang', () => {
    const hasil = validasiTanggalPengambilan(minggu, sekarang)
    expect(hasil.valid).toBe(true)
    expect(hasil.alasan).toBeNull()
    expect(hasil.tanggal?.getTime()).toBe(tanggalAktif.getTime())
  })

  it('menerima ISO yang tepat pada pukul 09.00 WIB', () => {
    const hasil = validasiTanggalPengambilan('2026-11-29T02:00:00.000Z', sekarang)
    expect(hasil.valid).toBe(true)
    expect(hasil.tanggal?.getTime()).toBe(tanggalAktif.getTime())
  })

  it('menolak jam selain 09.00 WIB', () => {
    const hasil = validasiTanggalPengambilan('2026-11-29T03:00:00.000Z', sekarang)
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toBe('Waktu pengambilan tetap pukul 09.00 WIB')
  })

  it('menolak hari selain Minggu', () => {
    const hasil = validasiTanggalPengambilan('2026-11-28', sekarang)
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toBe('Pengambilan hanya tersedia pada hari Minggu')
  })

  it('menolak Minggu yang sudah lewat', () => {
    const hasil = validasiTanggalPengambilan('2026-11-22', sekarang)
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toBe('Tanggal pengambilan harus di masa depan')
  })

  it('menolak input kosong dan tanggal rusak', () => {
    expect(validasiTanggalPengambilan('', sekarang).alasan).toBe('Tanggal pengambilan wajib diisi')
    expect(validasiTanggalPengambilan(' juni ', sekarang).valid).toBe(false)
  })

  it('batas lewat jika waktu sama dengan atau setelah pukul 09.00 WIB', () => {
    expect(sudahLewatPengambilan(minggu, new Date('2026-11-29T01:59:59.000Z'))).toBe(false)
    expect(sudahLewatPengambilan(minggu, new Date('2026-11-29T02:00:00.000Z'))).toBe(true)
    expect(sudahLewatPengambilan(minggu, new Date('2026-11-29T05:00:00.000Z'))).toBe(true)
    // Tanggal dengan jam acak tetap dinormalisasi ke 09.00 WIB hari yang sama.
    expect(batasWaktuPengambilan(new Date('2026-11-29T05:30:00.000Z')).toISOString()).toBe(
      '2026-11-29T02:00:00.000Z'
    )
  })

  it('daftar pilihan UI hanya berisi Minggu masa depan', () => {
    expect(daftarTanggalMinggu(3, sekarang)).toEqual([minggu, mingguBerikut, '2026-12-13'])
    for (const pilihan of daftarTanggalMinggu(4, sekarang)) {
      expect(validasiTanggalPengambilan(pilihan, sekarang).valid).toBe(true)
    }
  })

  it('alasan wajib minimal tiga karakter', () => {
    expect(validasiAlasan('   ').valid).toBe(false)
    expect(validasiAlasan('ab').valid).toBe(false)
    expect(validasiAlasan('Keperluan keluarga').valid).toBe(true)
    expect(validasiAlasan('', false).valid).toBe(true)
  })
})

describe('Tahap 9 — Alur setuju / tolak / usul ubah (BR-019, AC-PICK-001)', () => {
  it('admin menyetujui pengajuan atau perubahan menjadi jadwal final', () => {
    expect(statusSetelahSetujuAdmin('MENUNGGU_KONFIRMASI')).toBe('DISETUJUI')
    expect(statusSetelahSetujuAdmin('PERUBAHAN_MENUNGGU_PERSETUJUAN')).toBe('DISETUJUI')
    expect(statusSetelahSetujuAdmin('DISETUJUI')).toBeNull()
  })

  it('admin menolak pengajuan dengan alasan wajib dan meminta tanggal baru', () => {
    expect(statusSetelahTolakAdmin('MENUNGGU_KONFIRMASI')).toBe('PERLU_TANGGAL_BARU')
    expect(statusSetelahTolakAdmin('PERUBAHAN_MENUNGGU_PERSETUJUAN')).toBe('PERLU_TANGGAL_BARU')
    expect(statusSetelahTolakAdmin('DISETUJUI')).toBeNull()
    expect(validasiAlasan('').valid).toBe(false)
  })

  it('customer menyetujui atau menolak usulan admin', () => {
    expect(statusSetelahSetujuCustomer('PERUBAHAN_MENUNGGU_PERSETUJUAN')).toBe('DISETUJUI')
    expect(statusSetelahSetujuCustomer('MENUNGGU_KONFIRMASI')).toBeNull()
    expect(statusSetelahTolakCustomer('PERUBAHAN_MENUNGGU_PERSETUJUAN')).toBe('PERLU_TANGGAL_BARU')
    expect(statusSetelahTolakCustomer('DISETUJUI')).toBeNull()
  })

  it('usulan admin tidak mengubah tanggal aktif sebelum customer menyetujui', () => {
    const menunggu = ringkasanUsulan(tanggalAktif, tanggalUsulan)
    expect(menunggu.pickupStatus).toBe('PERUBAHAN_MENUNGGU_PERSETUJUAN')
    expect(menunggu.pickupSundayDate.getTime()).toBe(tanggalAktif.getTime())
    expect(menunggu.tanggalUsulan.getTime()).toBe(tanggalUsulan.getTime())
    expect(menunggu.pickupSundayDate.getTime()).not.toBe(menunggu.tanggalUsulan.getTime())
  })

  it('admin hanya boleh mengusulkan setelah pengajuan lama diputuskan', () => {
    expect(
      bolehUsulAdmin({ orderStatus: 'MENUNGGU_DIAMBIL', pickupStatus: 'DISETUJUI' }).valid
    ).toBe(true)
    expect(
      bolehUsulAdmin({ orderStatus: 'MENUNGGU_DIAMBIL', pickupStatus: 'TIDAK_HADIR' }).valid
    ).toBe(true)
    expect(
      bolehUsulAdmin({
        orderStatus: 'MENUNGGU_DIAMBIL',
        pickupStatus: 'MENUNGGU_KONFIRMASI',
      }).valid
    ).toBe(false)
    expect(bolehUsulAdmin({ orderStatus: 'SELESAI', pickupStatus: 'DISETUJUI' }).valid).toBe(false)
  })

  it('customer hanya bisa mengubah jadwal sebelum pukul 09.00 WIB hari pengambilan', () => {
    const dasar = {
      orderStatus: 'MENUNGGU_DIAMBIL',
      pickupSundayDate: tanggalAktif,
    }
    expect(
      bolehAjukanCustomer({ ...dasar, pickupStatus: 'DISETUJUI', sekarang }).valid
    ).toBe(true)
    expect(
      bolehAjukanCustomer({
        ...dasar,
        pickupStatus: 'DISETUJUI',
        sekarang: new Date('2026-11-29T02:00:00.000Z'),
      }).valid
    ).toBe(false)
    // Setelah no-show, customer masih boleh menjadwalkan ulang.
    expect(
      bolehAjukanCustomer({ ...dasar, pickupStatus: 'TIDAK_HADIR', sekarang }).valid
    ).toBe(true)
    expect(
      bolehAjukanCustomer({ ...dasar, pickupStatus: 'DISETUJUI', orderStatus: 'SELESAI', sekarang }).valid
    ).toBe(false)
  })

  it('OD-01: jadwal disetujui setelah pembayaran final mengangkat status ke Menunggu Diambil', () => {
    const lunas = {
      orderStatus: 'SUDAH_DIBAYAR',
      paymentProofStatus: 'TERVERIFIKASI',
      paymentReviewStatus: 'DISETUJUI',
    }
    expect(statusPesananSetelahJadwalDisetujui(lunas)).toBe('MENUNGGU_DIAMBIL')
    expect(statusPesananSetelahJadwalDisetujui({ ...lunas, orderStatus: 'MENUNGGU_PEMBAYARAN' })).toBeNull()
    expect(statusPesananSetelahJadwalDisetujui({ ...lunas, paymentProofStatus: 'MENUNGGU_VERIFIKASI' })).toBeNull()
    expect(statusPesananSetelahJadwalDisetujui({ ...lunas, paymentReviewStatus: 'MENUNGGU_PUTUSAN_UTAMA' })).toBeNull()
  })

  it('pembatalan pengajuan mengembalikan status yang benar-benar tercatat', () => {
    expect(statusSetelahBatalPengajuan('MENUNGGU_KONFIRMASI')).toBe('PERLU_TANGGAL_BARU')
    expect(statusSetelahBatalPengajuan('DISETUJUI')).toBeNull()
    expect(statusSaatUsulanDibatalkan('TIDAK_HADIR')).toBe('TIDAK_HADIR')
    expect(statusSaatUsulanDibatalkan('DISETUJUI')).toBe('DISETUJUI')
    expect(statusSaatUsulanDibatalkan(null)).toBe('DISETUJUI')
    expect(labelStatusJadwal('TIDAK_HADIR')).toBe('Tidak Hadir (No-Show)')
  })
})

describe('Tahap 9 — Gabung jadwal tanpa menyatukan status pembayaran (FR-PICK-002)', () => {
  const orders = [
    {
      id: 'order-1',
      customerId: 'customer-1',
      orderStatus: 'MENUNGGU_DIAMBIL',
      pickupSundayDate: tanggalAktif,
      pickupGroupId: null,
    },
    {
      id: 'order-2',
      customerId: 'customer-1',
      orderStatus: 'SUDAH_DIBAYAR',
      pickupSundayDate: tanggalAktif,
      pickupGroupId: null,
    },
  ]

  it('menyamakan jadwal dan grup, bukan status/nominal/riwayat tiap pesanan', () => {
    const hasil = validasiPenggabungan(
      orders as any,
      'customer-1',
      tanggalUsulan,
      'grup-jadwal-1',
      sekarang
    )
    expect(hasil.valid).toBe(true)
    expect(hasil.pembaruan).toHaveLength(2)
    for (const pembaruan of hasil.pembaruan) {
      expect(pembaruan.pickupSundayDate.getTime()).toBe(tanggalUsulan.getTime())
      expect(pembaruan.pickupGroupId).toBe('grup-jadwal-1')
      expect(pembaruan.pickupStatus).toBe('MENUNGGU_KONFIRMASI')
      // Tidak ada field pembayaran/nominal/riwayat yang ikut disatukan.
      expect(Object.keys(pembaruan).sort()).toEqual([
        'id',
        'pickupGroupId',
        'pickupStatus',
        'pickupSundayDate',
      ])
    }
    expect(orders[0].orderStatus).toBe('MENUNGGU_DIAMBIL')
    expect(orders[1].orderStatus).toBe('SUDAH_DIBAYAR')
  })

  it('menolak pesanan milik customer lain, duplikat, dan pesanan selesai', () => {
    expect(
      validasiPenggabungan(orders, 'customer-lain', tanggalUsulan, 'grup', sekarang).valid
    ).toBe(false)
    expect(
      validasiPenggabungan([orders[0], orders[0]], 'customer-1', tanggalUsulan, 'grup', sekarang).valid
    ).toBe(false)
    expect(
      validasiPenggabungan(
        [orders[0], { ...orders[1], orderStatus: 'SELESAI' }],
        'customer-1',
        tanggalUsulan,
        'grup',
        sekarang
      ).valid
    ).toBe(false)
    expect(validasiPenggabungan([orders[0]], 'customer-1', tanggalUsulan, 'grup', sekarang).valid).toBe(
      false
    )
    expect(validasiPenggabungan(orders, 'customer-1', tanggalUsulan, '', sekarang).valid).toBe(false)
  })
})

describe('Tahap 9 — No-show tanpa auto-cancel (BR-019)', () => {
  const dasar = {
    pickupStatus: 'DISETUJUI' as const,
    orderStatus: 'MENUNGGU_DIAMBIL',
    stockSold: false,
    pickupSundayDate: tanggalAktif,
    sudahDicatat: false,
  }

  it('menandai no-show tepat setelah pukul 09.00 WIB dan menahan buku 24 jam', () => {
    const lewat = new Date('2026-11-29T02:00:01.000Z')
    const hasil = penilaianNoShow({ ...dasar, sekarang: lewat })
    expect(hasil.harus).toBe(true)
    expect(hasil.alasan).toBe(ALASAN_NO_SHOW)
    expect(hasil.batasTahan?.getTime()).toBe(lewat.getTime() + TENGGAT_TAHAN_NO_SHOW_JAM * 3600_000)
    // Tidak ada field pembatalan: no-show tidak memicu auto-cancel.
    expect(Object.keys(hasil).sort()).toEqual(['alasan', 'batasTahan', 'harus'])
  })

  it('tidak menandai sebelum jam tutup, jika sudah selesai, atau sudah dicatat', () => {
    expect(penilaianNoShow({ ...dasar, sekarang: new Date('2026-11-29T01:59:59.000Z') }).harus).toBe(
      false
    )
    // Tepat pukul 09.00 WIB masih batas tutup; no-show baru setelahnya.
    expect(penilaianNoShow({ ...dasar, sekarang: new Date('2026-11-29T02:00:00.000Z') }).harus).toBe(
      false
    )
    expect(penilaianNoShow({ ...dasar, sekarang: new Date('2026-11-29T02:00:01.000Z'), sudahDicatat: true }).harus).toBe(false)
    expect(penilaianNoShow({ ...dasar, sekarang: new Date('2026-11-29T02:00:01.000Z'), stockSold: true }).harus).toBe(false)
    expect(penilaianNoShow({ ...dasar, sekarang: new Date('2026-11-29T02:00:01.000Z'), orderStatus: 'SELESAI' }).harus).toBe(false)
    expect(
      penilaianNoShow({
        ...dasar,
        sekarang: new Date('2026-11-29T02:00:01.000Z'),
        pickupStatus: 'TIDAK_HADIR',
      }).harus
    ).toBe(false)
  })

  it('perpanjangan penahanan butuh alasan dan tenggat masa depan', () => {
    const args = {
      alasan: 'Customer meminta penangguhan',
      tenggatBaru: new Date('2026-12-02T02:00:00.000Z').toISOString(),
      sekarang: new Date('2026-11-29T03:00:00.000Z'),
    }
    const hasil = validasiPerpanjangTahan(args)
    expect(hasil.valid).toBe(true)
    expect(hasil.tanggal?.toISOString()).toBe(args.tenggatBaru)
    expect(validasiPerpanjangTahan({ ...args, alasan: '' }).valid).toBe(false)
    expect(
      validasiPerpanjangTahan({
        ...args,
        tenggatBaru: new Date('2026-11-28T02:00:00.000Z').toISOString(),
      }).valid
    ).toBe(false)
  })
})

describe('Tahap 9 — Transisi Selesai atomik saat serah terima fisik (FR-DONE-001)', () => {
  const dasar = {
    orderStatus: 'MENUNGGU_DIAMBIL',
    paymentProofStatus: 'TERVERIFIKASI',
    stockSold: false,
  }

  it('tombol Selesai hanya aktif untuk pesanan terverifikasi yang belum dikurangi stoknya', () => {
    expect(validasiSelesai(dasar).valid).toBe(true)
    expect(validasiSelesai({ ...dasar, orderStatus: 'SUDAH_DIBAYAR' }).valid).toBe(true)
    expect(validasiSelesai({ ...dasar, paymentProofStatus: 'MENUNGGU_VERIFIKASI' }).valid).toBe(false)
    expect(validasiSelesai({ ...dasar, stockSold: true }).valid).toBe(false)
    expect(validasiSelesai({ ...dasar, orderStatus: 'MENUNGGU_PEMBAYARAN' }).valid).toBe(false)
    expect(validasiSelesai({ ...dasar, orderStatus: 'SELESAI' }).valid).toBe(false)
  })

  it('validasi stok bersifat all-or-nothing sebelum penurunan apa pun', () => {
    const items = [
      { bookId: 'buku-1', quantity: 2 },
      { bookId: 'buku-2', quantity: 1 },
    ]
    const stokCukup = {
      'buku-1': { stockTotal: 5, stockReserved: 3 },
      'buku-2': { stockTotal: 4, stockReserved: 2 },
    }
    expect(validasiStokPenyerahan(items, stokCukup).valid).toBe(true)

    const stokKurang = {
      ...stokCukup,
      'buku-2': { stockTotal: 4, stockReserved: 0 },
    }
    const gagal = validasiStokPenyerahan(items, stokKurang, { 'buku-2': 'Buku Kedua' })
    expect(gagal.valid).toBe(false)
    expect(gagal.judulTidakCukup).toEqual(['Buku Kedua'])

    expect(validasiStokPenyerahan([], stokCukup).valid).toBe(false)
    expect(
      validasiStokPenyerahan(items, { 'buku-1': stokCukup['buku-1'] }).valid
    ).toBe(false)
    expect(
      validasiStokPenyerahan([{ bookId: 'buku-1', quantity: 0 }], stokCukup).valid
    ).toBe(false)
  })
})
