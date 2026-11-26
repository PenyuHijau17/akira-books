// src/app/api/jadwal/route.ts
// Jadwal pengambilan milik Customer: pilih/ubah tanggal, batalkan pengajuan,
// merespons usulan admin, serta gabung/lepas grup jadwal (Tahap 9).
// GR-02/GR-03: hanya pemilik pesanan; tidak ada field modal/laba dalam respons.

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  batasWaktuPengambilan,
  bolehAjukanCustomer,
  daftarTanggalMinggu,
  ringkasanUsulan,
  statusPesananSetelahJadwalDisetujui,
  statusSaatUsulanDibatalkan,
  statusSetelahBatalPengajuan,
  statusSetelahSetujuCustomer,
  statusSetelahTolakCustomer,
  validasiAlasan,
  validasiPenggabungan,
  validasiTanggalPengambilan,
} from '@/lib/jadwal'
import {
  ambilUsulanTertunda,
  notifikasiAdminJadwal,
  notifikasiJadwal,
  selesaikanPengingatJadwal,
  tutupUsulanTertunda,
} from '@/lib/jadwalServer'
import {
  buatReminder,
  catatRiwayatStatus,
} from '@/lib/pembayaranServer'
import { saringFieldModal } from '@/lib/pesanan'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

const PILIHAN_ORDER = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  paymentProofStatus: true,
  pickupStatus: true,
  pickupSundayDate: true,
  pickupGroupId: true,
  noShowAt: true,
  noShowHoldDeadline: true,
  noShowReason: true,
  noShowCount: true,
  completedAt: true,
  totalAmount: true,
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') return gagal('Tidak diizinkan', 401)

    const client = prisma()
    const orders = await client.order.findMany({
      where: {
        customerId: user.id,
        orderStatus: { notIn: ['SELESAI', 'DIBATALKAN'] },
      },
      orderBy: { createdAt: 'desc' },
      select: PILIHAN_ORDER,
    })
    const usulan = await client.jadwalPerubahan.findMany({
      where: { orderId: { in: orders.map((o) => o.id) }, status: 'MENUNGGU_PERSETUJUAN' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json(
      saringFieldModal({
        daftarMinggu: daftarTanggalMinggu(),
        pesanan: orders,
        usulanTertunda: usulan,
      })
    )
  } catch (error: any) {
    console.error('API GET /api/jadwal error:', error)
    return gagal(error?.message || 'Gagal memuat jadwal', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') return gagal('Anda harus login sebagai Customer', 401)

    const body = await request.json().catch(() => null)
    if (!body) return gagal('Data jadwal tidak valid', 400)
    const aksi = String(body.action || '').toUpperCase()
    const sekarang = new Date()
    const alasan = String(body.alasan || '').trim()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        let ringkasan: Record<string, unknown> = {}

        // Aksi grup tidak mengunci satu order; validasi kepemilikan dilakukan per baris.
        if (aksi === 'GABUNG') {
          const ids = Array.isArray(body.orderIds) ? body.orderIds.map(String) : []
          const orders = ids.length
            ? await tx.order.findMany({ where: { id: { in: ids }, customerId: user.id } })
            : []
          if (orders.length !== ids.length) {
            throw new Error('Satu atau lebih pesanan tidak ditemukan atau bukan milik Anda')
          }
          const diterima = validasiPenggabungan(
            orders as any,
            user.id,
            batasWaktuPengambilan(String(body.pickupSundayDate || '')),
            crypto.randomUUID(),
            sekarang
          )
          if (!diterima.valid) throw new Error(diterima.alasan || 'Penggabungan ditolak')

          for (const pembaruan of diterima.pembaruan) {
            const lama = orders.find((o: any) => o.id === pembaruan.id) as any
            await tx.jadwalPerubahan.updateMany({
              where: { orderId: pembaruan.id, status: 'MENUNGGU_PERSETUJUAN' },
              data: {
                status: 'DIBATALKAN',
                diputuskanOleh: user.id,
                diputuskanPeran: 'CUSTOMER',
                alasanKeputusan: 'Jadwal digabungkan',
                diputuskanPada: sekarang,
              },
            })
            await tx.order.update({
              where: { id: pembaruan.id },
              data: {
                pickupSundayDate: pembaruan.pickupSundayDate,
                pickupGroupId: pembaruan.pickupGroupId,
                pickupStatus: pembaruan.pickupStatus,
                noShowHoldDeadline: null,
                noShowReason: null,
              },
            })
            await catatRiwayatStatus({
              orderId: pembaruan.id,
              domain: 'PICKUP',
              oldStatus: lama.pickupStatus,
              newStatus: pembaruan.pickupStatus,
              reason: `Jadwal digabungkan (${pembaruan.pickupGroupId})`,
              actorId: user.id,
              actorRole: 'CUSTOMER',
              client: tx,
            })
            await selesaikanPengingatJadwal(tx, pembaruan.id)
            await buatReminder({ orderId: pembaruan.id, type: 'PENGINGAT_JADWAL', client: tx })
            await notifikasiAdminJadwal(
              tx,
              `jadwal:gabung:${pembaruan.id}:${sekarang.getTime()}`,
              `Customer menggabungkan jadwal pesanan ${lama.orderNumber}. Mohon tinjau.`
            )
            await notifikasiJadwal(
              tx,
              user.id,
              `jadwal:gabung-pelanggan:${pembaruan.id}:${sekarang.getTime()}`,
              `Jadwal pesanan ${lama.orderNumber} telah digabungkan dan menunggu tinjauan admin.`
            )
          }
          ringkasan = { groupId: diterima.pembaruan[0]?.pickupGroupId, jumlah: diterima.pembaruan.length }
          return ringkasan
        }

        const orderId = String(body.orderId || '')
        if (!orderId) throw new Error('Identifier pesanan wajib diisi')
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')

        const order = await tx.order.findUnique({ where: { id: orderId } })
        if (!order || order.customerId !== user.id) throw new Error('Pesanan tidak ditemukan')
        const usulan = await ambilUsulanTertunda(tx, orderId)

        if (aksi === 'PILIH_TANGGAL') {
          const cekStatus = bolehAjukanCustomer({
            orderStatus: order.orderStatus,
            pickupStatus: order.pickupStatus,
            pickupSundayDate: order.pickupSundayDate,
            sekarang,
          })
          if (!cekStatus.valid) throw new Error(cekStatus.alasan || 'Pengajuan ditolak')
          if (!['MENUNGGU_KONFIRMASI', 'PERLU_TANGGAL_BARU'].includes(order.pickupStatus)) {
            throw new Error('Gunakan menu Ajukan Ubah Jadwal untuk jadwal yang sudah disetujui')
          }
          const tanggal = validasiTanggalPengambilan(body.pickupSundayDate, sekarang)
          if (!tanggal.valid || !tanggal.tanggal) throw new Error(tanggal.alasan || 'Tanggal tidak valid')

          await tutupUsulanTertunda(tx, orderId, user.id, 'CUSTOMER', 'Diganti tanggal baru')
          await tx.order.update({
            where: { id: orderId },
            data: { pickupSundayDate: tanggal.tanggal, pickupStatus: 'MENUNGGU_KONFIRMASI' },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: 'MENUNGGU_KONFIRMASI',
            reason: `Customer memilih tanggal ${tanggal.tanggal.toISOString()}`,
            actorId: user.id,
            actorRole: 'CUSTOMER',
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await buatReminder({ orderId, type: 'PENGINGAT_JADWAL', client: tx })
          await notifikasiAdminJadwal(
            tx,
            `jadwal:baru:${orderId}:${sekarang.getTime()}`,
            `Customer mengajukan tanggal pengambilan baru untuk pesanan ${order.orderNumber}.`
          )
          ringkasan = { pickupStatus: 'MENUNGGU_KONFIRMASI', pickupSundayDate: tanggal.tanggal }
        } else if (aksi === 'AJUKAN_UBAH') {
          const cekStatus = bolehAjukanCustomer({
            orderStatus: order.orderStatus,
            pickupStatus: order.pickupStatus,
            pickupSundayDate: order.pickupSundayDate,
            sekarang,
          })
          if (!cekStatus.valid) throw new Error(cekStatus.alasan || 'Pengajuan ditolak')
          if (!['DISETUJUI', 'TIDAK_HADIR', 'PERUBAHAN_MENUNGGU_PERSETUJUAN'].includes(order.pickupStatus)) {
            throw new Error('Gunakan menu Pilih Tanggal untuk jadwal yang belum disetujui')
          }
          const cekAlasan = validasiAlasan(alasan)
          if (!cekAlasan.valid) throw new Error(cekAlasan.alasan || 'Alasan wajib diisi')
          const tanggal = validasiTanggalPengambilan(body.pickupSundayDate, sekarang)
          if (!tanggal.valid || !tanggal.tanggal) throw new Error(tanggal.alasan || 'Tanggal tidak valid')

          await tutupUsulanTertunda(tx, orderId, user.id, 'CUSTOMER', 'Diganti usulan baru')
          const usulanBaru = await tx.jadwalPerubahan.create({
            data: {
              orderId,
              jenis: 'PENGAJUAN_CUSTOMER',
              pengajuId: user.id,
              peranPengaju: 'CUSTOMER',
              tanggalLama: order.pickupSundayDate,
              tanggalBaru: tanggal.tanggal,
              statusSebelumnya: order.pickupStatus,
              alasan,
              status: 'MENUNGGU_PERSETUJUAN',
            },
          })
          const menunggu = ringkasanUsulan(order.pickupSundayDate, tanggal.tanggal)
          await tx.order.update({
            where: { id: orderId },
            data: {
              pickupStatus: menunggu.pickupStatus,
              pickupSundayDate: menunggu.pickupSundayDate,
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: 'PERUBAHAN_MENUNGGU_PERSETUJUAN',
            reason: `Customer mengajukan ubah jadwal: ${alasan}`,
            actorId: user.id,
            actorRole: 'CUSTOMER',
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await buatReminder({ orderId, type: 'PENGINGAT_JADWAL', client: tx })
          await notifikasiAdminJadwal(
            tx,
            `jadwal:ubah:${orderId}:${sekarang.getTime()}`,
            `Customer mengajukan ubah jadwal pesanan ${order.orderNumber}. Alasan: ${alasan}`
          )
          ringkasan = { usulanId: usulanBaru.id, pickupStatus: 'PERUBAHAN_MENUNGGU_PERSETUJUAN' }
        } else if (aksi === 'BATAL_PENGAJUAN') {
          const statusBaru = statusSetelahBatalPengajuan(order.pickupStatus)
          if (!statusBaru) throw new Error('Tidak ada pengajuan jadwal yang dapat dibatalkan')
          await tutupUsulanTertunda(tx, orderId, user.id, 'CUSTOMER', 'Pengajuan dibatalkan customer')
          await tx.order.update({ where: { id: orderId }, data: { pickupStatus: statusBaru } })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: statusBaru,
            reason: 'Customer membatalkan pengajuan jadwal',
            actorId: user.id,
            actorRole: 'CUSTOMER',
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          ringkasan = { pickupStatus: statusBaru }
        } else if (aksi === 'BATAL_USULAN_SAYA') {
          if (!usulan || usulan.jenis !== 'PENGAJUAN_CUSTOMER' || usulan.pengajuId !== user.id) {
            throw new Error('Tidak ada usulan milik Anda yang menunggu keputusan')
          }
          const statusBaru = statusSaatUsulanDibatalkan(usulan.statusSebelumnya)
          await tx.jadwalPerubahan.update({
            where: { id: usulan.id },
            data: {
              status: 'DIBATALKAN',
              diputuskanOleh: user.id,
              diputuskanPeran: 'CUSTOMER',
              alasanKeputusan: alasan || 'Usulan dibatalkan customer',
              diputuskanPada: sekarang,
            },
          })
          await tx.order.update({ where: { id: orderId }, data: { pickupStatus: statusBaru } })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: statusBaru,
            reason: 'Customer membatalkan usulan perubahan jadwalnya',
            actorId: user.id,
            actorRole: 'CUSTOMER',
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          ringkasan = { pickupStatus: statusBaru }
        } else if (aksi === 'SETUJU_USULAN' || aksi === 'TOLAK_USULAN') {
          if (!usulan || usulan.jenis !== 'USULAN_ADMIN') {
            throw new Error('Tidak ada usulan admin yang menunggu persetujuan Anda')
          }
          if (aksi === 'TOLAK_USULAN') {
            const cekAlasan = validasiAlasan(alasan)
            if (!cekAlasan.valid) throw new Error(cekAlasan.alasan || 'Alasan penolakan wajib diisi')
          }
          const tanggal = validasiTanggalPengambilan(usulan.tanggalBaru.toISOString(), sekarang)
          if (!tanggal.valid || !tanggal.tanggal) throw new Error('Usulan admin memuat tanggal tidak sah')

          const statusBaru =
            aksi === 'SETUJU_USULAN'
              ? statusSetelahSetujuCustomer(order.pickupStatus)
              : statusSetelahTolakCustomer(order.pickupStatus)
          if (!statusBaru) throw new Error('Status jadwal tidak memungkinkan keputusan ini')

          await tx.jadwalPerubahan.update({
            where: { id: usulan.id },
            data: {
              status: aksi === 'SETUJU_USULAN' ? 'DISETUJUI' : 'DITOLAK',
              diputuskanOleh: user.id,
              diputuskanPeran: 'CUSTOMER',
              alasanKeputusan: alasan || null,
              diputuskanPada: sekarang,
            },
          })
          const setuju = aksi === 'SETUJU_USULAN'
          const statusOrder = setuju
            ? statusPesananSetelahJadwalDisetujui({
                orderStatus: order.orderStatus,
                paymentProofStatus: order.paymentProofStatus,
                paymentReviewStatus: order.paymentReviewStatus,
              })
            : null
          await tx.order.update({
            where: { id: orderId },
            data: {
              pickupStatus: statusBaru,
              ...(setuju
                ? {
                    pickupSundayDate: tanggal.tanggal,
                    noShowHoldDeadline: null,
                    noShowReason: null,
                  }
                : {}),
              ...(statusOrder ? { orderStatus: statusOrder } : {}),
            },
          })
          if (statusOrder && statusOrder !== order.orderStatus) {
            await catatRiwayatStatus({
              orderId,
              domain: 'ORDER',
              oldStatus: order.orderStatus,
              newStatus: statusOrder,
              reason: 'OD-01: pembayaran final lebih dulu; jadwal kini disetujui',
              actorId: user.id,
              actorRole: 'CUSTOMER',
              client: tx,
            })
          }
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: statusBaru,
            reason: setuju
              ? `Customer menyetujui usulan admin: ${tanggal.tanggal.toISOString()}`
              : `Customer menolak usulan admin: ${alasan}`,
            actorId: user.id,
            actorRole: 'CUSTOMER',
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          const admin = await tx.user.findFirst({
            where: { role: 'ADMIN_UTAMA', isActive: true },
            select: { id: true },
          })
          if (admin) {
            await notifikasiJadwal(
              tx,
              admin.id,
              `jadwal:putusan-customer:${usulan.id}:${sekarang.getTime()}`,
              `Customer ${setuju ? 'menyetujui' : 'menolak'} usulan jadwal pesanan ${order.orderNumber}.`
            )
          }
          ringkasan = {
            pickupStatus: statusBaru,
            disetujui: setuju,
            orderStatus: statusOrder || order.orderStatus,
          }
        } else if (aksi === 'LEPAS_GABUNGAN') {
          if (!order.pickupGroupId) throw new Error('Pesanan tidak tergabung dalam jadwal bersama')
          const anggotaLain = await tx.order.count({
            where: { pickupGroupId: order.pickupGroupId, id: { not: order.id } },
          })
          await tx.order.update({
            where: { id: orderId },
            data: {
              pickupGroupId: null,
              pickupStatus: 'MENUNGGU_KONFIRMASI',
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: 'MENUNGGU_KONFIRMASI',
            reason: 'Customer melepaskan jadwal gabungan',
            actorId: user.id,
            actorRole: 'CUSTOMER',
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await buatReminder({ orderId, type: 'PENGINGAT_JADWAL', client: tx })
          await notifikasiAdminJadwal(
            tx,
            `jadwal:lepas:${orderId}:${sekarang.getTime()}`,
            `Customer melepaskan pesanan ${order.orderNumber} dari jadwal gabungan.`
          )
          ringkasan = { anggotaLain, pickupStatus: 'MENUNGGU_KONFIRMASI' }
        } else {
          throw new Error('Aksi jadwal tidak dikenali')
        }

        return ringkasan
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({ success: true, pesan: 'Jadwal berhasil diproses.', ...hasil })
  } catch (error: any) {
    console.error('API POST /api/jadwal error:', error)
    return gagal(error?.message || 'Gagal memproses jadwal', 409)
  }
}
