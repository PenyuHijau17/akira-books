import { describe, expect, it } from 'vitest'
import {
  aksiKartuNotifikasi,
  filterJenisKartu,
  judulKartuNotifikasi,
  kelompokkanNotifikasiMenjadiKartu,
  labelJenisKartu,
} from '@/lib/notifikasiKartu'
import type { NotifikasiItem } from '@/lib/notifikasi'

const idPesanan = 'f85c0111-5bfc-42ef-b780-d9ada30cc60b'
const idPelanggan = '3f8fc77b-8479-4fe5-8512-d126cde0f313'
const nomorPesanan = 'AKB-20261128-194725'
const pesanan = [{ id: idPesanan, orderNumber: nomorPesanan, customerId: idPelanggan }]
const pengguna = [{ id: idPelanggan, name: 'Pelanggan Uji', avatarUrl: null }]

const item = (
  id: string,
  createdAt: string,
  tambahan: Partial<NotifikasiItem> = {}
): NotifikasiItem => ({
  id,
  message: 'Pemberitahuan pesanan.',
  createdAt,
  isRead: false,
  ...tambahan,
})

function pengingatJadwal(index: number): NotifikasiItem {
  return item(`jadwal-${index}`, `2026-11-28T01:00:0${index}.000Z`, {
    kategori: 'JADWAL',
    entitasId: idPesanan,
    groupKey: `pengingat:PENGINGAT_JADWAL:${idPesanan}:6:penerima-${index}`,
    message: `Pengingat: jadwal pesanan ${nomorPesanan} masih menunggu keputusan.`,
  })
}

function gagalOutbox(index: number): NotifikasiItem {
  return item(`outbox-${index}`, `2026-11-28T02:00:0${index % 10}.000Z`, {
    kategori: 'SISTEM',
    groupKey: `outbox:gagal:uji-outbox-gagal-${index}`,
    message:
      'Pengiriman email gagal berulang (3/3 percobaan) untuk pemberitahuan ' +
      `"Pengingat pembayaran pesanan ${nomorPesanan}". Perlu tindak lanjut Admin Utama.`,
  })
}

