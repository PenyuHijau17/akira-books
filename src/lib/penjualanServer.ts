// src/lib/penjualanServer.ts
// Helper server-side Tahap 11: pencatatan penjualan offline atomik, penyesuaian keranjang,
// dan agregasi laporan keuangan. Semua akses DB memakai prisma()/client transaksi (GR-03).

import prisma from '@/lib/prisma'
import { buatNotifikasi, catatAudit } from '@/lib/pembayaranServer'
import { nominalPembayaran } from '@/lib/pembatalanServer'
import {
  hitungPenyesuaianKeranjang,
  pesanPenyesuaianKeranjang,
} from '@/lib/keranjang'
import { saringFieldModal } from '@/lib/pesanan'
import {
  bolehLihatModalLaba,
  rencanaPenjualanOffline,
  ringkasanLaba,
  type BukuPenjualan,
  type ItemPenjualanMasuk,
  type PeriodeLaporan,
} from '@/lib/penjualanOffline'

type Klien = any

/** Daftar buku untuk form penjualan offline (tanpa field modal, GR-03). */
export async function daftarBukuPenjualan(client?: Klien) {
  const db = client ?? prisma()
  const buku = await db.book.findMany({
    where: { status: { in: ['TERSEDIA', 'SEDANG_DIPESAN'] }, mergedIntoBookId: null },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      code: true,
      title: true,
      sellingPrice: true,
      stockTotal: true,
      stockReserved: true,
      status: true,
    },
  })
  return buku.map((b: any) => ({
    id: b.id,
    code: b.code,
    title: b.title,
    sellingPrice: b.sellingPrice,
    status: b.status,
    stokTersedia: Math.max(0, Number(b.stockTotal) - Number(b.stockReserved)),
  }))
}

async function ambilCostTerkini(client: Klien, bookIds: string[]) {
  if (bookIds.length === 0) return {} as Record<string, number>
  const buku = await client.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, costPrice: true },
  })
  const hasil: Record<string, number> = {}
  for (const b of buku as Array<{ id: string; costPrice: number }>) {
    hasil[b.id] = Number(b.costPrice || 0)
  }
  return hasil
}

/**
 * Sesuaikan/hapus item keranjang Customer lain yang terdampak penjualan offline (BR-012).
 * Flag tinjau ulang & notifikasi dibuat di transaksi yang sama dengan pengurangan stok.
 */
export async function sesuaikanKeranjangTerdampak(args: {
  client: Klien
  bukuMap: Record<string, BukuPenjualan>
  judulMap: Record<string, string>
}): Promise<Array<{ cartId: string; itemId: string; bookId: string; jenis: string }>> {
  const { client, bukuMap, judulMap } = args
  const bookIds = Object.keys(bukuMap)
  if (bookIds.length === 0) return []

  const semuaItem = await client.cartItem.findMany({
    where: { bookId: { in: bookIds } },
    select: { id: true, cartId: true, bookId: true, quantity: true },
  })
  if (semuaItem.length === 0) return []

  const perCart = new Map<string, Array<{ id: string; bookId: string; quantity: number }>>()
  for (const item of semuaItem as Array<{
    id: string
    cartId: string
    bookId: string
    quantity: number
  }>) {
    if (!perCart.has(item.cartId)) perCart.set(item.cartId, [])
    perCart.get(item.cartId)!.push({ id: item.id, bookId: item.bookId, quantity: item.quantity })
  }

  const hasil: Array<{ cartId: string; itemId: string; bookId: string; jenis: string }> = []
  for (const [cartId, items] of perCart.entries()) {
    const penyesuaian = hitungPenyesuaianKeranjang(items, bukuMap)
    if (penyesuaian.length === 0) continue

    for (const p of penyesuaian) {
      if (p.jenis === 'DIHAPUS') {
        await client.cartItem.delete({ where: { id: p.itemId } })
      } else {
        await client.cartItem.update({
          where: { id: p.itemId },
          data: { quantity: p.kuantitasBaru },
        })
      }
      hasil.push({ cartId, itemId: p.itemId, bookId: p.bookId, jenis: p.jenis })
    }

    const keranjang = await client.cart.findUnique({ where: { id: cartId } })
    if (!keranjang) continue
    const diperbarui = await client.cart.update({
      where: { id: cartId },
      data: {
        version: { increment: 1 },
        needsReview: true,
        reviewReason: pesanPenyesuaianKeranjang(penyesuaian, judulMap),
      },
    })
    await buatNotifikasi({
      userId: keranjang.userId,
      groupKey: `keranjang:${cartId}:${diperbarui.version}`,
      message: diperbarui.reviewReason || 'Keranjang Anda disesuaikan karena penjualan offline.',
      client,
    })
  }
  return hasil
}

