// src/app/api/admin/pembatalan/[orderId]/route.ts
// Detail, pembatalan per peran, dan koreksi Selesai oleh Admin Utama (Tahap 10).
// Setiap keputusan admin ditulis ke AdminAuditLog append-only (GR-06).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  penilaianPembatalan,
  statusSebelumSelesai,
  sudahDisetujuiFinal,
  validasiKoreksiSelesai,
} from '@/lib/pembatalan'
import {
  kembalikanStokSelesai,
  lepaskanStokTertahan,
  nominalPembayaran,
  notifikasiPembatalan,
  riwayatPembatalan,
  ringkasanRefundOrder,
} from '@/lib/pembatalanServer'
import { tutupUsulanTertunda } from '@/lib/jadwalServer'
import {
  buatNotifikasi,
  catatAudit,
  catatRiwayatStatus,
  selesaikanReminder,
} from '@/lib/pembayaranServer'
import { saringFieldModal } from '@/lib/pesanan'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

const PILIHAN_ORDER = {
  id: true,
  orderNumber: true,
  customerId: true,
  orderStatus: true,
  paymentProofStatus: true,
  paymentReviewStatus: true,
  paidAt: true,
  refundStatus: true,
  refundNominal: true,
  totalAmount: true,
  pickupStatus: true,
  pickupSundayDate: true,
  cancelledAt: true,
  cancelledById: true,
  cancelledByRole: true,
  cancelReason: true,
  cancelReasonTambahan: true,
  stockReleased: true,
  stockSold: true,
  completedAt: true,
  completedById: true,
  koreksiSelesaiAt: true,
  koreksiSelesaiById: true,
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

    const [items, riwayat, refund, ringkasan, jumlahAdminUtama] = await Promise.all([
      db.orderItem.findMany({
        where: { orderId },
        select: {
          id: true,
          bookId: true,
          quantity: true,
          snapshotCode: true,
          snapshotTitle: true,
          snapshotSellingPrice: true,
          subtotal: true,
        },
      }),
      riwayatPembatalan(db, orderId),
      db.refundRecord.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          refundAmount: true,
          status: true,
          reason: true,
          metode: true,
          bukti: true,
          catatan: true,
          processedById: true,
          approvedById: true,
          approvedAt: true,
          refundedAt: true,
          createdAt: true,
        },
      }),
      ringkasanRefundOrder(db, order as any),
      db.user.count({ where: { role: 'ADMIN_UTAMA', isActive: true } }),
    ])

    const statusTujuan = statusSebelumSelesai(riwayat as any)
    return NextResponse.json(
      saringFieldModal({
        pesanan: order,
        items,
        riwayat,
        refund,
        ringkasanRefund: ringkasan,
        statusSebelumSelesai: statusTujuan,
        hakAkses: {
          bisaBatalkan: !['SELESAI', 'DIBATALKAN'].includes(order.orderStatus),
          bisaKoreksi: user.role === 'ADMIN_UTAMA',
          butuhAlasanTambahan:
            user.role === 'ADMIN_UTAMA' &&
            sudahDisetujuiFinal(order as any) &&
            jumlahAdminUtama === 1,
        },
      })
    )
  } catch (error: any) {
    console.error('API GET /api/admin/pembatalan/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memuat detail pembatalan', 500)
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
    if (!body) return gagal('Data keputusan tidak valid', 400)

    const aksi = String(body.action || '').toUpperCase()
    const alasan = String(body.alasan || '').trim()
    const alasanTambahan = String(body.alasanTambahan || '').trim()
    const actor = { id: user.id, role: user.role }
    const sekarang = new Date()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')
        const order = await tx.order.findUnique({ where: { id: orderId }, select: PILIHAN_ORDER })
        if (!order) throw new Error('Pesanan tidak ditemukan')

        let ringkasan: Record<string, unknown> = {}

        if (aksi === 'BATALKAN') {
          if (order.orderStatus === 'DIBATALKAN') {
            return {
              sudahDibatalkan: true,
              pesanan: order,
              stok: { rilis: [], dilewati: [] },
            }
          }

          const jumlahAdminUtama = await tx.user.count({
            where: { role: 'ADMIN_UTAMA', isActive: true },
          })
          const penilaian = penilaianPembatalan({
            peran: actor.role as 'ADMIN_BIASA' | 'ADMIN_UTAMA',
            orderStatus: order.orderStatus,
            paymentProofStatus: order.paymentProofStatus,
            paymentReviewStatus: order.paymentReviewStatus,
            paidAt: order.paidAt,
            alasan,
            alasanTambahan,
            jumlahAdminUtama,
          })
          if (!penilaian.boleh) throw new Error(penilaian.alasan || 'Pembatalan ditolak')
          if (order.stockReleased) {
            throw new Error('Stok pesanan ini sudah dilepaskan sebelumnya')
          }

          const nominal = await nominalPembayaran(tx, order as any)
          const stok = await lepaskanStokTertahan({
            client: tx,
            order: { id: order.id, orderNumber: order.orderNumber },
            actorId: actor.id,
            sekarang,
            alasan,
            stockReleased: order.stockReleased,
          })

          await tutupUsulanTertunda(tx, order.id, actor.id, actor.role, 'Pesanan dibatalkan admin')
          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: 'DIBATALKAN',
              cancelReason: alasan,
              cancelReasonTambahan: penilaian.perluAlasanTambahan ? alasanTambahan : null,
              cancelledAt: sekarang,
              cancelledById: actor.id,
              cancelledByRole: actor.role,
              stockReleased: true,
              stockReleasedAt: sekarang,
              stockReleasedById: actor.id,
              refundStatus: penilaian.statusRefundAwal,
              refundNominal:
                penilaian.statusRefundAwal === 'PERLU_DIPROSES' ? nominal : null,
              noShowHoldDeadline: null,
            },
          })
          await catatRiwayatStatus({
            orderId: order.id,
            domain: 'ORDER',
            oldStatus: order.orderStatus,
            newStatus: 'DIBATALKAN',
            reason:
              penilaian.perluAlasanTambahan && alasanTambahan
                ? `${alasan} — alasan tambahan: ${alasanTambahan}`
                : alasan,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          if (penilaian.statusRefundAwal === 'PERLU_DIPROSES') {
            await catatRiwayatStatus({
              orderId: order.id,
              domain: 'REFUND',
              oldStatus: order.refundStatus,
              newStatus: 'PERLU_DIPROSES',
              reason: 'Pembatalan pesanan lunas; refund dikelola terpisah dan belum selesai',
              actorId: actor.id,
              actorRole: actor.role,
              client: tx,
            })
          }
          await selesaikanReminder({
            orderId: order.id,
            types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN', 'PENGINGAT_JADWAL'],
            client: tx,
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'BATALKAN_PESANAN',
            targetEntity: 'Order',
            targetId: order.id,
            oldValue: {
              orderStatus: order.orderStatus,
              refundStatus: order.refundStatus,
              stockReleased: order.stockReleased,
            },
            newValue: {
              orderStatus: 'DIBATALKAN',
              refundStatus: penilaian.statusRefundAwal,
              stockReleased: true,
              refundNominal: nominal,
              cancelReason: alasan,
              cancelReasonTambahan: penilaian.perluAlasanTambahan ? alasanTambahan : null,
            },
            reason:
              penilaian.perluAlasanTambahan && alasanTambahan
                ? `${alasan} — alasan tambahan: ${alasanTambahan}`
                : alasan,
            client: tx,
          })

          const keteranganStok =
            stok.dilewati.length > 0
              ? `Stok dikembalikan untuk ${stok.rilis.length} judul aktif; ${stok.dilewati.length} dilewati.`
              : `Stok dikembalikan untuk ${stok.rilis.length} judul.`
          await notifikasiPembatalan({
            client: tx,
            customerId: order.customerId,
            orderNumber: order.orderNumber,
            actorName: user.name || user.email,
            sekarang,
            alasan,
            keteranganStok,
          })
          ringkasan = {
            orderStatus: 'DIBATALKAN',
            refundStatus: penilaian.statusRefundAwal,
            refundNominal: nominal,
            stokDikembalikan: stok.rilis.length,
            stokDilewati: stok.dilewati.length,
            alasanTambahanDicatat: penilaian.perluAlasanTambahan,
          }
        } else if (aksi === 'KOREKSI_SELESAI') {
          const riwayat = await tx.orderStatusHistory.findMany({
            where: { orderId, domain: 'ORDER' },
            orderBy: { createdAt: 'desc' },
          })
          const statusTujuan = statusSebelumSelesai(riwayat as any)
          const cek = validasiKoreksiSelesai({
            peran: actor.role as 'ADMIN_UTAMA',
            orderStatus: order.orderStatus,
            stockSold: order.stockSold,
            alasan,
            statusSebelumnya: statusTujuan,
          })
          if (!cek.valid || !cek.statusTujuan) {
            throw new Error(cek.alasan || 'Koreksi status Selesai ditolak')
          }

          const stok = await kembalikanStokSelesai({
            client: tx,
            order: { id: order.id, orderNumber: order.orderNumber },
            actorId: actor.id,
            sekarang,
            alasan,
          })
          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: cek.statusTujuan,
              stockSold: false,
              completedAt: null,
              completedById: null,
              koreksiSelesaiAt: sekarang,
              koreksiSelesaiById: actor.id,
            },
          })
          await catatRiwayatStatus({
            orderId: order.id,
            domain: 'ORDER',
            oldStatus: 'SELESAI',
            newStatus: cek.statusTujuan,
            reason: `Koreksi Admin Utama: ${alasan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'KOREKSI_SELESAI',
            targetEntity: 'Order',
            targetId: order.id,
            oldValue: {
              orderStatus: 'SELESAI',
              stockSold: true,
              completedAt: order.completedAt,
            },
            newValue: {
              orderStatus: cek.statusTujuan,
              stockSold: false,
              completedAt: null,
              stockDikembalikan: stok,
            },
            reason: alasan,
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `pembatalan:koreksi-selesai:${order.id}:${sekarang.getTime()}`,
            message:
              `Status pesanan ${order.orderNumber} dikoreksi dari Selesai menjadi ` +
              `${cek.statusTujuan} oleh Admin Utama. Stok buku dikembalikan. Alasan: ${alasan}`,
            client: tx,
          })
          await buatNotifikasi({
            userId: actor.id,
            groupKey: `pembatalan:koreksi-selesai-admin:${order.id}:${sekarang.getTime()}`,
            message: `Koreksi status Selesai pesanan ${order.orderNumber} berhasil dicatat di audit.`,
            client: tx,
          })
          ringkasan = {
            orderStatus: cek.statusTujuan,
            stockSold: false,
            stokDikembalikan: stok.length,
          }
        } else {
          throw new Error('Aksi pembatalan tidak dikenali')
        }

        const terkini = await tx.order.findUnique({
          where: { id: order.id },
          select: PILIHAN_ORDER,
        })
        return {
          sudahDibatalkan: Boolean(ringkasan.sudahDibatalkan),
          ringkasan,
          pesanan: terkini,
        }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({
      success: true,
      pesan: hasil.sudahDibatalkan
        ? 'Pesanan sudah dibatalkan sebelumnya. Tidak ada perubahan baru.'
        : aksi === 'KOREKSI_SELESAI'
          ? 'Koreksi status Selesai berhasil dan stok dikembalikan.'
          : 'Pesanan berhasil dibatalkan.',
      ...hasil,
    })
  } catch (error: any) {
    console.error('API POST /api/admin/pembatalan/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memproses pembatalan', 409)
  }
}
