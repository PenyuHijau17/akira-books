// src/app/api/admin/refund/[orderId]/route.ts
// Pemrosesan Refund pesanan dibatalkan: pengajuan -> persetujuan Admin Utama -> selesai.
// Status refund tersimpan terpisah dari status pesanan (BR-006, BR-020).
// Nominal bertahap tidak boleh melebihi nominal pembayaran (FR-RFD-001).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  statusRefundBerdasarkanNominal,
  validasiMetodeRefund,
  validasiNominalRefund,
} from '@/lib/pembatalan'
import {
  catatRiwayatRefund,
  notifikasiAdminUtamaRefund,
  notifikasiRefund,
  riwayatPembatalan,
  ringkasanRefundOrder,
} from '@/lib/pembatalanServer'
import { catatAudit } from '@/lib/pembayaranServer'
import { labelStatusRefund, saringFieldModal } from '@/lib/pesanan'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

const PILIHAN_ORDER = {
  id: true,
  orderNumber: true,
  customerId: true,
  orderStatus: true,
  refundStatus: true,
  refundNominal: true,
  paidAt: true,
  paymentProofStatus: true,
  totalAmount: true,
  cancelReason: true,
  cancelledAt: true,
  cancelledById: true,
  cancelledByRole: true,
  createdAt: true,
}

const PILIHAN_REFUND = {
  id: true,
  refundAmount: true,
  reason: true,
  status: true,
  metode: true,
  bukti: true,
  catatan: true,
  processedById: true,
  approvedById: true,
  approvedAt: true,
  refundedAt: true,
  createdAt: true,
}

