// src/lib/pembatalanServer.ts
// Helper server-side Tahap 10: nominal pembayaran, rekap refund, pelepasan/pengembalian stok,
// notifikasi, dan riwayat domain. Akses database selamanya memakai prisma()/client transaksi.

import prisma from '@/lib/prisma'
import {
  buatNotifikasi,
  catatRiwayatStatus,
  notifikasiAdmins,
} from '@/lib/pembayaranServer'
import {
  rencanaRilisStok,
  ringkasanRefund,
  validasiStokKoreksi,
  type RingkasanRefund,
} from '@/lib/pembatalan'

/** Nominal yang benar-benar dibayar: alokasi bukti terverifikasi, atau snapshot total untuk CFD. */
export async function nominalPembayaran(
  client: any,
  order: {
    id: string
    paidAt?: Date | string | null
    paymentProofStatus?: string
    totalAmount: number
    allocatedAmount?: number | null
    refundNominal?: number | null
  }
): Promise<number> {
  if (typeof order.refundNominal === 'number' && order.refundNominal > 0) {
    return order.refundNominal
  }
  if (!order.paidAt || order.paymentProofStatus !== 'TERVERIFIKASI') return 0

  const alokasi = await client.orderPaymentAllocation.findMany({
    where: { orderId: order.id },
    select: { allocatedAmount: true },
  })
  const dariAlokasi = (alokasi as Array<{ allocatedAmount: number }>).reduce(
    (jumlah, item) => jumlah + Number(item.allocatedAmount || 0),
    0
  )
  if (dariAlokasi > 0) return dariAlokasi
  return Number(order.allocatedAmount || order.totalAmount || 0)
}

export async function totalRefund(
  client: any,
  orderId: string
): Promise<{ disetujui: number; menunggu: number; records: number }> {
  const records = await client.refundRecord.findMany({
    where: { orderId },
    select: { refundAmount: true, status: true },
  })
  let disetujui = 0
  let menunggu = 0
  for (const record of records as Array<{ refundAmount: number; status: string }>) {
    if (record.status === 'SELESAI') disetujui += Number(record.refundAmount || 0)
    if (record.status === 'MENUNGGU_PERSETUJUAN') menunggu += Number(record.refundAmount || 0)
  }
  return { disetujui, menunggu, records: records.length }
}

export async function ringkasanRefundOrder(
  client: any,
  order: {
    id: string
    paidAt?: Date | string | null
    paymentProofStatus?: string
    totalAmount: number
    allocatedAmount?: number | null
    refundNominal?: number | null
  }
): Promise<RingkasanRefund> {
  const [nominal, total] = await Promise.all([
    nominalPembayaran(client, order),
    totalRefund(client, order.id),
  ])
  return ringkasanRefund({
    nominalDibayar: nominal,
    totalDisetujui: total.disetujui,
    totalMenunggu: total.menunggu,
  })
}

/**
 * Lepaskan stockReserved tepat sekali di dalam transaksi yang sudah mengunci Order.
 * Buku nonaktif dilewati; buku aktif diproses bersamaan agar tidak ada pelepasan parsial.
 */
