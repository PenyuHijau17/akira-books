import { describe, expect, it } from 'vitest'
import { susunUtasInbox } from '@/lib/inboxNotifikasi'
import { saringNotifikasiUntukPeran } from '@/lib/notifikasiServer'
import type { NotifikasiItem } from '@/lib/notifikasi'

const ID_PESANAN = 'f85c0111-5bfc-42ef-b780-d9ada30cc60b'
const ID_PESANAN_LAIN = 'fcb9f353-b812-4fe4-8d70-5a5c90d658c5'
const NOMOR = 'AKB-20261128-194725'

function notifikasi(
  id: string,
  message: string,
  createdAt: string,
  opsi: Partial<NotifikasiItem> = {}
): NotifikasiItem {
  return {
    id,
    message,
    createdAt,
    isRead: false,
    kategori: 'PEMBAYARAN',
    entitasId: ID_PESANAN,
    groupKey: `bukti:diunggah:${id}`,
    ...opsi,
  }
}

const pesanan = [
  { id: ID_PESANAN, orderNumber: NOMOR, customerId: 'pelanggan-1' },
  { id: ID_PESANAN_LAIN, orderNumber: 'AKB-20261128-343606', customerId: 'pelanggan-2' },
]

const pengguna = [
  { id: 'pelanggan-1', name: 'Nadia Putri', avatarUrl: '/uploads/avatars/nadia.jpg' },
  { id: 'pelanggan-2', name: 'Rizky Ananda', avatarUrl: null },
]

