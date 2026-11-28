// scripts/bersihkan-notifikasi-duplikat.ts
// Pembersihan sekali jalan untuk notifikasi lama yang sudah terlanjur menumpuk.
// Jalankan di dalam container: npx tsx scripts/bersihkan-notifikasi-duplikat.ts
// Aman dijalankan berulang (idempoten). Tidak menghapus akun, pesanan, atau audit.

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  bersihkanPesanNotifikasi,
  kunciBakuNotifikasi,
} from '../src/lib/notifikasiKunci'

async function utama() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL belum tersedia')

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })

  try {
    const baris = await prisma.notification.findMany({
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
      const terbaru = daftar[daftar.length - 1]
      const lama = daftar.slice(0, -1)
      if (lama.length) {
        await prisma.notification.deleteMany({
          where: { id: { in: lama.map((item: any) => item.id) } },
        })
        dihapus += lama.length
      }

      const pesan = bersihkanPesanNotifikasi(terbaru.message)
      if (
        terbaru.groupKey !== terbaru.baku.groupKey ||
        terbaru.kategori !== terbaru.baku.kategori ||
        terbaru.message !== pesan
      ) {
        await prisma.notification.update({
          where: { id: terbaru.id },
          data: {
            groupKey: terbaru.baku.groupKey,
            kategori: terbaru.baku.kategori,
            message: pesan || terbaru.message,
            entitasId:
              terbaru.entitasId ||
              (terbaru.baku.konteks !== '-' ? terbaru.baku.konteks : null),
          },
        })
        dinormalkan += 1
      }
    }

    const tersisa = await prisma.notification.count()
    console.log(
      `Bersihkan notifikasi selesai: ${baris.length} diperiksa, ${dihapus} duplikat dihapus, ` +
        `${dinormalkan} kunci dinormalkan, ${tersisa} notifikasi tersisa.`
    )
  } finally {
    await prisma.$disconnect()
  }
}

utama().catch((error) => {
  console.error('Gagal membersihkan notifikasi:', error)
  process.exitCode = 1
})