async function izinAdmin(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return { user: null, respons: gagal('Silakan masuk terlebih dahulu', 401) }
  if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
    return { user: null, respons: gagal('Akses ditolak', 403) }
  }
  return { user, respons: null }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { user, respons } = await izinAdmin(request)
    if (respons || !user) return respons
    const { orderId } = await params
    const db = prisma()

    const order = await db.order.findUnique({ where: { id: orderId }, select: PILIHAN_ORDER })
    if (!order) return gagal('Pesanan tidak ditemukan', 404)

    const [refund, riwayat, ringkasan] = await Promise.all([
      db.refundRecord.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
        select: PILIHAN_REFUND,
      }),
      riwayatPembatalan(db, orderId),
      ringkasanRefundOrder(db, order as any),
    ])

    return NextResponse.json(
      saringFieldModal({
        pesanan: order,
        refund,
        riwayat,
        ringkasanRefund: ringkasan,
        labelStatusRefund: labelStatusRefund(order.refundStatus),
        hakAkses: { bisaMemproses: user.role === 'ADMIN_UTAMA' },
      })
    )
  } catch (error: any) {
    console.error('API GET /api/admin/refund/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memuat refund', 500)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { user, respons } = await izinAdmin(request)
    if (respons || !user) return respons
    const { orderId } = await params
    const body = await request.json().catch(() => null)
    if (!body) return gagal('Data refund tidak valid', 400)

    const aksi = String(body.action || '').toUpperCase()
    const nominalBaru = Number(body.nominal)
    const alasan = String(body.alasan || '').trim()
    const metodeMentah = String(body.metode || '').trim()
    const bukti = String(body.bukti || '').trim() || null
    const catatan = String(body.catatan || '').trim() || null
    const refundId = String(body.refundId || '').trim()
    const sekarang = new Date()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')
        const order = await tx.order.findUnique({ where: { id: orderId }, select: PILIHAN_ORDER })
        if (!order) throw new Error('Pesanan tidak ditemukan')
        if (order.orderStatus !== 'DIBATALKAN') {
          throw new Error('Refund hanya dapat diproses untuk pesanan yang dibatalkan')
        }
        if (
          !['PERLU_DIPROSES', 'DIKEMBALIKAN_SEBAGIAN', 'SELESAI'].includes(order.refundStatus)
        ) {
          throw new Error('Pesanan ini tidak memiliki kewajiban refund')
        }

        const records = await tx.refundRecord.findMany({
          where: { orderId },
          select: PILIHAN_REFUND,
        })
        const disetujui = records
          .filter((r: any) => r.status === 'SELESAI')
          .reduce((jumlah: number, r: any) => jumlah + Number(r.refundAmount || 0), 0)
        const menunggu = records
          .filter((r: any) => r.status === 'MENUNGGU_PERSETUJUAN')
          .reduce((jumlah: number, r: any) => jumlah + Number(r.refundAmount || 0), 0)
        const nominalDibayar = Number(order.refundNominal || order.totalAmount || 0)

        let ringkasan: Record<string, unknown> = {}

        if (aksi === 'AJUKAN') {
          const cek = validasiNominalRefund({
            nominalDibayar,
            totalDisetujui: disetujui,
            totalMenunggu: menunggu,
            nominalBaru,
          })
          if (!cek.valid) throw new Error(cek.alasan || 'Nominal refund tidak valid')
          const cekAlasan = alasan.length >= 3
          if (!cekAlasan) throw new Error('Alasan refund wajib diisi minimal 3 karakter')
          const cekMetode = validasiMetodeRefund(metodeMentah)
          if (!cekMetode.valid) throw new Error(cekMetode.alasan || 'Metode refund tidak valid')

          const dibuat = await tx.refundRecord.create({
            data: {
              orderId: order.id,
              orderOrderId: order.id,
              refundAmount: nominalBaru,
              reason: alasan,
              status: 'MENUNGGU_PERSETUJUAN',
              metode: cekMetode.metode,
              bukti,
              catatan,
              processedById: user.id,
              processorUserId: user.id,
              refundedAt: sekarang,
            },
            select: PILIHAN_REFUND,
          })
          await catatRiwayatRefund({
            client: tx,
            orderId: order.id,
            oldStatus: order.refundStatus,
            newStatus: 'PERLU_DIPROSES',
            reason: `Pengajuan refund ${nominalBaru} oleh ${user.role}: ${alasan}`,
            actorId: user.id,
            actorRole: user.role,
          })
          await catatAudit({
            actorId: user.id,
            actorRole: user.role,
            action: 'AJUKAN_REFUND',
            targetEntity: 'RefundRecord',
            targetId: dibuat.id,
            oldValue: { refundStatus: order.refundStatus, disetujui, menunggu },
            newValue: {
              refundStatus: 'PERLU_DIPROSES',
              refundAmount: nominalBaru,
              metode: cekMetode.metode,
            },
            reason: alasan,
            client: tx,
          })
          await notifikasiAdminUtamaRefund({
            client: tx,
            groupKey: `refund:pengajuan:${order.id}:${sekarang.getTime()}`,
            pesan: `Pengajuan refund ${order.orderNumber} sebesar ${nominalBaru} menunggu persetujuan Admin Utama. Alasan: ${alasan}`,
          })
          ringkasan = {
            refundId: dibuat.id,
            status: 'MENUNGGU_PERSETUJUAN',
            nominal: nominalBaru,
            sisa: cek.sisa - nominalBaru,
          }
        } else if (aksi === 'SETUJUI' || aksi === 'TOLAK') {
          if (user.role !== 'ADMIN_UTAMA') {
            throw new Error('Hanya Admin Utama yang dapat memproses pengajuan refund')
          }
          const target = refundId
            ? records.find((r: any) => r.id === refundId)
            : records.find((r: any) => r.status === 'MENUNGGU_PERSETUJUAN')
          if (!target || target.status !== 'MENUNGGU_PERSETUJUAN') {
            throw new Error('Pengajuan refund tidak ditemukan atau sudah diproses')
          }
          if (aksi === 'TOLAK' && alasan.length < 3) {
            throw new Error('Alasan penolakan wajib diisi minimal 3 karakter')
          }

          let statusRecord: string
          let metode: string | null = null
          let buktiProses: string | null = null
          let catatanProses: string | null = catatan

          if (aksi === 'SETUJUI') {
            const cekMetode = validasiMetodeRefund(metodeMentah)
            if (!cekMetode.valid) throw new Error(cekMetode.alasan || 'Metode refund wajib diisi')
            metode = cekMetode.metode
            buktiProses = bukti
            const tersedia = nominalDibayar - disetujui - (menunggu - Number(target.refundAmount))
            if (Number(target.refundAmount) > tersedia) {
              throw new Error('Total refund melebihi nominal pembayaran')
            }
            statusRecord = 'SELESAI'
          } else {
            statusRecord = 'DITOLAK'
          }

          await tx.refundRecord.update({
            where: { id: target.id },
            data: {
              status: statusRecord,
              metode,
              bukti: buktiProses,
              catatan: catatanProses,
              approvedById: user.id,
              approvedAt: sekarang,
              refundedAt: aksi === 'SETUJUI' ? sekarang : target.refundedAt,
            },
          })

          const disetujuiBaru =
            aksi === 'SETUJUI' ? disetujui + Number(target.refundAmount) : disetujui
          const menungguBaru = menunggu - Number(target.refundAmount)
          const statusRefundBaru = statusRefundBerdasarkanNominal({
            nominalDibayar,
            totalDisetujui: disetujuiBaru,
            totalMenunggu: menungguBaru,
          })
          await tx.order.update({
            where: { id: order.id },
            data: { refundStatus: statusRefundBaru },
          })
          await catatRiwayatRefund({
            client: tx,
            orderId: order.id,
            oldStatus: order.refundStatus,
            newStatus: statusRefundBaru,
            reason:
              aksi === 'SETUJUI'
                ? `Refund ${target.refundAmount} disetujui Admin Utama. Metode: ${metode}.${buktiProses ? ` Bukti: ${buktiProses}` : ''}`
                : `Pengajuan refund ${target.refundAmount} ditolak Admin Utama: ${alasan}`,
            actorId: user.id,
            actorRole: user.role,
          })
          await catatAudit({
            actorId: user.id,
            actorRole: user.role,
            action: aksi === 'SETUJUI' ? 'SETUJUI_REFUND' : 'TOLAK_REFUND',
            targetEntity: 'RefundRecord',
            targetId: target.id,
            oldValue: {
              status: target.status,
              refundStatus: order.refundStatus,
              nominal: target.refundAmount,
            },
            newValue: {
              status: statusRecord,
              refundStatus: statusRefundBaru,
              metode,
              bukti: buktiProses,
              totalDisetujui: disetujuiBaru,
              approvedAt: sekarang,
            },
            reason: alasan || null,
            client: tx,
          })
          await notifikasiRefund({
            client: tx,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
            groupKey: `refund:keputusan:${target.id}:${sekarang.getTime()}`,
            pesan:
              aksi === 'SETUJUI'
                ? `sebesar ${target.refundAmount} telah dikembalikan${buktiProses ? ` (bukti: ${buktiProses})` : ''}.`
                : `sebesar ${target.refundAmount} ditolak. Alasan: ${alasan}`,
          })
          ringkasan = {
            refundId: target.id,
            status: statusRecord,
            nominal: target.refundAmount,
            totalDisetujui: disetujuiBaru,
            statusRefund: statusRefundBaru,
          }
        } else {
          throw new Error('Aksi refund tidak dikenali')
        }

        const terkini = await tx.order.findUnique({
          where: { id: order.id },
          select: PILIHAN_ORDER,
        })
        return { ringkasan, pesanan: terkini }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({
      success: true,
      pesan:
        aksi === 'AJUKAN'
          ? 'Pengajuan refund berhasil dibuat dan menunggu persetujuan Admin Utama.'
          : aksi === 'SETUJUI'
            ? 'Refund disetujui dan dicatat sebagai selesai.'
            : 'Pengajuan refund ditolak dan dicatat.',
      ...hasil,
    })
  } catch (error: any) {
    console.error('API POST /api/admin/refund/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memproses refund', 409)
  }
}