describe('Kartu notifikasi — ringkas dan mudah dipindai', () => {
  const daftar = [
    ...Array.from({ length: 3 }, (_, i) => pengingatJadwal(i)),
    ...Array.from({ length: 17 }, (_, i) => gagalOutbox(i)),
  ]

  it('menggabungkan puluhan pengulangan menjadi kartu tunggal', () => {
    const kartu = kelompokkanNotifikasiMenjadiKartu(daftar, {
      userId: idPelanggan,
      peran: 'ADMIN_UTAMA',
      pesanan,
      pengguna,
    })

    expect(kartu).toHaveLength(2)
    const jadwal = kartu.find((k) => k.judul === 'Jadwal Pengambilan')
    const sistem = kartu.find((k) => k.judul === 'Peringatan Email Sistem')

    expect(jadwal?.kunci).toBe(`pengingat:PENGINGAT_JADWAL:${idPesanan}`)
    expect(jadwal?.ids).toHaveLength(3)
    expect(jadwal?.kodePesanan).toBe(nomorPesanan)
    expect(jadwal?.kode).toBe(nomorPesanan)
    expect(jadwal?.labelJenis).toBe('JADWAL')
    expect(jadwal?.filterJenis).toBe('jadwal')
    expect(jadwal?.namaPelanggan).toBe('Pelanggan Uji')
    expect(jadwal?.waktuTerbaru).toBe('2026-11-28T01:00:02.000Z')
    expect(sistem?.kunci).toBe('outbox:gagal:EMAIL')
    expect(sistem?.ids).toHaveLength(17)
    expect(sistem?.ringkasan).not.toContain('uji-outbox-gagal-')
    expect(sistem?.tautan).toBe('/admin/notifikasi')
    expect(sistem?.labelTautan).toBe('Buka Peringatan Notifikasi')
    expect(sistem?.labelJenis).toBe('SISTEM')
    expect(sistem?.filterJenis).toBe('sistem')
  })

  it('memberi aksi detail pesanan kepada Customer', () => {
    const kartu = kelompokkanNotifikasiMenjadiKartu([pengingatJadwal(0)], {
      userId: idPelanggan,
      peran: 'CUSTOMER',
      pesanan,
      pengguna,
    })[0]

    expect(kartu.tautan).toBe(`/pesanan/${idPesanan}`)
    expect(kartu.labelTautan).toBe('Lihat Detail Pesanan')
  })

  it('tidak memberi tautan admin kepada Customer untuk peringatan email', () => {
    const kartu = kelompokkanNotifikasiMenjadiKartu([gagalOutbox(0)], {
      userId: idPelanggan,
      peran: 'CUSTOMER',
      pesanan,
      pengguna,
    })[0]

    expect(kartu.tautan).toBeNull()
    expect(kartu.labelTautan).toBeNull()
  })

  it('membedakan pembayaran dan jadwal pada pesanan yang sama', () => {
    const bukti = item('bukti-1', '2026-11-28T01:30:00.000Z', {
      kategori: 'PEMBAYARAN',
      groupKey: `bukti:diunggah:${idPesanan}:penerima-1`,
      message: `Bukti pembayaran pesanan ${nomorPesanan} belum diperiksa.`,
    })
    const kartu = kelompokkanNotifikasiMenjadiKartu([pengingatJadwal(0), bukti], {
      userId: idPelanggan,
      peran: 'ADMIN_BIASA',
      pesanan,
      pengguna,
    })

    expect(kartu).toHaveLength(2)
    expect(kartu.map((k) => k.judul)).toEqual([
      'Verifikasi Pembayaran',
      'Jadwal Pengambilan',
    ])
    expect(kartu.map((k) => k.labelTautan)).toEqual([
      'Proses Pembayaran',
      'Proses Jadwal',
    ])
  })

  it('menggabungkan usul dan keputusan koreksi harga menjadi satu kartu', () => {
    const idKoreksi = 'aaaaaaaa-1111-2222-3333-444444444444'
    const usul = item('koreksi-usul', '2026-11-28T03:00:00.000Z', {
      kategori: 'PENJUALAN',
      groupKey: `koreksi-offline:usul:${idKoreksi}`,
      message:
        'Usul koreksi harga penjualan offline menunggu persetujuan Admin Utama ' +
        '(Buku Uji): 100000 → 120000. Alasan: harga salah.',
    })
    const keputusan = item('koreksi-keputusan', '2026-11-28T04:00:00.000Z', {
      kategori: 'PENJUALAN',
      groupKey: `koreksi-offline:keputusan:${idKoreksi}:1234567890`,
      message:
        'Koreksi harga penjualan offline disetujui Admin Utama. Harga yang berlaku: 120000.',
    })

    const kartu = kelompokkanNotifikasiMenjadiKartu([usul, keputusan], {
      userId: idPelanggan,
      peran: 'ADMIN_UTAMA',
    })

    expect(kartu).toHaveLength(1)
    expect(kartu[0].judul).toBe('Koreksi Harga Offline')
    expect(kartu[0].kunci).toBe(`koreksi-offline:KOREKSI_OFFLINE:${idKoreksi}`)
    expect(kartu[0].ids).toHaveLength(2)
    expect(kartu[0].ringkasan).toContain('disetujui')
    expect(kartu[0].kode).toBe('Buku Uji')
    expect(kartu[0].tautan).toBe('/admin/penjualan-offline')
    expect(kartu[0].labelTautan).toBe('Buka Penjualan Offline')
    expect(kartu[0].labelJenis).toBe('KOREKSI HARGA')
    expect(kartu[0].filterJenis).toBe('pembayaran')
    expect(JSON.stringify(kartu[0])).not.toContain('100000')
  })

  it('tidak membawa field finansial ke dalam kartu', () => {
    const mentah = {
      ...pengingatJadwal(0),
      costPrice: 125000,
      laba: 75000,
      metadata: { modal: 125000 },
    } as NotifikasiItem & { costPrice: number; laba: number; metadata: any }

    const kartu = kelompokkanNotifikasiMenjadiKartu([mentah], {
      userId: idPelanggan,
      peran: 'ADMIN_BIASA',
    })[0]
    const json = JSON.stringify(kartu)

    expect(json).not.toContain('costPrice')
    expect(json).not.toContain('laba')
    expect(json).not.toContain('modal')
    expect(json).not.toContain('metadata')
    expect(kartu.belumDibaca).toBe(true)
  })
})

