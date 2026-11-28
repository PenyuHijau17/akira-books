// src/lib/notifikasiPenyimpanan.ts
// Satu titik tulis notifikasi: menimpa baris lama dengan kunci kanonik yang sama.
// GR-02/GR-03: userId selalu berasal dari server; tidak ada data modal/laba.

import prisma from '@/lib/prisma'
import {
  bersihkanPesanNotifikasi,
  kunciBakuNotifikasi,
} from '@/lib/notifikasiKunci'

type Klien = any

export type SimpanNotifikasiArgs = {
  userId: string
  groupKey: string
  message: string
  kategori?: string | null
  entitasId?: string | null
  metadata?: any
  kanal?: string | null
  client?: Klien
}

/**
 * Simpan notifikasi terbaru untuk satu jenis & konteks. Baris lama (termasuk
 * duplikat yang sudah terlanjur ada) dihapus, sehingga hanya satu baris yang
 * tersisa. Kunci unik (userId, groupKey) di database tetap dipakai.
 */
export async function simpanNotifikasiBaku(args: SimpanNotifikasiArgs) {
  const client = args.client ?? prisma()
  const baku = kunciBakuNotifikasi({
    groupKey: args.groupKey,
    kategori: args.kategori,
    entitasId: args.entitasId,
    message: args.message,
    userId: args.userId,
    kanal: args.kanal,
  })
  const pesan = bersihkanPesanNotifikasi(args.message)
  if (!pesan) return null

  const data: Record<string, unknown> = {
    userId: args.userId,
    userUserId: args.userId,
    groupKey: baku.groupKey,
    kategori: baku.kategori,
    entitasId: args.entitasId || (baku.konteks !== '-' ? baku.konteks : null),
    message: pesan,
    metadata: args.metadata ?? null,
    isRead: false,
    readAt: null,
    retryCount: 0,
  }

  const lama = await client.notification.findMany({
    where: { userId: args.userId, groupKey: baku.groupKey },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  if (lama.length > 1) {
    await client.notification.deleteMany({
      where: { id: { in: lama.slice(1).map((baris: { id: string }) => baris.id) } },
    })
  }

  if (lama.length > 0) {
    return client.notification.update({
      where: { id: lama[0].id },
      data: { ...data, createdAt: new Date() },
    })
  }

  return client.notification.create({ data })
}

/**
 * Pembersihan data lama: gabungkan semua baris dengan jenis & konteks sama,
 * simpan yang terbaru, dan normalkan groupKey-nya. Aman dijalankan berulang.
 */
export async function bersihkanDuplikatNotifikasi(args: {
  client?: Klien
  userId?: string
} = {}): Promise<{ diperiksa: number; dihapus: number; dinormalkan: number }> {
  const client = args.client ?? prisma()
  const baris = await client.notification.findMany({
    where: args.userId ? { userId: args.userId } : undefined,
    select: {
      id: true,
      userId: true,
      groupKey: true,
      kategori: true,
      entitasId: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const kelompok = new Map<string, Array<any>>()
  for (const item of baris as Array<any>) {
    const baku = kunciBakuNotifikasi({
      groupKey: item.groupKey,
      kategori: item.kategori,
      entitasId: item.entitasId,
      message: item.message,
      userId: item.userId,
    })
    const kunci = `${item.userId}|${baku.groupKey}`
    const daftar = kelompok.get(kunci) || []
    daftar.push({ ...item, baku })
    kelompok.set(kunci, daftar)
  }

  let dihapus = 0
  let dinormalkan = 0
  for (const daftar of kelompok.values()) {
    if (daftar.length === 0) continue
    const terbaru = daftar[daftar.length - 1]
    const lama = daftar.slice(0, -1)
    if (lama.length > 0) {
      await client.notification.deleteMany({
        where: { id: { in: lama.map((item: any) => item.id) } },
      })
      dihapus += lama.length
    }

    const pesanBersih = bersihkanPesanNotifikasi(terbaru.message)
    const perluUbah =
      terbaru.groupKey !== terbaru.baku.groupKey ||
      terbaru.message !== pesanBersih ||
      terbaru.kategori !== terbaru.baku.kategori
    if (perluUbah) {
      await client.notification.update({
        where: { id: terbaru.id },
        data: {
          groupKey: terbaru.baku.groupKey,
          kategori: terbaru.baku.kategori,
          message: pesanBersih || terbaru.message,
          entitasId:
            terbaru.entitasId ||
            (terbaru.baku.konteks !== '-' ? terbaru.baku.konteks : null),
        },
      })
      dinormalkan += 1
    }
  }

  return { diperiksa: baris.length, dihapus, dinormalkan }
}
