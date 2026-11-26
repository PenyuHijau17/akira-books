// src/lib/keranjangServer.ts
// Helper server-side Keranjang: akses database + sinkronisasi stok (BR-012).
// Semua akses DB WAJIB lewat prisma() dari src/lib/prisma.ts.

import prisma from '@/lib/prisma'
import {
  hitungPenyesuaianKeranjang,
  hitungStokTersedia,
  pesanPenyesuaianKeranjang,
  type BukuUntukKeranjang,
  type PenyesuaianKeranjang,
} from '@/lib/keranjang'

export type ItemKeranjangTampil = {
  id: string
  bookId: string
  quantity: number
  stokTersedia: number
  subtotal: number
  book: {
    id: string
    code: string
    title: string
    author: string
    imageUrl: string | null
    sellingPrice: number
    status: string
  } | null
}

export type PayloadKeranjang = {
  cartId: string
  versi: number
  versiDisetujui: number
  perluTinjauUlang: boolean
  alasanTinjau: string | null
  items: ItemKeranjangTampil[]
  total: number
  penyesuaian: PenyesuaianKeranjang[]
}

type KlienPrisma = ReturnType<typeof prisma>

/** Ambil keranjang milik user, buat bila belum ada. */
export async function ambilAtauBuatKeranjang(userId: string) {
  const client = prisma()

  const keranjang = await client.cart.findUnique({ where: { userId } })
  if (keranjang) return keranjang

  return client.cart.create({
    data: {
      userId,
      userUserId: userId,
      version: 0,
      approvedVersion: 0,
      needsReview: false,
    },
  })
}

function bentukPayload(
  keranjang: {
    id: string
    version: number
    approvedVersion: number
    needsReview: boolean
    reviewReason: string | null
  },
  items: Array<{ id: string; bookId: string; quantity: number }>,
  bukuMap: Record<string, BukuUntukKeranjang | null | undefined>,
  penyesuaian: PenyesuaianKeranjang[]
): PayloadKeranjang {
  const itemTampil: ItemKeranjangTampil[] = items.map((item) => {
    const buku = bukuMap[item.bookId]
    const harga = buku?.sellingPrice ?? 0

    return {
      id: item.id,
      bookId: item.bookId,
      quantity: item.quantity,
      stokTersedia: hitungStokTersedia(buku),
      subtotal: harga * item.quantity,
      book: buku
        ? {
            id: buku.id,
            code: buku.code ?? '',
            title: buku.title ?? '',
            author: (buku as BukuUntukKeranjang & { author?: string }).author ?? '',
            imageUrl:
              (buku as BukuUntukKeranjang & { imageUrl?: string | null }).imageUrl ?? null,
            sellingPrice: harga,
            status: buku.status ?? 'TERSEDIA',
          }
        : null,
    }
  })

  return {
    cartId: keranjang.id,
    versi: keranjang.version,
    versiDisetujui: keranjang.approvedVersion,
    perluTinjauUlang: keranjang.needsReview,
    alasanTinjau: keranjang.reviewReason,
    items: itemTampil,
    total: itemTampil.reduce((jumlah, item) => jumlah + item.subtotal, 0),
    penyesuaian,
  }
}

/**
 * Muat keranjang sekaligus menyinkronkan stok (BR-012).
 * Jika stok berkurang/habis, item otomatis dihapus/disesuaikan,
 * versi keranjang naik, Customer wajib meninjau ulang, dan notifikasi dibuat.
 */
export async function muatKeranjang(userId: string): Promise<PayloadKeranjang> {
  const client: KlienPrisma = prisma()
  let keranjang = await ambilAtauBuatKeranjang(userId)

  let items = await client.cartItem.findMany({
    where: { cartId: keranjang.id },
    orderBy: { createdAt: 'asc' },
  })

  const bukuMap = await muatBukuMap(
    client,
    items.map((item) => item.bookId)
  )

  const penyesuaian = hitungPenyesuaianKeranjang(
    items.map((item) => ({ id: item.id, bookId: item.bookId, quantity: item.quantity })),
    bukuMap
  )

  if (penyesuaian.length > 0) {
    const judulMap: Record<string, string | null | undefined> = {}
    for (const [id, buku] of Object.entries(bukuMap)) {
      judulMap[id] = buku?.title
    }

    const pesan = pesanPenyesuaianKeranjang(penyesuaian, judulMap)

    keranjang = await client.$transaction(async (tx) => {
      for (const p of penyesuaian) {
        if (p.jenis === 'DIHAPUS') {
          await tx.cartItem.delete({ where: { id: p.itemId } })
        } else {
          await tx.cartItem.update({
            where: { id: p.itemId },
            data: { quantity: p.kuantitasBaru },
          })
        }
      }

      const diperbarui = await tx.cart.update({
        where: { id: keranjang.id },
        data: {
          version: { increment: 1 },
          needsReview: true,
          reviewReason: pesan,
        },
      })

      await tx.notification.create({
        data: {
          userId,
          userUserId: userId,
          groupKey: `keranjang:${keranjang.id}:${diperbarui.version}`,
          message: pesan,
          isRead: false,
          retryCount: 0,
        },
      })

      return diperbarui
    })

    items = await client.cartItem.findMany({
      where: { cartId: keranjang.id },
      orderBy: { createdAt: 'asc' },
    })
  }

  const bukuMapTerbaru = await muatBukuMap(
    client,
    items.map((item) => item.bookId)
  )

  return bentukPayload(keranjang, items, bukuMapTerbaru, penyesuaian)
}

/** Muat data buku yang dibutuhkan logika keranjang (termasuk modal untuk snapshot, internal). */
export async function muatBukuMap(
  client: KlienPrisma,
  bookIds: string[]
): Promise<Record<string, BukuUntukKeranjang | null | undefined>> {
  if (bookIds.length === 0) return {}

  const buku = await client.book.findMany({
    where: { id: { in: bookIds } },
  })

  const map: Record<string, BukuUntukKeranjang | null | undefined> = {}
  for (const b of buku) {
    map[b.id] = {
      id: b.id,
      code: b.code,
      title: b.title,
      sellingPrice: b.sellingPrice,
      stockTotal: b.stockTotal,
      stockReserved: b.stockReserved,
      status: b.status,
      mergedIntoBookId: b.mergedIntoBookId,
      ...({ costPrice: b.costPrice } as object),
      ...({ author: b.author, imageUrl: b.imageUrl } as object),
    }
  }
  return map
}

/** Setujui ulang isi keranjang setelah penyesuaian stok (BR-012). */
export async function setujuiKeranjang(userId: string): Promise<PayloadKeranjang> {
  const client: KlienPrisma = prisma()
  const keranjang = await ambilAtauBuatKeranjang(userId)

  await client.cart.update({
    where: { id: keranjang.id },
    data: {
      approvedVersion: keranjang.version,
      needsReview: false,
      reviewReason: null,
    },
  })

  return muatKeranjang(userId)
}