describe('Kartu notifikasi — label badge dan filter jenis', () => {
  it('memetakan setiap judul ke label huruf kapital yang diminta', () => {
    expect(labelJenisKartu('Pemesanan Baru')).toBe('PEMESANAN')
    expect(labelJenisKartu('Verifikasi Pembayaran')).toBe('PEMBAYARAN')
    expect(labelJenisKartu('Jadwal Pengambilan')).toBe('JADWAL')
    expect(labelJenisKartu('Pembatalan Pesanan')).toBe('PEMBATALAN')
    expect(labelJenisKartu('Pengembalian Dana')).toBe('REFUND')
    expect(labelJenisKartu('Koreksi Harga Offline')).toBe('KOREKSI HARGA')
    expect(labelJenisKartu('Peringatan Email Sistem')).toBe('SISTEM')
  })

  it('memetakan label ke enam pilihan filter Jenis', () => {
    expect(filterJenisKartu('PEMESANAN')).toBe('pemesanan')
    expect(filterJenisKartu('PEMBAYARAN')).toBe('pembayaran')
    expect(filterJenisKartu('KOREKSI HARGA')).toBe('pembayaran')
    expect(filterJenisKartu('JADWAL')).toBe('jadwal')
    expect(filterJenisKartu('PEMBATALAN')).toBe('pembatalan-refund')
    expect(filterJenisKartu('REFUND')).toBe('pembatalan-refund')
    expect(filterJenisKartu('SISTEM')).toBe('sistem')
  })
})

describe('Kartu notifikasi — judul jenis dan aksi utama', () => {
  it('memetakan jenis ke judul yang jelas', () => {
    expect(judulKartuNotifikasi('PEMBAYARAN_PUTUSAN_MENUNGGU', 'PEMBAYARAN')).toBe(
      'Verifikasi Pembayaran'
    )
    expect(judulKartuNotifikasi('PEMBATALAN', 'PESANAN')).toBe('Pembatalan Pesanan')
    expect(judulKartuNotifikasi('REFUND_PENGAJUAN', 'PEMBAYARAN')).toBe(
      'Pengembalian Dana'
    )
    expect(judulKartuNotifikasi('PESANAN_DIBUAT', 'PESANAN')).toBe('Pemesanan Baru')
    expect(judulKartuNotifikasi('KOREKSI_OFFLINE', 'PENJUALAN')).toBe(
      'Koreksi Harga Offline'
    )
    expect(judulKartuNotifikasi('OUTBOX_GAGAL', 'SISTEM')).toBe(
      'Peringatan Email Sistem'
    )
  })

  it('memetakan aksi admin sesuai jenis notifikasi', () => {
    const dasar = { peran: 'ADMIN_BIASA' as const, tautanPesanan: null }
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'BUKTI_DIUNGGAH', kategori: 'PEMBAYARAN' })).toEqual({
      tautan: '/admin/pembayaran',
      labelTautan: 'Proses Pembayaran',
    })
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'JADWAL_BARU', kategori: 'JADWAL' })).toEqual({
      tautan: '/admin/jadwal',
      labelTautan: 'Proses Jadwal',
    })
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'PEMBATALAN', kategori: 'PESANAN' })).toEqual({
      tautan: '/admin/pembatalan',
      labelTautan: 'Tinjau Pembatalan',
    })
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'REFUND_KEPUTUSAN', kategori: 'PEMBAYARAN' })).toEqual({
      tautan: '/admin/refund',
      labelTautan: 'Proses Refund',
    })
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'PESANAN_DIBUAT', kategori: 'PESANAN' })).toEqual({
      tautan: '/admin/pembayaran',
      labelTautan: 'Proses Pembayaran',
    })
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'KOREKSI_OFFLINE', kategori: 'PENJUALAN' })).toEqual({
      tautan: '/admin/penjualan-offline',
      labelTautan: 'Buka Penjualan Offline',
    })
    expect(aksiKartuNotifikasi({ ...dasar, jenis: 'OUTBOX_GAGAL', kategori: 'SISTEM' })).toEqual({
      tautan: '/admin/notifikasi',
      labelTautan: 'Buka Peringatan Notifikasi',
    })
  })
})