/**
 * Catat penjualan langsung di booth. Dipanggil di dalam $transaction dengan
 * SELECT ... FOR UPDATE pada baris Book (urutan bookId konsisten) agar tidak oversold.
 */
export async function catatPenjualanOffline(args: {
  client: Klien
  user: { id: string; role: string }
  items: ItemPenjualanMasuk[]
  catatan?: string | null
  idempotencyKey?: string | null
  sekarang?: Date
}): Promise<{
  sudahAda: boolean
  penjualan: any
  items: any[]
  penyesuaian: Array<{ cartId: string; itemId: string; bookId: string; jenis: string }>
}> {
  const { client, user, items, catatan = null, idempotencyKey = null, sekarang = new Date() } = args

  if (idempotencyKey) {
    const lama = await client.offlineSale.findUnique({ where: { idempotencyKey } })
    if (lama) {
      const itemLama = await client.offlineSaleItem.findMany({
        where: { offlineSaleId: lama.id },
      })
      return { sudahAda: true, penjualan: lama, items: itemLama, penyesuaian: [] }
    }
  }

  const bookIds = [...new Set<string>(items.map((i) => String(i.bookId)))].sort()
  if (bookIds.length === 0) throw new Error('Minimal satu buku harus dicatat')

  for (const bookId of bookIds) {
    const terkunci = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Book" WHERE id = ${bookId} FOR UPDATE
    `
    if (terkunci.length === 0) throw new Error(`Buku tidak ditemukan: ${bookId}`)
  }

  const daftarBuku = await client.book.findMany({ where: { id: { in: bookIds } } })
  const petaBuku: Record<string, BukuPenjualan> = {}
  for (const b of daftarBuku as Array<any>) {
    petaBuku[b.id] = {
      id: b.id,
      code: b.code,
      title: b.title,
      sellingPrice: b.sellingPrice,
      costPrice: Number(b.costPrice || 0),
      stockTotal: Number(b.stockTotal),
      stockReserved: Number(b.stockReserved),
      status: b.status,
      mergedIntoBookId: b.mergedIntoBookId,
    }
  }

  const rencana = rencanaPenjualanOffline(items, petaBuku)
  if (!rencana.valid) throw new Error(rencana.alasan || 'Penjualan offline ditolak')

  const penjualan = await client.offlineSale.create({
    data: {
      recordedById: user.id,
      userUserId: user.id,
      soldAt: sekarang,
      status: 'SELESAI',
      catatan,
      idempotencyKey: idempotencyKey || null,
    },
  })

  const tersimpan: any[] = []
  const bukuTerdampak: Record<string, BukuPenjualan> = {}
  const judulMap: Record<string, string> = {}

  for (const r of rencana.rencana) {
    await client.book.update({
      where: { id: r.bookId },
      data: { stockTotal: { decrement: r.quantity } },
    })
    const item = await client.offlineSaleItem.create({
      data: {
        offlineSaleId: penjualan.id,
        offlineSaleOfflineSaleId: penjualan.id,
        bookId: r.bookId,
        bookBookId: r.bookId,
        quantity: r.quantity,
        actualSellingPrice: r.actualSellingPrice,
        costPrice: r.costPrice,
        snapshotCode: r.code,
        snapshotTitle: r.title,
        subtotal: r.quantity * r.actualSellingPrice,
      },
    })
    tersimpan.push(item)
    judulMap[r.bookId] = r.title
    bukuTerdampak[r.bookId] = { ...petaBuku[r.bookId], stockTotal: r.stokSesudah }
    await client.stockMovement.create({
      data: {
        bookId: r.bookId,
        type: 'KELUAR',
        quantity: r.quantity,
        reason: `Penjualan offline ${penjualan.id}${catatan ? `: ${catatan}` : ''}`,
        createdBy: user.id,
      },
    })
  }

  const penyesuaian = await sesuaikanKeranjangTerdampak({
    client,
    bukuMap: bukuTerdampak,
    judulMap,
  })

  return { sudahAda: false, penjualan, items: tersimpan, penyesuaian }
}

/** Donor data laporan: pembatalan, refund, dan riwayat transaksi periode berjalan. */
export async function ringkasanLaporanKeuangan(client: Klien, periode: PeriodeLaporan) {
  const rentang = { gte: periode.mulai, lt: periode.sampai }

  const [ordersDibayar, ordersSelesai, penjualanOffline, pembatalan, refundSelesai, refundMenunggu] =
    await Promise.all([
      client.order.findMany({
        where: { paidAt: rentang, paymentProofStatus: 'TERVERIFIKASI' },
        select: {
          id: true,
          orderNumber: true,
          paidAt: true,
          totalAmount: true,
          allocatedAmount: true,
          refundNominal: true,
        },
      }),
      client.order.findMany({
        where: { orderStatus: 'SELESAI', completedAt: rentang },
        select: { id: true, orderNumber: true, completedAt: true, totalAmount: true },
      }),
      client.offlineSale.findMany({
        where: { status: 'SELESAI', soldAt: rentang },
        select: { id: true, soldAt: true, recordedById: true, catatan: true },
      }),
      client.order.findMany({
        where: { cancelledAt: rentang },
        select: {
          orderNumber: true,
          cancelledAt: true,
          cancelReason: true,
          refundNominal: true,
          totalAmount: true,
        },
      }),
      client.refundRecord.findMany({
        where: { status: 'SELESAI', approvedAt: rentang },
        select: { refundAmount: true, approvedAt: true, orderId: true },
      }),
      client.refundRecord.aggregate({
        where: { status: 'MENUNGGU_PERSETUJUAN' },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
    ])

  const nominalPerOrder = new Map<string, number>()
  let pembayaranTerverifikasi = 0
  for (const order of ordersDibayar as Array<any>) {
    const nominal = await nominalPembayaran(client, order)
    nominalPerOrder.set(order.id, nominal)
    pembayaranTerverifikasi += nominal
  }

  const orderSelesaiIds = (ordersSelesai as Array<any>).map((o) => o.id)
  const [orderItems, saleItems] = await Promise.all([
    orderSelesaiIds.length
      ? client.orderItem.findMany({
          where: { orderId: { in: orderSelesaiIds } },
          select: {
            bookId: true,
            quantity: true,
            snapshotSellingPrice: true,
            snapshotCostPrice: true,
          },
        })
      : Promise.resolve([]),
    penjualanOffline.length
      ? client.offlineSaleItem.findMany({
          where: { offlineSaleId: { in: (penjualanOffline as Array<any>).map((s) => s.id) } },
          select: {
            offlineSaleId: true,
            bookId: true,
            quantity: true,
            actualSellingPrice: true,
            costPrice: true,
          },
        })
      : Promise.resolve([]),
  ])

  const costTerkini = await ambilCostTerkini(
    client,
    [...new Set<string>([
      ...(orderItems as Array<any>).map((i) => i.bookId),
      ...(saleItems as Array<any>).map((i) => i.bookId),
    ])]
  )

  const labaOnline = ringkasanLaba(
    (orderItems as Array<any>).map((i) => ({
      bookId: i.bookId,
      quantity: Number(i.quantity),
      actualSellingPrice: Number(i.snapshotSellingPrice),
      costPrice: Number(i.snapshotCostPrice),
    })),
    costTerkini
  )
  const labaOffline = ringkasanLaba(
    (saleItems as Array<any>).map((i) => ({
      bookId: i.bookId,
      quantity: Number(i.quantity),
      actualSellingPrice: Number(i.actualSellingPrice),
      costPrice: Number(i.costPrice),
    })),
    costTerkini
  )

  const penjualanOnline = (ordersSelesai as Array<any>).reduce(
    (jumlah, o) => jumlah + Number(o.totalAmount || 0),
    0
  )
  const totalRefundSelesai = (refundSelesai as Array<any>).reduce(
    (jumlah, r) => jumlah + Number(r.refundAmount || 0),
    0
  )
  const totalPembatalan = (pembatalan as Array<any>).reduce(
    (jumlah, o) => jumlah + Number(o.refundNominal || o.totalAmount || 0),
    0
  )

  const riwayat = [
    ...(ordersDibayar as Array<any>).map((o) => ({
      jenis: 'PEMBAYARAN_TERVERIFIKASI',
      referensi: o.orderNumber,
      waktu: o.paidAt,
      nominal: nominalPerOrder.get(o.id) || 0,
      keterangan: 'Pembayaran diterima (buku belum tentu diserahkan)',
    })),
    ...(ordersSelesai as Array<any>).map((o) => ({
      jenis: 'PENJUALAN_ONLINE',
      referensi: o.orderNumber,
      waktu: o.completedAt,
      nominal: Number(o.totalAmount || 0),
      keterangan: 'Pesanan selesai diserahkan',
    })),
    ...(penjualanOffline as Array<any>).map((s) => ({
      jenis: 'PENJUALAN_OFFLINE',
      referensi: s.id,
      waktu: s.soldAt,
      nominal: (saleItems as Array<any>)
        .filter((i) => i.offlineSaleId === s.id)
        .reduce((jumlah, i) => jumlah + Number(i.quantity) * Number(i.actualSellingPrice), 0),
      keterangan: s.catatan || 'Penjualan langsung di booth',
    })),
    ...(pembatalan as Array<any>).map((o) => ({
      jenis: 'PEMBATALAN',
      referensi: o.orderNumber,
      waktu: o.cancelledAt,
      nominal: Number(o.refundNominal || o.totalAmount || 0),
      keterangan: o.cancelReason || 'Pesanan dibatalkan',
    })),
    ...(refundSelesai as Array<any>).map((r) => ({
      jenis: 'REFUND_SELESAI',
      referensi: r.orderId || '-',
      waktu: r.approvedAt,
      nominal: Number(r.refundAmount || 0),
      keterangan: 'Dana dikembalikan',
    })),
  ]
    .filter((entri) => entri.waktu)
    .sort(
      (a, b) =>
        new Date(b.waktu as Date).getTime() - new Date(a.waktu as Date).getTime()
    )
    .slice(0, 50)
    .map((entri) => ({ ...entri, waktu: new Date(entri.waktu as Date).toISOString() }))

  return {
    periode: {
      jenis: periode.jenis,
      label: periode.label,
      mulai: periode.mulai.toISOString(),
      sampai: periode.sampai.toISOString(),
      zonaWaktu: 'Asia/Jakarta',
    },
    ringkasan: {
      pembayaranTerverifikasi,
      penjualanOnline,
      penjualanOffline: labaOffline.pendapatan,
      totalPenjualanSelesai: penjualanOnline + labaOffline.pendapatan,
      unitOnline: labaOnline.unit,
      unitOffline: labaOffline.unit,
      totalUnit: labaOnline.unit + labaOffline.unit,
      jumlahOrderSelesai: ordersSelesai.length,
      jumlahPenjualanOffline: penjualanOffline.length,
      pembatalan: pembatalan.length,
      nominalPembatalan: totalPembatalan,
      refundSelesai: refundSelesai.length,
      nominalRefundSelesai: totalRefundSelesai,
      refundMenunggu: refundMenunggu._count._all,
      nominalRefundMenunggu: Number(refundMenunggu._sum.refundAmount || 0),
    },
    laba: {
      historisOnline: labaOnline.labaHistoris,
      historisOffline: labaOffline.labaHistoris,
      historisTotal: labaOnline.labaHistoris + labaOffline.labaHistoris,
      hitungUlangOnline: labaOnline.labaHitungUlang,
      hitungUlangOffline: labaOffline.labaHitungUlang,
      hitungUlangTotal: labaOnline.labaHitungUlang + labaOffline.labaHitungUlang,
      selisih:
        labaOnline.labaHitungUlang +
        labaOffline.labaHitungUlang -
        (labaOnline.labaHistoris + labaOffline.labaHistoris),
    },
    riwayat,
  }
}

/**
 * GR-03: buang modal & laba sebelum payload dikirim ke Admin Biasa.
 * Admin Utama tetap menerima data lengkap, termasuk laba historis dan snapshot modal.
 */
export function saringPenjualanUntukPeran<T>(data: T, peran: string | null | undefined): T {
  if (bolehLihatModalLaba(peran)) return data
  const buang = (nilai: any): any => {
    if (Array.isArray(nilai)) return nilai.map(buang)
    if (nilai && typeof nilai === 'object' && !(nilai instanceof Date)) {
      const hasil: Record<string, unknown> = {}
      for (const [kunci, isi] of Object.entries(nilai)) {
        if (
          ['labaHistoris', 'labaHitungUlang', 'labaHistorisOnline', 'labaHistorisOffline', 'labaHistorisTotal', 'hitungUlangOnline', 'hitungUlangOffline', 'hitungUlangTotal', 'selisih'].includes(
            kunci
          )
        ) {
          continue
        }
        hasil[kunci] = buang(isi)
      }
      return hasil
    }
    return nilai
  }
  return buang(saringFieldModal(data)) as T
}

/** Audit ringkas tanpa field modal (walaupun audit hanya dibaca Admin Utama). */
export function auditPenjualan(params: {
  client: Klien
  user: { id: string; role: string }
  action: string
  targetId: string
  oldValue?: unknown
  newValue?: unknown
  reason?: string | null
}) {
  return catatAudit({
    actorId: params.user.id,
    actorRole: params.user.role,
    action: params.action,
    targetEntity: 'OfflineSale',
    targetId: params.targetId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    reason: params.reason ?? null,
    client: params.client,
  })
}