export async function lepaskanStokTertahan(args: {
  client: any
  order: { id: string; orderNumber: string }
  actorId: string
  sekarang: Date
  alasan: string
  stockReleased?: boolean
}): Promise<{
  rilis: Array<{ bookId: string; quantity: number }>
  dilewati: Array<{ bookId: string; alasan: string }>
}> {
  const { client, order, actorId, sekarang, alasan, stockReleased = false } = args
  const items = await client.orderItem.findMany({
    where: { orderId: order.id },
    select: { bookId: true, quantity: true, snapshotTitle: true },
  })

  const bookIds = [...new Set<string>((items as Array<{ bookId: string }>).map((i) => i.bookId))].sort()
  for (const bookId of bookIds) {
    const terkunci = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Book" WHERE id = ${bookId} FOR UPDATE
    `
    if (terkunci.length === 0) throw new Error(`Buku tidak ditemukan: ${bookId}`)
  }

  const daftarBuku = bookIds.length
    ? await client.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true, status: true, stockReserved: true },
      })
    : []
  const petaBuku: Record<string, { id: string; status: string; stockReserved: number }> = {}
  for (const buku of daftarBuku as Array<{
    id: string
    status: string
    stockReserved: number
  }>) {
    petaBuku[buku.id] = {
      id: buku.id,
      status: buku.status,
      stockReserved: Number(buku.stockReserved),
    }
  }

  const rencana = rencanaRilisStok({
    items: items as Array<{ bookId: string; quantity: number }>,
    buku: petaBuku,
    stockReleased,
  })
  if (!rencana.boleh) throw new Error(rencana.alasan || 'Pelepasan stok ditolak')

  for (const rilis of rencana.rilis) {
    // checkout menambah stockReserved; pembatalan melepaskan (mengurangi) reservation.
    await client.book.update({
      where: { id: rilis.bookId },
      data: { stockReserved: { decrement: rilis.quantity } },
    })
    await client.stockMovement.create({
      data: {
        bookId: rilis.bookId,
        type: 'MASUK',
        quantity: rilis.quantity,
        reason: `Pembatalan pesanan ${order.orderNumber}: ${alasan}`,
        createdBy: actorId,
      },
    })
  }

  return { rilis: rencana.rilis, dilewati: rencana.dilewati }
}

/** Kembalikan stockTotal & stockReserved setelah koreksi Selesai (all-or-nothing). */
export async function kembalikanStokSelesai(args: {
  client: any
  order: { id: string; orderNumber: string }
  actorId: string
  sekarang: Date
  alasan: string
}): Promise<Array<{ bookId: string; quantity: number }>> {
  const { client, order, actorId, alasan } = args
  const items = await client.orderItem.findMany({
    where: { orderId: order.id },
    select: { bookId: true, quantity: true },
  })
  const bookIds = [...new Set<string>((items as Array<{ bookId: string }>).map((i) => i.bookId))].sort()
  for (const bookId of bookIds) {
    const terkunci = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Book" WHERE id = ${bookId} FOR UPDATE
    `
    if (terkunci.length === 0) throw new Error(`Buku tidak ditemukan: ${bookId}`)
  }
  const daftarBuku = bookIds.length
    ? await client.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true, status: true },
      })
    : []
  const petaBuku: Record<string, { id: string; status: string }> = {}
  for (const buku of daftarBuku as Array<{ id: string; status: string }>) {
    petaBuku[buku.id] = { id: buku.id, status: buku.status }
  }

  const cek = validasiStokKoreksi(items as Array<{ bookId: string; quantity: number }>, petaBuku)
  if (!cek.valid) throw new Error(cek.alasan || 'Stok tidak dapat dikembalikan')

  const jumlahPerBuku = new Map<string, number>()
  for (const item of items as Array<{ bookId: string; quantity: number }>) {
    jumlahPerBuku.set(item.bookId, (jumlahPerBuku.get(item.bookId) || 0) + item.quantity)
  }
  const hasil: Array<{ bookId: string; quantity: number }> = []
  for (const bookId of cek.urutanBookId) {
    const quantity = jumlahPerBuku.get(bookId) || 0
    await client.book.update({
      where: { id: bookId },
      data: {
        stockTotal: { increment: quantity },
        stockReserved: { increment: quantity },
      },
    })
    await client.stockMovement.create({
      data: {
        bookId,
        type: 'MASUK',
        quantity,
        reason: `Koreksi status Selesai pesanan ${order.orderNumber}: ${alasan}`,
        createdBy: actorId,
      },
    })
    hasil.push({ bookId, quantity })
  }
  return hasil
}

export async function catatRiwayatRefund(params: {
  client: any
  orderId: string
  oldStatus: string
  newStatus: string
  reason: string | null
  actorId: string
  actorRole: string
}) {
  return catatRiwayatStatus({
    orderId: params.orderId,
    domain: 'REFUND',
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    reason: params.reason,
    actorId: params.actorId,
    actorRole: params.actorRole,
    client: params.client,
  })
}

export async function notifikasiPembatalan(args: {
  client: any
  customerId: string
  orderNumber: string
  actorName: string
  sekarang: Date
  alasan: string
  keteranganStok: string
}) {
  const { client, customerId, orderNumber, actorName, sekarang, alasan, keteranganStok } = args
  const kunci = `pembatalan:${orderNumber}:${sekarang.getTime()}`
  await buatNotifikasi({
    userId: customerId,
    groupKey: `${kunci}:customer`,
    message:
      `Pesanan ${orderNumber} dibatalkan oleh ${actorName}. Alasan: ${alasan}. ${keteranganStok}`,
    client,
  })
  await notifikasiAdmins({
    groupKey: `${kunci}:admin`,
    message: `Pesanan ${orderNumber} dibatalkan oleh ${actorName}. Alasan: ${alasan}.`,
    client,
  })
}

export async function notifikasiAdminUtamaRefund(args: {
  client: any
  pesan: string
  groupKey: string
}): Promise<number> {
  const admins = await args.client.user.findMany({
    where: { role: 'ADMIN_UTAMA', isActive: true },
    select: { id: true },
  })
  for (const admin of admins as Array<{ id: string }>) {
    await buatNotifikasi({
      userId: admin.id,
      groupKey: `${args.groupKey}:${admin.id}`,
      message: args.pesan,
      client: args.client,
    })
  }
  return admins.length
}

export async function notifikasiRefund(args: {
  client: any
  customerId: string
  orderNumber: string
  pesan: string
  groupKey: string
}) {
  await buatNotifikasi({
    userId: args.customerId,
    groupKey: `${args.groupKey}:customer`,
    message: `Refund pesanan ${args.orderNumber}: ${args.pesan}`,
    client: args.client,
  })
  await notifikasiAdmins({
    groupKey: `${args.groupKey}:admin`,
    message: `Refund pesanan ${args.orderNumber}: ${args.pesan}`,
    client: args.client,
  })
}

export async function riwayatPembatalan(client?: any, orderId?: string) {
  const orm = client ?? prisma()
  if (!orderId) return []
  return orm.orderStatusHistory.findMany({
    where: { orderId, domain: { in: ['ORDER', 'REFUND'] } },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
}
