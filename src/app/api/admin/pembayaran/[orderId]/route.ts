// src/app/api/admin/pembayaran/[orderId]/route.ts
// Detail & keputusan pembayaran: verifikasi 2 tahap, tolak 2x, bukti baru, koreksi,
// pembayaran CFD, persetujuan ubah metode, dan persetujuan perpanjangan tenggat.
// Semua keputusan dicatat di riwayat status + AdminAuditLog (append-only, GR-06).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  ambilAlih,
  ajukanPemeriksaanAwal,
  hitungTenggatPerpanjangan,
  lanjutkanTimer,
  mintaBuktiBaru,
  putuskanFinal,
  saringDataAdminBiasa,
  statusPesananSetelahLunas,
  validasiBayarCfd,
  validasiKoreksi,
  type StateVerifikasi,
} from '@/lib/pembayaran'
import {
  ambilBuktiTerkini,
  buatNotifikasi,
  buatReminder,
  catatAudit,
  catatRiwayatStatus,
  notifikasiAdmins,
  selesaikanReminder,
} from '@/lib/pembayaranServer'

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
  paymentReviewerId: true,
  paymentRejectedCount: true,
  paymentRejectReason: true,
  proofRequestReason: true,
  proofDeadline: true,
  paymentDeadline: true,
  paymentMethod: true,
  pickupStatus: true,
  totalAmount: true,
  pausedAt: true,
  pausedRemainingSeconds: true,
  methodChangeStatus: true,
  methodChangeTo: true,
  methodChangeReason: true,
  paidAt: true,
  stockReleased: true,
  createdAt: true,
  updatedAt: true,
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Silakan masuk terlebih dahulu', 401)
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return gagal('Akses ditolak', 403)
    }

    const { orderId } = await params
    const order = await prisma().order.findUnique({
      where: { id: orderId },
      select: PILIHAN_ORDER,
    })
    if (!order) return gagal('Pesanan tidak ditemukan', 404)

    const alokasi = await prisma().orderPaymentAllocation.findMany({
      where: { orderId },
      select: { paymentEvidenceId: true },
    })
    const idBukti = [...new Set(alokasi.map((a) => a.paymentEvidenceId))]
    const riwayatBukti = idBukti.length
      ? await prisma().paymentEvidence.findMany({
          where: { id: { in: idBukti } },
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            imageUrl: true,
            status: true,
            amount: true,
            isLatest: true,
            rejectionCount: true,
            rejectionReason: true,
            proofRequestReason: true,
            proofDeadline: true,
            initialCheckedById: true,
            finalApprovedById: true,
            uploadedAt: true,
          },
        })
      : []

    const [verifikasi, perubahanMetode, perpanjangan, riwayatStatus] = await Promise.all([
      prisma().paymentVerificationRecord.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma().paymentMethodChangeRequest.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma().paymentDeadlineExtension.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma().orderStatusHistory.findMany({
        where: { orderId, domain: { in: ['ORDER', 'PAYMENT'] } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const data: any = {
      pesanan: order,
      riwayatBukti,
      verifikasi,
      perubahanMetode,
      perpanjangan,
      riwayatStatus,
      hakAkses: {
        bisaPutusFinal: user.role === 'ADMIN_UTAMA',
        bisaKoreksi: user.role === 'ADMIN_UTAMA',
        bisaPeriksaAwal: user.role === 'ADMIN_BIASA',
      },
    }
    return NextResponse.json(
      user.role === 'ADMIN_BIASA' ? saringDataAdminBiasa(data) : data
    )
  } catch (error: any) {
    console.error('API GET /api/admin/pembayaran/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memuat pembayaran', 500)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Silakan masuk terlebih dahulu', 401)
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return gagal('Akses ditolak', 403)
    }

    const { orderId } = await params
    const body = await request.json().catch(() => null)
    if (!body) return gagal('Data keputusan tidak valid', 400)

    const aksi = String(body.action || '').toUpperCase()
    const alasan = String(body.alasan || '').trim()
    const actor = { id: user.id, role: user.role }
    const sekarang = new Date()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')

        const order = await tx.order.findUnique({ where: { id: orderId } })
        if (!order) throw new Error('Pesanan tidak ditemukan')

        const bukti = await ambilBuktiTerkini(orderId, tx)
        const state: StateVerifikasi = {
          orderStatus: order.orderStatus,
          paymentProofStatus: order.paymentProofStatus,
          paymentReviewStatus: order.paymentReviewStatus,
          paymentReviewerId: order.paymentReviewerId,
          paymentRejectedCount: order.paymentRejectedCount,
        }

        let ringkasan: Record<string, unknown> = {}

        if (aksi === 'PERIKSA_AWAL') {
          const keputusan = String(body.keputusan || '').toUpperCase()
          if (keputusan !== 'DITERUSKAN' && keputusan !== 'DITOLAK') {
            throw new Error('Keputusan pemeriksaan tidak valid')
          }
          const verifikasiHasil = ajukanPemeriksaanAwal(
            state,
            actor,
            keputusan as 'DITERUSKAN' | 'DITOLAK',
            alasan
          )
          if (!verifikasiHasil.boleh) throw new Error(verifikasiHasil.alasan || 'Ditolak')

          const statusBukti = verifikasiHasil.statusBuktiAkhir
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentReviewStatus: verifikasiHasil.state.paymentReviewStatus,
              paymentReviewerId: verifikasiHasil.state.paymentReviewerId,
              paymentProofStatus: statusBukti,
              paymentRejectReason: keputusan === 'DITOLAK' ? alasan : null,
            },
          })
          if (bukti) {
            await tx.paymentEvidence.update({
              where: { id: bukti.id },
              data: {
                status: statusBukti,
                initialCheckedById: actor.id,
                initialCheckedAt: sekarang,
                rejectionReason: keputusan === 'DITOLAK' ? alasan : null,
              },
            })
          }
          await tx.paymentVerificationRecord.create({
            data: {
              orderId,
              evidenceId: bukti?.id || '',
              stage: 'PEMERIKSAAN_AWAL',
              decision: keputusan,
              actorId: actor.id,
              actorRole: actor.role,
              reason: alasan || null,
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PAYMENT',
            oldStatus: order.paymentProofStatus,
            newStatus: statusBukti,
            reason:
              keputusan === 'DITERUSKAN'
                ? 'Pemeriksaan awal diteruskan ke Admin Utama'
                : `Pemeriksaan awal menolak bukti: ${alasan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })

          if (keputusan === 'DITERUSKAN') {
            await selesaikanReminder({
              orderId,
              types: ['PENGINGAT_BUKTI'],
              client: tx,
            })
            await buatReminder({ orderId, type: 'PENGINGAT_PUTUSAN', client: tx })
            await notifikasiAdmins({
              groupKey: `putusan:menunggu:${orderId}:${sekarang.getTime()}`,
              message: `Bukti pesanan ${order.orderNumber} menunggu putusan final Admin Utama.`,
              client: tx,
            })
          } else {
            await selesaikanReminder({
              orderId,
              types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN'],
              client: tx,
            })
            await buatNotifikasi({
              userId: order.customerId,
              groupKey: `bukti:ditolak-awal:${orderId}:${sekarang.getTime()}`,
              message: `Bukti pesanan ${order.orderNumber} perlu diganti. Alasan: ${alasan}`,
              client: tx,
            })
          }

          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'PERIKSA_AWAL_PEMBAYARAN',
            targetEntity: 'PaymentEvidence',
            targetId: bukti?.id || orderId,
            oldValue: { status: order.paymentProofStatus },
            newValue: { status: statusBukti, keputusan },
            reason: alasan || 'Pemeriksaan awal diteruskan',
            client: tx,
          })
          ringkasan = { keputusan, statusBukti, statusReview: verifikasiHasil.state.paymentReviewStatus }
        } else if (aksi === 'PUTUS_FINAL') {
          const keputusan = String(body.keputusan || '').toUpperCase()
          if (keputusan !== 'DISETUJUI' && keputusan !== 'DITOLAK') {
            throw new Error('Keputusan final tidak valid')
          }
          const verifikasiHasil = putuskanFinal(
            state,
            actor,
            keputusan as 'DISETUJUI' | 'DITOLAK',
            alasan,
            order.pickupStatus
          )
          if (!verifikasiHasil.boleh) throw new Error(verifikasiHasil.alasan || 'Ditolak')

          const statusBuktiAkhir = verifikasiHasil.statusBuktiAkhir
          const statusOrder = verifikasiHasil.state.orderStatus
          await tx.order.update({
            where: { id: orderId },
            data: {
              orderStatus: statusOrder,
              paymentProofStatus: statusBuktiAkhir,
              paymentReviewStatus: verifikasiHasil.state.paymentReviewStatus,
              paymentRejectedCount: verifikasiHasil.state.paymentRejectedCount,
              paymentRejectReason: keputusan === 'DITOLAK' ? alasan : null,
              paidAt: keputusan === 'DISETUJUI' ? sekarang : null,
            },
          })
          if (bukti) {
            await tx.paymentEvidence.update({
              where: { id: bukti.id },
              data: {
                status: statusBuktiAkhir,
                rejectionCount: verifikasiHasil.state.paymentRejectedCount,
                rejectionReason: keputusan === 'DITOLAK' ? alasan : null,
                finalApprovedById: keputusan === 'DISETUJUI' ? actor.id : null,
                finalDecisionAt: sekarang,
              },
            })
          }
          await tx.paymentVerificationRecord.create({
            data: {
              orderId,
              evidenceId: bukti?.id || '',
              stage: 'KEPUTUSAN_FINAL',
              decision: keputusan,
              actorId: actor.id,
              actorRole: actor.role,
              reason: alasan || null,
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PAYMENT',
            oldStatus: order.paymentProofStatus,
            newStatus: statusBuktiAkhir,
            reason: `Putusan final Admin Utama: ${keputusan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          if (statusOrder !== order.orderStatus) {
            await catatRiwayatStatus({
              orderId,
              domain: 'ORDER',
              oldStatus: order.orderStatus,
              newStatus: statusOrder,
              reason: 'Pembayaran disetujui final Admin Utama (OD-01)',
              actorId: actor.id,
              actorRole: actor.role,
              client: tx,
            })
          }
          await selesaikanReminder({
            orderId,
            types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN'],
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `pembayaran:putusan:${orderId}:${sekarang.getTime()}`,
            message:
              keputusan === 'DISETUJUI'
                ? `Pembayaran pesanan ${order.orderNumber} disetujui.`
                : `Pembayaran pesanan ${order.orderNumber} ditolak. Alasan: ${alasan}`,
            client: tx,
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'PUTUS_FINAL_PEMBAYARAN',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { orderStatus: order.orderStatus, statusBukti: order.paymentProofStatus },
            newValue: { orderStatus: statusOrder, statusBukti: statusBuktiAkhir },
            reason: alasan || 'Persetujuan final Admin Utama',
            client: tx,
          })
          ringkasan = {
            keputusan,
            statusOrder,
            statusBukti: statusBuktiAkhir,
            jumlahPenolakan: verifikasiHasil.state.paymentRejectedCount,
          }
        } else if (aksi === 'MINTA_BUKTI_BARU') {
          const tenggatDiajukan =
            body.tenggatBaru ||
            hitungTenggatPerpanjangan(order.paymentDeadline, 24, sekarang).toISOString()
          const verifikasiHasil = mintaBuktiBaru(
            state,
            actor,
            alasan,
            tenggatDiajukan,
            sekarang
          )
          if (!verifikasiHasil.boleh) throw new Error(verifikasiHasil.alasan || 'Ditolak')
          const tenggatBaru = verifikasiHasil.tenggatBaru!

          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentProofStatus: 'PERLU_BUKTI_BARU',
              paymentReviewStatus: 'BELUM_DIPERIKSA',
              paymentReviewerId: null,
              proofRequestReason: alasan,
              paymentRejectReason: alasan,
              proofDeadline: tenggatBaru,
              paymentDeadline: tenggatBaru,
            },
          })
          if (bukti) {
            await tx.paymentEvidence.update({
              where: { id: bukti.id },
              data: {
                status: 'PERLU_BUKTI_BARU',
                proofRequestReason: alasan,
                proofDeadline: tenggatBaru,
                rejectionReason: alasan,
              },
            })
          }
          await tx.paymentVerificationRecord.create({
            data: {
              orderId,
              evidenceId: bukti?.id || '',
              stage: 'PERMINTAAN_BUKTI_BARU',
              decision: 'DIMINTA_BARU',
              actorId: actor.id,
              actorRole: actor.role,
              reason: alasan,
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PAYMENT',
            oldStatus: order.paymentProofStatus,
            newStatus: 'PERLU_BUKTI_BARU',
            reason: `Permintaan bukti baru: ${alasan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanReminder({
            orderId,
            types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN'],
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `bukti:diminta-baru:${orderId}:${sekarang.getTime()}`,
            message:
              `Bukti pembayaran pesanan ${order.orderNumber} perlu diunggah ulang. ` +
              `Alasan: ${alasan}. Tenggat baru: ${tenggatBaru.toISOString()}.`,
            client: tx,
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'MINTA_BUKTI_BARU',
            targetEntity: 'PaymentEvidence',
            targetId: bukti?.id || orderId,
            oldValue: { status: order.paymentProofStatus, paymentDeadline: order.paymentDeadline },
            newValue: { status: 'PERLU_BUKTI_BARU', paymentDeadline: tenggatBaru },
            reason: alasan,
            client: tx,
          })
          ringkasan = { statusBukti: 'PERLU_BUKTI_BARU', tenggatBaru }
        } else if (aksi === 'AMBIL_ALIH') {
          const verifikasiHasil = ambilAlih(state, actor)
          if (!verifikasiHasil.boleh) throw new Error(verifikasiHasil.alasan || 'Ditolak')
          await tx.order.update({
            where: { id: orderId },
            data: {
              paymentReviewStatus: 'DIAMBIL_ALIH_UTAMA',
              paymentReviewerId: actor.id,
            },
          })
          if (bukti) {
            await tx.paymentEvidence.update({
              where: { id: bukti.id },
              data: { initialCheckedById: actor.id },
            })
          }
          await tx.paymentVerificationRecord.create({
            data: {
              orderId,
              evidenceId: bukti?.id || '',
              stage: 'PENGAMBILAN_ALIH',
              decision: 'DIAMBIL_ALIH',
              actorId: actor.id,
              actorRole: actor.role,
              reason: alasan || 'Penolakan kedua: kasus diambil alih Admin Utama',
            },
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'AMBIL_ALIH_PEMBAYARAN',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { statusReview: order.paymentReviewStatus },
            newValue: { statusReview: 'DIAMBIL_ALIH_UTAMA' },
            reason: alasan || 'Penolakan kedua',
            client: tx,
          })
          ringkasan = { statusReview: 'DIAMBIL_ALIH_UTAMA' }
        } else if (aksi === 'KOREKSI') {
          const perubahan: Record<string, unknown> = {}
          if (Object.prototype.hasOwnProperty.call(body, 'paymentMethod')) {
            perubahan.paymentMethod = body.paymentMethod
          }
          if (Object.prototype.hasOwnProperty.call(body, 'paymentProofStatus')) {
            perubahan.paymentProofStatus = body.paymentProofStatus
          }
          const cek = validasiKoreksi({ actorRole: user.role, alasan, perubahan })
          if (!cek.valid) throw new Error(cek.alasan || 'Koreksi ditolak')
          if (Object.keys(perubahan).length === 0) {
            throw new Error('Tidak ada data koreksi yang sah')
          }
          if (
            perubahan.paymentProofStatus &&
            !['BELUM_DIUNGGAH', 'MENUNGGU_VERIFIKASI', 'PERLU_BUKTI_BARU', 'TERVERIFIKASI'].includes(
              String(perubahan.paymentProofStatus)
            )
          ) {
            throw new Error('Status bukti tidak dikenali')
          }

          await tx.order.update({
            where: { id: orderId },
            data: { ...perubahan },
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'KOREKSI_PEMBAYARAN',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: {
              paymentMethod: order.paymentMethod,
              paymentProofStatus: order.paymentProofStatus,
            },
            newValue: {
              paymentMethod: perubahan.paymentMethod ?? order.paymentMethod,
              paymentProofStatus: perubahan.paymentProofStatus ?? order.paymentProofStatus,
            },
            reason: alasan,
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `pembayaran:koreksi:${orderId}:${sekarang.getTime()}`,
            message: `Pembayaran pesanan ${order.orderNumber} dikoreksi Admin Utama. Alasan: ${alasan}`,
            client: tx,
          })
          ringkasan = { dikoreksi: perubahan }
        } else if (aksi === 'BAYAR_CFD') {
          const cek = validasiBayarCfd({ actorRole: user.role, orderStatus: order.orderStatus })
          if (!cek.valid) throw new Error(cek.alasan || 'Pembayaran CFD ditolak')
          const statusOrder = statusPesananSetelahLunas(order.pickupStatus)

          await tx.order.update({
            where: { id: orderId },
            data: {
              orderStatus: statusOrder,
              paymentProofStatus: 'TERVERIFIKASI',
              paymentReviewStatus: 'DISETUJUI',
              paymentMethod: 'TUNAI_CFD',
              paidAt: sekarang,
              paymentRecordedById: actor.id,
              paymentRecordedMethod: 'TUNAI_CFD',
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PAYMENT',
            oldStatus: order.paymentProofStatus,
            newStatus: 'TERVERIFIKASI',
            reason: 'Pembayaran langsung dicatat di booth CFD',
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'ORDER',
            oldStatus: order.orderStatus,
            newStatus: statusOrder,
            reason: 'Pembayaran langsung di CFD (OD-01)',
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanReminder({
            orderId,
            types: ['PENGINGAT_BUKTI', 'PENGINGAT_PUTUSAN'],
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `pembayaran:cfd:${orderId}:${sekarang.getTime()}`,
            message: `Pembayaran tunai pesanan ${order.orderNumber} telah dicatat.`,
            client: tx,
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'CATAT_BAYAR_CFD',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { orderStatus: order.orderStatus, paymentMethod: order.paymentMethod },
            newValue: { orderStatus: statusOrder, paymentMethod: 'TUNAI_CFD' },
            reason: alasan || 'Pembayaran langsung di booth CFD',
            client: tx,
          })
          ringkasan = { statusOrder, metode: 'TUNAI_CFD' }
        } else if (aksi === 'SETUJU_METODE' || aksi === 'TOLAK_METODE') {
          const permintaan = await tx.paymentMethodChangeRequest.findFirst({
            where: { orderId, status: 'MENUNGGU_PERSETUJUAN' },
            orderBy: { createdAt: 'desc' },
          })
          if (!permintaan) throw new Error('Tidak ada pengajuan ubah metode yang menunggu')
          if (!alasan && aksi === 'TOLAK_METODE') {
            throw new Error('Alasan penolakan ubah metode wajib diisi')
          }

          const lanjut = lanjutkanTimer({
            paymentDeadline: order.paymentDeadline,
            sekarang,
            pausedRemainingSeconds: order.pausedRemainingSeconds,
            pausedAt: order.pausedAt,
          })
          const disetujui = aksi === 'SETUJU_METODE'
          await tx.paymentMethodChangeRequest.update({
            where: { id: permintaan.id },
            data: {
              status: disetujui ? 'DISETUJUI' : 'DITOLAK',
              decidedById: actor.id,
              decidedAt: sekarang,
            },
          })
          await tx.order.update({
            where: { id: orderId },
            data: {
              methodChangeStatus: disetujui ? 'DISETUJUI' : 'DITOLAK',
              methodChangeDecidedAt: sekarang,
              methodChangeDecidedById: actor.id,
              paymentMethod: disetujui ? permintaan.toMethod : order.paymentMethod,
              ...lanjut,
            },
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: disetujui ? 'SETUJU_UBAH_METODE' : 'TOLAK_UBAH_METODE',
            targetEntity: 'PaymentMethodChangeRequest',
            targetId: permintaan.id,
            oldValue: { paymentMethod: order.paymentMethod, sisaDetik: order.pausedRemainingSeconds },
            newValue: {
              paymentMethod: disetujui ? permintaan.toMethod : order.paymentMethod,
              paymentDeadline: lanjut.paymentDeadline,
            },
            reason: alasan || 'Keputusan pengajuan ubah metode',
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `metode:keputusan:${orderId}:${sekarang.getTime()}`,
            message:
              `Pengajuan ubah metode pesanan ${order.orderNumber} ${disetujui ? 'disetujui' : 'ditolak'}. ` +
              `Hitung mundur dilanjutkan dari sisa waktu.`,
            client: tx,
          })
          ringkasan = { disetujui, paymentDeadline: lanjut.paymentDeadline }
        } else if (aksi === 'SETUJU_TENGGAT' || aksi === 'TOLAK_TENGGAT') {
          const permintaan = await tx.paymentDeadlineExtension.findFirst({
            where: { orderId, status: 'MENUNGGU_PERSETUJUAN' },
            orderBy: { createdAt: 'desc' },
          })
          if (!permintaan) throw new Error('Tidak ada pengajuan tenggat yang menunggu')
          const disetujui = aksi === 'SETUJU_TENGGAT'
          if (disetujui) {
            await tx.order.update({
              where: { id: orderId },
              data: { paymentDeadline: permintaan.proposedDeadline },
            })
          }
          await tx.paymentDeadlineExtension.update({
            where: { id: permintaan.id },
            data: {
              status: disetujui ? 'DISETUJUI' : 'DITOLAK',
              approvedDeadline: disetujui ? permintaan.proposedDeadline : null,
              decidedById: actor.id,
              decidedAt: sekarang,
            },
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: disetujui ? 'SETUJU_TENGGAT' : 'TOLAK_TENGGAT',
            targetEntity: 'PaymentDeadlineExtension',
            targetId: permintaan.id,
            oldValue: { paymentDeadline: order.paymentDeadline },
            newValue: {
              paymentDeadline: disetujui ? permintaan.proposedDeadline : order.paymentDeadline,
            },
            reason: alasan || permintaan.reason,
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `tenggat:keputusan:${orderId}:${sekarang.getTime()}`,
            message:
              `Pengajuan perpanjangan pesanan ${order.orderNumber} ${disetujui ? 'disetujui' : 'ditolak'}.`,
            client: tx,
          })
          ringkasan = { disetujui, paymentDeadline: disetujui ? permintaan.proposedDeadline : order.paymentDeadline }
        } else {
          throw new Error('Aksi tidak dikenali')
        }

        const terkini = await tx.order.findUnique({ where: { id: orderId }, select: PILIHAN_ORDER })
        return { ringkasan, pesanan: terkini, statusReview: state.paymentReviewStatus }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({
      success: true,
      pesan: 'Keputusan pembayaran berhasil dicatat.',
      ...(user.role === 'ADMIN_BIASA' ? saringDataAdminBiasa(hasil) : hasil),
    })
  } catch (error: any) {
    console.error('API POST /api/admin/pembayaran/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memproses keputusan', 409)
  }
}
