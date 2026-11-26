// src/app/api/pembayaran/bukti/route.ts
// Unggah bukti QRIS oleh Customer. Satu bukti dapat dialokasikan ke banyak pesanan (OD-03).
// Race upload-vs-auto-cancel diselesaikan dengan FOR UPDATE pada baris Order yang sama (BR-015).

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  bolehUnggahBukti,
  buktiTepatWaktu,
  validasiAlokasiMultiOrder,
  validasiFileGambar,
  validasiTandaTanganGambar,
} from '@/lib/pembayaran'
import {
  buatReminder,
  catatRiwayatStatus,
  notifikasiAdmins,
  simpanBerkas,
  hapusBerkas,
  type BerkasServer,
} from '@/lib/pembayaranServer'

function adalahBerkas(nilai: unknown): nilai is BerkasServer {
  return Boolean(
    nilai &&
      typeof nilai === 'object' &&
      typeof (nilai as BerkasServer).arrayBuffer === 'function' &&
      typeof (nilai as BerkasServer).type === 'string' &&
      typeof (nilai as BerkasServer).size === 'number'
  )
}

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return gagal('Anda harus login sebagai Customer untuk mengunggah bukti', 401)
    }

    const form = await request.formData()
    const berkas = form.get('file')
    if (!adalahBerkas(berkas)) {
      return gagal('Berkas bukti pembayaran wajib diunggah', 400)
    }

    const cekFile = validasiFileGambar({
      name: berkas.name,
      type: berkas.type,
      size: berkas.size,
    })
    if (!cekFile.valid) return gagal(cekFile.alasan || 'Berkas tidak valid', 400)

    const buffer = Buffer.from(await berkas.arrayBuffer())
    const cekTandaTangan = validasiTandaTanganGambar(
      new Uint8Array(buffer),
      berkas.type.toLowerCase()
    )
    if (!cekTandaTangan.valid) {
      return gagal(cekTandaTangan.alasan || 'Isi berkas bukan gambar', 400)
    }

    const mentah = String(form.get('orderIds') ?? '').trim()
    let daftarId: string[] = []
    if (mentah) {
      try {
        const diurai = JSON.parse(mentah)
        daftarId = Array.isArray(diurai) ? diurai.map(String) : []
      } catch {
        return gagal('Daftar pesanan tidak valid', 400)
      }
    } else {
      daftarId = form
        .getAll('orderId')
        .map(String)
        .filter((nilai) => nilai.length > 0)
    }
    daftarId = [...new Set(daftarId.map((nilai) => nilai.trim()).filter(Boolean))]

    const totalTransfer = Number(String(form.get('totalTransfer') ?? ''))
    if (!Number.isFinite(totalTransfer) || totalTransfer <= 0) {
      return gagal('Nominal transfer wajib diisi dengan angka', 400)
    }

    const orders = await prisma().order.findMany({
      where: { id: { in: daftarId }, customerId: user.id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentProofStatus: true,
        paymentDeadline: true,
        pausedAt: true,
        pausedRemainingSeconds: true,
        totalAmount: true,
      },
    })
    if (orders.length !== daftarId.length) {
      return gagal('Satu atau lebih pesanan tidak ditemukan atau bukan milik Anda', 404)
    }

    const penilaian = validasiAlokasiMultiOrder({ orders, totalTransfer })
    if (!penilaian.valid) return gagal(penilaian.alasan || 'Alokasi tidak valid', 400)

    for (const order of orders) {
      if (order.orderStatus !== 'MENUNGGU_PEMBAYARAN') {
        return gagal(`Pesanan ${order.orderNumber} tidak menunggu pembayaran`, 409)
      }
      if (!bolehUnggahBukti(order.paymentProofStatus)) {
        return gagal(
          `Bukti pesanan ${order.orderNumber} sudah terverifikasi atau tidak dapat diganti`,
          409
        )
      }
      if (order.pausedAt && typeof order.pausedRemainingSeconds === 'number') {
        return gagal(
          `Pengajuan ubah metode pada pesanan ${order.orderNumber} masih menunggu keputusan`,
          409
        )
      }
    }

    const alokasiLama = await prisma().orderPaymentAllocation.findMany({
      where: { orderId: { in: daftarId } },
      select: { paymentEvidenceId: true },
    })
    const buktiLama = alokasiLama.length
      ? await prisma().paymentEvidence.findMany({
          where: { id: { in: [...new Set(alokasiLama.map((a) => a.paymentEvidenceId))] } },
          select: { status: true },
        })
      : []
    if (buktiLama.some((bukti) => bukti.status === 'TERVERIFIKASI')) {
      return gagal('Bukti sudah terverifikasi; penggantian normal tidak diizinkan', 409)
    }

    const qrisAktif = await prisma().qrisConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    const sekarang = new Date()
    const evidenceId = crypto.randomUUID()
    const tersimpan = await simpanBerkas(berkas, 'bukti', evidenceId)

    try {
      const hasil = await prisma().$transaction(
        async (tx: any) => {
          const urut = [...daftarId].sort((a, b) => a.localeCompare(b))
          for (const id of urut) {
            const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE
            `
            if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')
          }

          const orderTerkunci: any[] = []
          for (const id of urut) {
            const order = await tx.order.findUnique({ where: { id } })
            if (!order || order.customerId !== user.id) {
              throw new Error('Pesanan tidak ditemukan atau bukan milik Anda')
            }
            if (order.orderStatus !== 'MENUNGGU_PEMBAYARAN') {
              throw new Error(`Pesanan ${order.orderNumber} tidak menunggu pembayaran`)
            }
            if (!bolehUnggahBukti(order.paymentProofStatus)) {
              throw new Error(`Bukti pesanan ${order.orderNumber} tidak dapat diganti`)
            }
            if (order.pausedAt && typeof order.pausedRemainingSeconds === 'number') {
              throw new Error(`Pengajuan ubah metode pesanan ${order.orderNumber} masih menunggu`)
            }
            if (!buktiTepatWaktu(sekarang, order.paymentDeadline)) {
              throw new Error(`Tenggat pesanan ${order.orderNumber} sudah terlewati`)
            }
            orderTerkunci.push(order)
          }

          const alokasiUlang = await tx.orderPaymentAllocation.findMany({
            where: { orderId: { in: daftarId } },
            select: { paymentEvidenceId: true },
          })
          const idBuktiLama = [
            ...new Set(
              alokasiUlang.map((a: { paymentEvidenceId: string }) => a.paymentEvidenceId)
            ),
          ]
          if (idBuktiLama.length > 0) {
            const lama = await tx.paymentEvidence.findMany({
              where: { id: { in: idBuktiLama } },
              select: { status: true },
            })
            if (lama.some((bukti: { status: string }) => bukti.status === 'TERVERIFIKASI')) {
              throw new Error('Bukti sudah terverifikasi')
            }
            await tx.paymentEvidence.updateMany({
              where: { id: { in: idBuktiLama } },
              data: { isLatest: false, status: 'DIGANTIKAN', supersededAt: sekarang },
            })
          }

          await tx.paymentEvidence.create({
            data: {
              id: evidenceId,
              imageUrl: tersimpan.imageUrl,
              storageName: tersimpan.storageName,
              status: 'MENUNGGU_VERIFIKASI',
              amount: totalTransfer,
              isLatest: true,
              qrisConfigId: qrisAktif?.id ?? null,
              userUserId: user.id,
              uploadedAt: sekarang,
            },
          })

          for (const order of orderTerkunci) {
            await tx.orderPaymentAllocation.create({
              data: {
                orderId: order.id,
                orderOrderId: order.id,
                paymentEvidenceId: evidenceId,
                paymentEvidenceUserId: user.id,
                allocatedAmount: order.totalAmount,
              },
            })

            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentProofStatus: 'MENUNGGU_VERIFIKASI',
                paymentReviewStatus: 'BELUM_DIPERIKSA',
                paymentReviewerId: null,
                proofRequestReason: null,
                proofDeadline: null,
                reminderStep: 0,
              },
            })

            await catatRiwayatStatus({
              orderId: order.id,
              domain: 'PAYMENT',
              oldStatus: order.paymentProofStatus,
              newStatus: 'MENUNGGU_VERIFIKASI',
              reason: 'Bukti pembayaran diunggah Customer',
              actorId: user.id,
              actorRole: 'CUSTOMER',
              client: tx,
            })

            await buatReminder({
              orderId: order.id,
              type: 'PENGINGAT_BUKTI',
              client: tx,
            })
          }

          await notifikasiAdmins({
            groupKey: `bukti:diunggah:${evidenceId}`,
            message:
              `Bukti pembayaran baru diunggah untuk ${orderTerkunci.length} pesanan ` +
              `(${orderTerkunci.map((o) => o.orderNumber).join(', ')}). Mohon diperiksa.`,
            client: tx,
          })

          return {
            evidenceId,
            imageUrl: tersimpan.imageUrl,
            status: 'MENUNGGU_VERIFIKASI',
            totalTransfer,
            alokasi: penilaian.alokasi,
          }
        },
        { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
      )

      return NextResponse.json({
        success: true,
        pesan: 'Bukti pembayaran berhasil diunggah dan menunggu pemeriksaan.',
        bukti: hasil,
      })
    } catch (error: any) {
      await hapusBerkas('bukti', tersimpan.storageName)
      return gagal(error?.message || 'Gagal menyimpan bukti pembayaran', 409)
    }
  } catch (error: any) {
    console.error('API POST /api/pembayaran/bukti error:', error)
    return gagal(error?.message || 'Gagal mengunggah bukti', 500)
  }
}
