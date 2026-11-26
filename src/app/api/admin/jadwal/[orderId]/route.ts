// src/app/api/admin/jadwal/[orderId]/route.ts
// Detail & keputusan jadwal: setuju/tolak, usulan admin, persetujuan perubahan customer,
// no-show manual/perpanjangan penahanan, gabung jadwal, dan tombol Selesai atomik.
// Semua keputusan admin dicatat di AdminAuditLog append-only (GR-06) + riwayat PICKUP (BR-006).

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  batasWaktuPengambilan,
  bolehUsulAdmin,
  penilaianNoShow,
  ringkasanUsulan,
  statusPesananSetelahJadwalDisetujui,
  statusSetelahSetujuAdmin,
  statusSetelahTolakAdmin,
  validasiAlasan,
  validasiPenggabungan,
  validasiPerpanjangTahan,
  validasiSelesai,
  validasiStokPenyerahan,
  validasiTanggalPengambilan,
} from '@/lib/jadwal'
import {
  ambilUsulanTertunda,
  anggotaGrupJadwal,
  notifikasiAdminJadwal,
  notifikasiJadwal,
  riwayatJadwalLengkap,
  selesaikanPengingatJadwal,
  tutupUsulanTertunda,
} from '@/lib/jadwalServer'
import {
  buatNotifikasi,
  buatReminder,
  catatAudit,
  catatRiwayatStatus,
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
  pickupStatus: true,
  pickupSundayDate: true,
  pickupGroupId: true,
  noShowAt: true,
  noShowHoldDeadline: true,
  noShowReason: true,
  noShowCount: true,
  completedAt: true,
  completedById: true,
  stockSold: true,
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
    const client = prisma()

    const order = await client.order.findUnique({ where: { id: orderId } })
    if (!order) return gagal('Pesanan tidak ditemukan', 404)

    const [riwayat, grup, statusJadwal] = await Promise.all([
      riwayatJadwalLengkap(client, orderId),
      anggotaGrupJadwal(client, order),
      client.orderStatusHistory.findMany({
        where: { orderId, domain: 'PICKUP' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const data = {
      pesanan: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        orderStatus: order.orderStatus,
        paymentProofStatus: order.paymentProofStatus,
        pickupStatus: order.pickupStatus,
        pickupSundayDate: order.pickupSundayDate,
        pickupGroupId: order.pickupGroupId,
        noShowAt: order.noShowAt,
        noShowHoldDeadline: order.noShowHoldDeadline,
        noShowReason: order.noShowReason,
        noShowCount: order.noShowCount,
        completedAt: order.completedAt,
        completedById: order.completedById,
        stockSold: order.stockSold,
        totalAmount: order.totalAmount,
      },
      riwayat,
      grup,
      statusJadwal,
      usulanTertunda: riwayat.find((u) => u.status === 'MENUNGGU_PERSETUJUAN') || null,
      hakAkses: { bisaSelesaikan: true, bisaBatalkan: user.role === 'ADMIN_UTAMA' },
    }
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('API GET /api/admin/jadwal/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memuat detail jadwal', 500)
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
    const actor = { id: user.id, role: user.role }
    const sekarang = new Date()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        let ringkasan: Record<string, unknown> = {}

        if (aksi === 'GABUNG') {
          const ids = Array.isArray(body.orderIds) ? body.orderIds.map(String) : []
          const orders = ids.length
            ? await tx.order.findMany({ where: { id: { in: ids } } })
            : []
          if (orders.length !== ids.length) throw new Error('Satu atau lebih pesanan tidak ditemukan')
          const customerId = orders[0]?.customerId || ''
          const diterima = validasiPenggabungan(
            orders as any,
            customerId,
            batasWaktuPengambilan(String(body.pickupSundayDate || '')),
            crypto.randomUUID(),
            sekarang
          )
          if (!diterima.valid) throw new Error(diterima.alasan || 'Penggabungan ditolak')

          for (const pembaruan of diterima.pembaruan) {
            const lama = orders.find((o: any) => o.id === pembaruan.id) as any
            await tutupUsulanTertunda(tx, pembaruan.id, actor.id, actor.role, 'Jadwal digabungkan admin')
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
              reason: `Admin menggabungkan jadwal (${pembaruan.pickupGroupId})`,
              actorId: actor.id,
              actorRole: actor.role,
              client: tx,
            })
            await selesaikanPengingatJadwal(tx, pembaruan.id)
            await buatReminder({ orderId: pembaruan.id, type: 'PENGINGAT_JADWAL', client: tx })
            await catatAudit({
              actorId: actor.id,
              actorRole: actor.role,
              action: 'GABUNG_JADWAL',
              targetEntity: 'Order',
              targetId: pembaruan.id,
              oldValue: { pickupSundayDate: lama.pickupSundayDate, pickupGroupId: lama.pickupGroupId },
              newValue: { pickupSundayDate: pembaruan.pickupSundayDate, pickupGroupId: pembaruan.pickupGroupId },
              reason: alasan || 'Penggabungan jadwal oleh admin',
              client: tx,
            })
            await notifikasiJadwal(
              tx,
              lama.customerId,
              `jadwal:gabung-admin:${pembaruan.id}:${sekarang.getTime()}`,
              `Admin menggabungkan jadwal pesanan ${lama.orderNumber} dan menunggu tinjauan.`
            )
          }
          ringkasan = { groupId: diterima.pembaruan[0]?.pickupGroupId, jumlah: diterima.pembaruan.length }
          return ringkasan
        }

        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Pesanan tidak ditemukan')
        const order = await tx.order.findUnique({ where: { id: orderId } })
        if (!order) throw new Error('Pesanan tidak ditemukan')
        const usulan = await ambilUsulanTertunda(tx, orderId)

        if (aksi === 'SETUJU_TANGGAL' || aksi === 'SETUJU_PERUBAHAN') {
          const statusBaru = statusSetelahSetujuAdmin(order.pickupStatus)
          if (!statusBaru) throw new Error('Tidak ada pengajuan jadwal yang menunggu keputusan')
          let tanggalAktif = order.pickupSundayDate
          if (order.pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN') {
            if (!usulan || usulan.jenis !== 'PENGAJUAN_CUSTOMER') {
              throw new Error('Usulan customer tidak ditemukan')
            }
            tanggalAktif = usulan.tanggalBaru
            await tx.jadwalPerubahan.update({
              where: { id: usulan.id },
              data: {
                status: 'DISETUJUI',
                diputuskanOleh: actor.id,
                diputuskanPeran: actor.role,
                alasanKeputusan: alasan || null,
                diputuskanPada: sekarang,
              },
            })
          }
          const cek = validasiTanggalPengambilan(tanggalAktif.toISOString(), sekarang)
          if (!cek.valid || !cek.tanggal) throw new Error(cek.alasan || 'Tanggal tidak sah')

          const statusOrder = statusPesananSetelahJadwalDisetujui({
            orderStatus: order.orderStatus,
            paymentProofStatus: order.paymentProofStatus,
            paymentReviewStatus: order.paymentReviewStatus,
          })
          await tx.order.update({
            where: { id: orderId },
            data: {
              pickupStatus: statusBaru,
              pickupSundayDate: cek.tanggal,
              noShowHoldDeadline: null,
              noShowReason: null,
              ...(statusOrder ? { orderStatus: statusOrder } : {}),
            },
          })
          if (
            statusOrder &&
            statusOrder !== order.orderStatus
          ) {
            await catatRiwayatStatus({
              orderId,
              domain: 'ORDER',
              oldStatus: order.orderStatus,
              newStatus: statusOrder,
              reason: 'OD-01: pembayaran final lebih dulu; jadwal kini disetujui',
              actorId: actor.id,
              actorRole: actor.role,
              client: tx,
            })
          }
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: statusBaru,
            reason: `Admin menyetujui jadwal ${cek.tanggal.toISOString()}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'SETUJU_JADWAL',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { pickupStatus: order.pickupStatus, pickupSundayDate: order.pickupSundayDate },
            newValue: { pickupStatus: statusBaru, pickupSundayDate: cek.tanggal },
            reason: alasan || 'Persetujuan jadwal oleh admin',
            client: tx,
          })
          await notifikasiJadwal(
            tx,
            order.customerId,
            `jadwal:disetujui:${orderId}:${sekarang.getTime()}`,
            `Jadwal pesanan ${order.orderNumber} disetujui untuk ${cek.tanggal.toISOString()}.`
          )
          ringkasan = {
            pickupStatus: statusBaru,
            pickupSundayDate: cek.tanggal,
            orderStatus: statusOrder || order.orderStatus,
          }
        } else if (aksi === 'TOLAK_TANGGAL' || aksi === 'TOLAK_PERUBAHAN') {
          const cekAlasan = validasiAlasan(alasan)
          if (!cekAlasan.valid) throw new Error(cekAlasan.alasan || 'Alasan penolakan wajib diisi')
          const statusBaru = statusSetelahTolakAdmin(order.pickupStatus)
          if (!statusBaru) throw new Error('Tidak ada pengajuan jadwal yang menunggu keputusan')
          if (usulan && usulan.status === 'MENUNGGU_PERSETUJUAN') {
            await tx.jadwalPerubahan.update({
              where: { id: usulan.id },
              data: {
                status: 'DITOLAK',
                diputuskanOleh: actor.id,
                diputuskanPeran: actor.role,
                alasanKeputusan: alasan,
                diputuskanPada: sekarang,
              },
            })
          }
          await tx.order.update({ where: { id: orderId }, data: { pickupStatus: statusBaru } })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: statusBaru,
            reason: `Admin menolak jadwal: ${alasan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'TOLAK_JADWAL',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { pickupStatus: order.pickupStatus, pickupSundayDate: order.pickupSundayDate },
            newValue: { pickupStatus: statusBaru },
            reason: alasan,
            client: tx,
          })
          await notifikasiJadwal(
            tx,
            order.customerId,
            `jadwal:ditolak:${orderId}:${sekarang.getTime()}`,
            `Jadwal pesanan ${order.orderNumber} ditolak. Alasan: ${alasan}. Silakan pilih tanggal baru.`
          )
          ringkasan = { pickupStatus: statusBaru }
        } else if (aksi === 'USUL_UBAH') {
          const cekHak = bolehUsulAdmin({ orderStatus: order.orderStatus, pickupStatus: order.pickupStatus })
          if (!cekHak.valid) throw new Error(cekHak.alasan || 'Usulan ditolak')
          const cekAlasan = validasiAlasan(alasan)
          if (!cekAlasan.valid) throw new Error(cekAlasan.alasan || 'Alasan usulan wajib diisi')
          const tanggal = validasiTanggalPengambilan(body.pickupSundayDate, sekarang)
          if (!tanggal.valid || !tanggal.tanggal) throw new Error(tanggal.alasan || 'Tanggal tidak valid')

          await tutupUsulanTertunda(tx, orderId, actor.id, actor.role, 'Diganti usulan baru')
          const usulanBaru = await tx.jadwalPerubahan.create({
            data: {
              orderId,
              jenis: 'USULAN_ADMIN',
              pengajuId: actor.id,
              peranPengaju: actor.role,
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
            reason: `Admin mengusulkan jadwal ${tanggal.tanggal.toISOString()}: ${alasan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await buatReminder({ orderId, type: 'PENGINGAT_JADWAL', client: tx })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'USUL_UBAH_JADWAL',
            targetEntity: 'JadwalPerubahan',
            targetId: usulanBaru.id,
            oldValue: { pickupSundayDate: order.pickupSundayDate },
            newValue: { tanggalUsulan: tanggal.tanggal },
            reason: alasan,
            client: tx,
          })
          await notifikasiJadwal(
            tx,
            order.customerId,
            `jadwal:usulan:${usulanBaru.id}:${sekarang.getTime()}`,
            `Admin mengusulkan jadwal baru ${tanggal.tanggal.toISOString()} untuk pesanan ${order.orderNumber}. Menunggu persetujuan Anda.`
          )
          ringkasan = { usulanId: usulanBaru.id, pickupStatus: 'PERUBAHAN_MENUNGGU_PERSETUJUAN' }
        } else if (aksi === 'TANDAI_NO_SHOW') {
          const penilaian = penilaianNoShow({
            pickupStatus: order.pickupStatus,
            orderStatus: order.orderStatus,
            stockSold: order.stockSold,
            pickupSundayDate: order.pickupSundayDate,
            sekarang,
            sudahDicatat: !!order.noShowAt,
          })
          if (!penilaian.harus || !penilaian.batasTahan || !penilaian.alasan) {
            throw new Error('Syarat penandaan no-show tidak terpenuhi')
          }
          await tx.order.update({
            where: { id: orderId },
            data: {
              pickupStatus: 'TIDAK_HADIR',
              noShowAt: sekarang,
              noShowHoldDeadline: penilaian.batasTahan,
              noShowReason: penilaian.alasan,
              noShowCount: { increment: 1 },
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: 'TIDAK_HADIR',
            reason: penilaian.alasan,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'TANDAI_NO_SHOW',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { pickupStatus: order.pickupStatus },
            newValue: { pickupStatus: 'TIDAK_HADIR', noShowHoldDeadline: penilaian.batasTahan },
            reason: penilaian.alasan,
            client: tx,
          })
          await notifikasiAdminJadwal(
            tx,
            `jadwal:no-show:${orderId}:${sekarang.getTime()}`,
            `Customer tidak hadir untuk pesanan ${order.orderNumber}. Buku ditahan sampai ${penilaian.batasTahan.toISOString()}.`
          )
          await notifikasiJadwal(
            tx,
            order.customerId,
            `jadwal:no-show-customer:${orderId}:${sekarang.getTime()}`,
            `Anda tidak hadir pada jadwal pesanan ${order.orderNumber}. Hubungi admin untuk mengubah jadwal atau membatalkan.`
          )
          ringkasan = { pickupStatus: 'TIDAK_HADIR', noShowHoldDeadline: penilaian.batasTahan }
        } else if (aksi === 'PERPANJANG_TENGGAT_TAHAN') {
          if (order.pickupStatus !== 'TIDAK_HADIR') {
            throw new Error('Penahanan hanya dapat diperpanjang pada jadwal bertatus tidak hadir')
          }
          const cek = validasiPerpanjangTahan({
            alasan,
            tenggatBaru: body.tenggatBaru,
            sekarang,
          })
          if (!cek.valid || !cek.tanggal) throw new Error(cek.alasan || 'Tenggat tidak sah')
          await tx.order.update({
            where: { id: orderId },
            data: { noShowHoldDeadline: cek.tanggal, noShowReason: alasan },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: 'TIDAK_HADIR',
            newStatus: 'TIDAK_HADIR',
            reason: `Perpanjangan penahanan buku sampai ${cek.tanggal.toISOString()}: ${alasan}`,
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'PERPANJANG_TENGGAT_TAHAN',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { noShowHoldDeadline: order.noShowHoldDeadline },
            newValue: { noShowHoldDeadline: cek.tanggal },
            reason: alasan,
            client: tx,
          })
          await notifikasiJadwal(
            tx,
            order.customerId,
            `jadwal:tahan:${orderId}:${sekarang.getTime()}`,
            `Buku pesanan ${order.orderNumber} tetap ditahan sampai ${cek.tanggal.toISOString()}. Alasan: ${alasan}`
          )
          ringkasan = { noShowHoldDeadline: cek.tanggal }
        } else if (aksi === 'LEPAS_GABUNGAN') {
          if (!order.pickupGroupId) throw new Error('Pesanan tidak tergabung dalam jadwal bersama')
          await tx.order.update({
            where: { id: orderId },
            data: { pickupGroupId: null, pickupStatus: 'MENUNGGU_KONFIRMASI' },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'PICKUP',
            oldStatus: order.pickupStatus,
            newStatus: 'MENUNGGU_KONFIRMASI',
            reason: 'Admin melepaskan jadwal gabungan',
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await buatReminder({ orderId, type: 'PENGINGAT_JADWAL', client: tx })
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'LEPAS_GABUNG_JADWAL',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { pickupGroupId: order.pickupGroupId },
            newValue: { pickupGroupId: null },
            reason: alasan || 'Pesanan dilepaskan dari jadwal gabungan',
            client: tx,
          })
          ringkasan = { pickupStatus: 'MENUNGGU_KONFIRMASI' }
        } else if (aksi === 'SELESAIKAN') {
          const cek = validasiSelesai({
            orderStatus: order.orderStatus,
            paymentProofStatus: order.paymentProofStatus,
            stockSold: order.stockSold,
          })
          if (!cek.valid) throw new Error(cek.alasan || 'Pesanan belum dapat diselesaikan')

          const items = await tx.orderItem.findMany({ where: { orderId } })
          if (items.length === 0) throw new Error('Item pesanan tidak ditemukan')

          // Kunci semua baris buku dengan urutan konsisten, lalu validasi seluruh stok
          // sebelum penurunan pertama. Transaksi menjamin all-or-nothing (BR-001).
          const petaStok: Record<string, { stockTotal: number; stockReserved: number }> = {}
          const petaJudul: Record<string, string> = {}
          const daftarBookId: string[] = [
            ...new Set<string>(items.map((item: any) => String(item.bookId))),
          ].sort()
          for (const bookId of daftarBookId) {
            const terkunciBuku = await tx.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM "Book" WHERE id = ${bookId} FOR UPDATE
            `
            if (terkunciBuku.length === 0) throw new Error(`Buku tidak ditemukan: ${bookId}`)
            const buku = await tx.book.findUnique({ where: { id: bookId } })
            if (!buku) throw new Error(`Buku tidak ditemukan: ${bookId}`)
            petaStok[bookId] = { stockTotal: buku.stockTotal, stockReserved: buku.stockReserved }
            petaJudul[bookId] = buku.title
          }
          const cekStok = validasiStokPenyerahan(
            items.map((item: any) => ({ bookId: item.bookId, quantity: item.quantity })),
            petaStok,
            petaJudul
          )
          if (!cekStok.valid) throw new Error(cekStok.alasan || 'Stok tidak mencukupi')

          for (const item of items) {
            await tx.book.update({
              where: { id: item.bookId },
              data: {
                stockTotal: { decrement: item.quantity },
                stockReserved: { decrement: item.quantity },
              },
            })
            await tx.stockMovement.create({
              data: {
                bookId: item.bookId,
                type: 'KELUAR',
                quantity: item.quantity,
                reason: `Penyerahan fisik pesanan ${order.orderNumber}`,
                createdBy: actor.id,
              },
            })
          }

          await tx.order.update({
            where: { id: orderId },
            data: {
              orderStatus: 'SELESAI',
              stockSold: true,
              completedAt: sekarang,
              completedById: actor.id,
            },
          })
          await catatRiwayatStatus({
            orderId,
            domain: 'ORDER',
            oldStatus: order.orderStatus,
            newStatus: 'SELESAI',
            reason: 'Buku diserahkan fisik di lokasi; stok tertahan dikurangi permanen',
            actorId: actor.id,
            actorRole: actor.role,
            client: tx,
          })
          await selesaikanPengingatJadwal(tx, orderId)
          await catatAudit({
            actorId: actor.id,
            actorRole: actor.role,
            action: 'SELESAI_PENGAMBILAN',
            targetEntity: 'Order',
            targetId: orderId,
            oldValue: { orderStatus: order.orderStatus, stockSold: false },
            newValue: { orderStatus: 'SELESAI', stockSold: true, completedAt: sekarang },
            reason: alasan || 'Buku diserahkan fisik kepada customer',
            client: tx,
          })
          await buatNotifikasi({
            userId: order.customerId,
            groupKey: `jadwal:selesai:${orderId}:${sekarang.getTime()}`,
            message: `Buku pesanan ${order.orderNumber} telah diserahkan. Pesanan dinyatakan Selesai.`,
            client: tx,
          })
          ringkasan = { orderStatus: 'SELESAI', completedAt: sekarang }
        } else {
          throw new Error('Aksi jadwal tidak dikenali')
        }

        const terkini = await tx.order.findUnique({ where: { id: orderId }, select: PILIHAN_ORDER })
        return { ringkasan, pesanan: terkini }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    return NextResponse.json({
      success: true,
      pesan: 'Jadwal berhasil diproses.',
      ...hasil,
    })
  } catch (error: any) {
    console.error('API POST /api/admin/jadwal/[orderId] error:', error)
    return gagal(error?.message || 'Gagal memproses jadwal', 409)
  }
}
