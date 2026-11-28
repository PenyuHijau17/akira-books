import { describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import { simpanNotifikasiBaku } from '@/lib/notifikasiPenyimpanan'
import {
  daftarAkunNotifikasi,
  daftarNotifikasiPengguna,
  daftarUserIdNotifikasiYatim,
  tandaiNotifikasiDibaca,
} from '@/lib/notifikasiServer'

/**
 * Level 1 inbox Admin: daftar akun + kelompok Sistem Toko.
 * Database nyata dipakai agar hitungan belum dibaca dan isolasi peran teruji (GR-02/GR-03).
 */
describe('Daftar akun notifikasi Admin', () => {
  it('menampilkan ringkasan per akun dan memisahkan notifikasi sistem', async () => {
    const db = prisma()
    const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const admin = await db.user.create({
      data: {
        email: `notif-akun-admin-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Admin Uji Akun',
        role: 'ADMIN_UTAMA',
      },
    })
    const pelanggan = await db.user.create({
      data: {
        email: `notif-akun-customer-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Pelanggan Akun',
        role: 'CUSTOMER',
      },
    })

    try {
      await simpanNotifikasiBaku({
        userId: pelanggan.id,
        groupKey: 'pesanan:f85c0111-5bfc-42ef-b780-d9ada30cc60b:dibuat',
        message: 'Pesanan AKB-20261128-194725 berhasil dibuat.',
        kategori: 'PESANAN',
        client: db,
      })
      await simpanNotifikasiBaku({
        userId: pelanggan.id,
        groupKey: 'outbox:gagal:EMAIL',
        message: 'Pengiriman email gagal berulang.',
        kategori: 'SISTEM',
        kanal: 'EMAIL',
        client: db,
      })

      const hasil = await daftarAkunNotifikasi({ peran: 'ADMIN_UTAMA', client: db })
      const akunPelanggan = hasil.akun.find((akun) => akun.id === pelanggan.id)
      const sistem = hasil.akun.find((akun) => akun.id === '__sistem__')

      expect(akunPelanggan?.nama).toBe('Pelanggan Akun')
      expect(akunPelanggan?.belumDibaca).toBe(1)
      expect(akunPelanggan?.total).toBe(1)
      expect(akunPelanggan?.cuplikan).toContain('Pesanan')
      expect(akunPelanggan?.peran).toBe('CUSTOMER')

      expect(sistem?.nama).toBe('Sistem Toko')
      expect(sistem?.sistem).toBe(true)
      expect(sistem?.belumDibaca).toBeGreaterThanOrEqual(1)
      expect(sistem?.cuplikan).toContain('email')

      // Customer tidak boleh melihat daftar akun sama sekali (GR-02).
      expect((await daftarAkunNotifikasi({ peran: 'CUSTOMER', client: db })).akun).toHaveLength(0)

      // Panel Sistem Toko mengabaikan userId dan menampilkan semua notifikasi sistem.
      const panelSistem = await daftarNotifikasiPengguna({
        userId: admin.id,
        peran: 'ADMIN_UTAMA',
        sistemSaja: true,
        client: db,
      })
      expect(panelSistem.belumDibaca).toBeGreaterThanOrEqual(1)
      expect(
        panelSistem.kartu.some((kartu) => kartu.labelJenis === 'SISTEM')
      ).toBe(true)
      expect(panelSistem.kartu.every((kartu) => kartu.filterJenis === 'sistem')).toBe(true)

      const barisSistem = await db.notification.findFirst({
        where: { userId: pelanggan.id, groupKey: 'outbox:gagal:EMAIL' },
        select: { id: true },
      })
      const berubah = await tandaiNotifikasiDibaca({
        userId: admin.id,
        ids: [String(barisSistem?.id)],
        sistemSaja: true,
        client: db,
      })
      expect(berubah).toBe(1)
    } finally {
      await db.notification.deleteMany({
        where: { userId: { in: [admin.id, pelanggan.id] } },
      })
      await db.user.deleteMany({ where: { id: { in: [admin.id, pelanggan.id] } } })
    }
  }, 60000)

  it('tidak membuat kartu akun yatim dan menggabungkannya ke Sistem Toko', async () => {
    const db = prisma()
    const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const admin = await db.user.create({
      data: {
        email: `notif-yatim-admin-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Admin Uji Yatim',
        role: 'ADMIN_UTAMA',
      },
    })
    const yatim = await db.user.create({
      data: {
        email: `notif-yatim-hapus-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Akun Akan Dihapus',
        role: 'CUSTOMER',
      },
    })
    const tanpaNama = await db.user.create({
      data: {
        email: `notif-yatim-kosong-${unik}@example.test`,
        passwordHash: 'x',
        name: '',
        role: 'CUSTOMER',
      },
    })
    const kunciYatim = 'koreksi-offline:KOREKSI_OFFLINE:aaaaaaaa-1111-2222-3333-444444444444'
    const pesan = 'Usul koreksi harga penjualan offline menunggu persetujuan Admin Utama (Buku Uji)'

    try {
      await simpanNotifikasiBaku({
        userId: yatim.id,
        groupKey: kunciYatim,
        message: pesan,
        kategori: 'PENJUALAN',
        client: db,
      })
      await simpanNotifikasiBaku({
        userId: tanpaNama.id,
        groupKey: 'koreksi-offline:KOREKSI_OFFLINE:bbbbbbbb-1111-2222-3333-444444444444',
        message: pesan,
        kategori: 'PENJUALAN',
        client: db,
      })
      // Simulasikan sisa pengujian: akun dihapus, notifikasinya tertinggal.
      await db.user.delete({ where: { id: yatim.id } })

      const daftarYatim = await daftarUserIdNotifikasiYatim(db)
      expect(daftarYatim).toContain(yatim.id)
      expect(daftarYatim).toContain(tanpaNama.id)

      const hasil = await daftarAkunNotifikasi({ peran: 'ADMIN_UTAMA', client: db })
      expect(hasil.akun.some((akun) => akun.id === yatim.id)).toBe(false)
      expect(hasil.akun.some((akun) => akun.id === tanpaNama.id)).toBe(false)
      expect(hasil.akun.some((akun) => akun.nama === 'Akun tanpa nama')).toBe(false)
      expect(hasil.akun.find((akun) => akun.id === '__sistem__')?.total).toBeGreaterThanOrEqual(2)

      const panel = await daftarNotifikasiPengguna({
        userId: admin.id,
        peran: 'ADMIN_UTAMA',
        sistemSaja: true,
        sistemUserIds: daftarYatim,
        client: db,
      })
      expect(panel.kartu.some((kartu) => kartu.kunci === kunciYatim)).toBe(true)
    } finally {
      await db.notification.deleteMany({
        where: { userId: { in: [yatim.id, tanpaNama.id, admin.id] } },
      })
      await db.user.deleteMany({ where: { id: { in: [tanpaNama.id, admin.id] } } })
    }
  }, 60000)
})