describe('Kotak Masuk — pengelompokan dan urutan pesan', () => {
  it('Admin: pesanan dikelompokkan per pelanggan, sistem tetap terpisah', () => {
    const utas = susunUtasInbox({
      daftar: [
        notifikasi('n3', `Bukti pembayaran ${NOMOR} menunggu verifikasi.`, '2026-11-29T10:00:00Z'),
        notifikasi('n1', 'Pesanan dibuat.', '2026-11-28T10:00:00Z'),
        notifikasi(
          'n2',
          'Pengiriman email gagal berulang (3/3 percobaan). Kunci pengiriman: abc.',
          '2026-11-29T09:00:00Z',
          { kategori: 'SISTEM', groupKey: 'outbox:gagal:abc', entitasId: null }
        ),
      ],
      peran: 'ADMIN_BIASA',
      pesanan,
      pengguna,
    })

    expect(utas.map((u) => u.judul)).toEqual(['Nadia Putri', 'Sistem Toko'])
    const pelanggan = utas[0]
    expect(pelanggan.jenis).toBe('PELANGGAN')
    expect(pelanggan.kodePesanan).toBe(NOMOR)
    expect(pelanggan.avatarUrl).toBe('/uploads/avatars/nadia.jpg')
    expect(pelanggan.jumlah).toBe(2)
    expect(pelanggan.belumDibaca).toBe(2)
    expect(pelanggan.pesan.map((p) => p.id)).toEqual(['n1', 'n3'])
    expect(pelanggan.cuplikan).toContain(NOMOR)
    expect(utas[1].judul).toBe('Sistem Toko')
    expect(utas[1].pesan).toHaveLength(1)
  })

  it('Customer: pesanan dikelompokkan per pesanan, sistem menjadi Info Toko', () => {
    const utas = susunUtasInbox({
      daftar: [
        notifikasi('n1', 'Pembayaran dikonfirmasi.', '2026-11-28T10:00:00Z'),
        notifikasi(
          'n2',
          'Pengingat pembayaran mendekati tenggat.',
          '2026-11-28T11:00:00Z',
          { entitasId: ID_PESANAN_LAIN }
        ),
        notifikasi('n3', 'Pemberitahuan otomatis dicatat.', '2026-11-29T07:00:00Z', {
          kategori: 'SISTEM',
          groupKey: 'outbox:gagal:xyz',
          entitasId: null,
        }),
      ],
      peran: 'CUSTOMER',
      pesanan,
      pengguna,
    })

    expect(utas).toHaveLength(3)
    const [terbaru, , infoToko] = utas
    expect(terbaru.judul).toBe('Info Toko')
    expect(terbaru.jenis).toBe('UMUM')
    expect(infoToko.judul).toBe('Pesanan ' + NOMOR)
    expect(infoToko.jenis).toBe('PESANAN')
    expect(infoToko.avatarUrl).toBe('/uploads/avatars/nadia.jpg')
  })

  it('Tautan detail hanya dibuat untuk pesanan yang cocok; verifikasi bayar untuk admin', () => {
    const daftar = [
      notifikasi('n1', `Bukti pembayaran ${NOMOR} menunggu verifikasi.`, '2026-11-29T10:00:00Z'),
      notifikasi('n2', 'Toko libur hari ini.', '2026-11-29T11:00:00Z', {
        kategori: 'UMUM',
        entitasId: null,
        groupKey: 'toko:libur',
      }),
      notifikasi(
        'n4',
        'Bukti pembayaran perlu verifikasi.',
        '2026-11-29T12:00:00Z',
        {
          kategori: 'PEMBAYARAN',
          entitasId: null,
          groupKey: 'bukti:diunggah:tidak-dikenal',
        }
      ),
    ]

    const admin = susunUtasInbox({
      daftar,
      peran: 'ADMIN_UTAMA',
      pesanan,
      pengguna,
    })
    const denganPesanan = admin.find((u) => u.jenis === 'PELANGGAN')!
    const tanpaPesanan = admin.find((u) => u.jenis === 'SISTEM')!

    expect(denganPesanan.pesan[0].tautan).toBe(`/pesanan/${ID_PESANAN}`)
    expect(denganPesanan.pesan[0].labelTautan).toBe('Lihat Detail Pesanan')
    expect(tanpaPesanan.pesan[0].tautan).toBeNull()
    const verifikasi = tanpaPesanan.pesan.find((p) => p.id === 'n4')!
    expect(verifikasi.tautan).toBe('/admin/pembayaran')
    expect(verifikasi.labelTautan).toBe('Buka Verifikasi Bayar')

    const customer = susunUtasInbox({ daftar, peran: 'CUSTOMER', pesanan, pengguna })
    const pesananCustomer = customer.find((u) => u.jenis === 'PESANAN')!
    const infoCustomer = customer.find((u) => u.jenis === 'UMUM')!
    expect(pesananCustomer.pesan[0].tautan).toBe(`/pesanan/${ID_PESANAN}`)
    expect(pesananCustomer.pesan[0].labelTautan).toBe('Lihat Detail Pesanan')
    expect(infoCustomer.pesan.every((p) => p.tautan === null)).toBe(true)
  })
})

describe('Kotak Masuk — isolasi dan kerahasiaan', () => {
  it('Tidak membawa metadata atau field keuangan ke dalam utas', () => {
    const mentah = [
      {
        ...notifikasi('n1', 'Ada perubahan harga.', '2026-11-29T10:00:00Z'),
        metadata: { costPrice: 5000, laba: 2000, snapshotCostPrice: 4500 },
      },
    ]
    const utas = susunUtasInbox({
      daftar: mentah as any,
      peran: 'ADMIN_BIASA',
      pesanan,
      pengguna,
    })
    const JSONUtas = JSON.stringify(utas)
    expect(JSONUtas).not.toContain('costPrice')
    expect(JSONUtas).not.toContain('snapshotCostPrice')
    expect(JSONUtas).not.toContain('metadata')

    const saring = saringNotifikasiUntukPeran({ utas }, 'ADMIN_BIASA')
    expect(JSON.stringify(saring)).not.toContain('laba')
  })

  it('Inisial tetap tersedia saat foto profil kosong', () => {
    const utas = susunUtasInbox({
      daftar: [
        notifikasi('n1', 'Pesanan dibuat.', '2026-11-28T10:00:00Z', {
          entitasId: ID_PESANAN_LAIN,
        }),
      ],
      peran: 'ADMIN_BIASA',
      pesanan,
      pengguna,
    })
    expect(utas[0].avatarUrl).toBeNull()
    expect(utas[0].inisial).toBe('RA')
  })
})
