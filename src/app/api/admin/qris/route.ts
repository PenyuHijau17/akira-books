// src/app/api/admin/qris/route.ts
// Manajemen satu QRIS aktif toko — khusus Admin Utama (FR-PAY-001).
// Wajib: konfirmasi "YA" + kata sandi + OTP. Riwayat QRIS lama tidak ditimpa.
// Catatan: GR-09 menunda Banner Promosi, bukan QRIS; QRIS tetap fitur inti Tahap 8.

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSessionUser, hashToken, validasiKredensial } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  pesanPeringatanQris,
  validasiFileGambar,
  validasiKonfirmasiSensitif,
  validasiTandaTanganGambar,
} from '@/lib/pembayaran'
import {
  beriTahuTerminal,
  catatAudit,
  simpanBerkas,
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

async function dataQris() {
  const client = prisma()
  const [aktif, riwayat, pesananAktif] = await Promise.all([
    client.qrisConfig.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
    client.qrisConfig.findMany({
      where: { isActive: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    client.order.count({ where: { orderStatus: 'MENUNGGU_PEMBAYARAN' } }),
  ])

  const ringkas = (item: any) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    keterangan: item.keterangan,
    uploadedById: item.uploadedById,
    replacedAt: item.replacedAt,
    createdAt: item.createdAt,
  })

  return {
    aktif: aktif ? ringkas(aktif) : null,
    riwayat: riwayat.map(ringkas),
    jumlahPesananAktif: pesananAktif,
    peringatan: pesanPeringatanQris(pesananAktif),
  }
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Hanya Admin Utama yang dapat mengelola QRIS' }, { status: 403 })
    }
    return NextResponse.json(await dataQris())
  } catch (error: any) {
    console.error('API GET /api/admin/qris error:', error)
    return NextResponse.json({ error: 'Gagal memuat QRIS' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Hanya Admin Utama yang dapat mengganti QRIS' }, { status: 403 })
    }

    const form = await request.formData()
    const berkas = form.get('file')
    const konfirmasi = String(form.get('konfirmasi') ?? '')
    const password = String(form.get('password') ?? '')
    const otp = String(form.get('otp') ?? '')
    const keterangan = String(form.get('keterangan') ?? '').slice(0, 200)

    const cekKonfirmasi = validasiKonfirmasiSensitif({ konfirmasi, password, otp })
    if (!cekKonfirmasi.valid) {
      return NextResponse.json({ error: cekKonfirmasi.alasan }, { status: 400 })
    }

    if (!adalahBerkas(berkas)) {
      return NextResponse.json({ error: 'Gambar QRIS wajib diunggah' }, { status: 400 })
    }
    const cekFile = validasiFileGambar({
      name: berkas.name,
      type: berkas.type,
      size: berkas.size,
    })
    if (!cekFile.valid) {
      return NextResponse.json({ error: cekFile.alasan }, { status: 400 })
    }

    const buffer = Buffer.from(await berkas.arrayBuffer())
    const cekTandaTangan = validasiTandaTanganGambar(
      new Uint8Array(buffer),
      berkas.type.toLowerCase()
    )
    if (!cekTandaTangan.valid) {
      return NextResponse.json({ error: cekTandaTangan.alasan }, { status: 400 })
    }

    const admin = await prisma().user.findUnique({ where: { id: user.id } })
    if (!admin || !validasiKredensial(password, admin.passwordHash)) {
      return NextResponse.json({ error: 'Kata sandi tidak benar' }, { status: 401 })
    }

    const sekarang = new Date()
    const otpRecord = await prisma().otpAndRecoveryToken.findFirst({
      where: {
        userId: user.id,
        type: 'OTP_SENSITIF',
        usedAt: null,
        expiresAt: { gt: sekarang },
      },
      orderBy: { expiresAt: 'desc' },
    })
    if (!otpRecord || otpRecord.codeHash !== hashToken(otp)) {
      if (otpRecord) {
        const gagal = otpRecord.failedAttempts + 1
        await prisma().otpAndRecoveryToken.update({
          where: { id: otpRecord.id },
          data: {
            failedAttempts: gagal,
            ...(gagal >= 5 ? { usedAt: sekarang } : {}),
          },
        })
      }
      return NextResponse.json({ error: 'OTP tidak valid atau sudah kedaluarsa' }, { status: 401 })
    }

    const qrisId = crypto.randomUUID()
    const tersimpan = await simpanBerkas(berkas, 'qris', qrisId)

    try {
      await prisma().$transaction(
        async (tx: any) => {
          const dikonsumsi = await tx.otpAndRecoveryToken.updateMany({
            where: { id: otpRecord.id, usedAt: null },
            data: { usedAt: sekarang },
          })
          if (dikonsumsi.count !== 1) throw new Error('OTP sudah digunakan')

          const lama = await tx.qrisConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          })
          if (lama) {
            await tx.qrisConfig.update({
              where: { id: lama.id },
              data: { isActive: false, replacedById: user.id, replacedAt: sekarang },
            })
          }

          await tx.qrisConfig.create({
            data: {
              id: qrisId,
              imageUrl: tersimpan.imageUrl,
              storageName: tersimpan.storageName,
              isActive: true,
              uploadedById: user.id,
              userUserId: user.id,
              keterangan: keterangan || null,
            },
          })

          const pesananAktif = await tx.order.findMany({
            where: { orderStatus: 'MENUNGGU_PEMBAYARAN' },
            select: { id: true, orderNumber: true, customerId: true },
          })
          for (const pesanan of pesananAktif) {
            await tx.notification.create({
              data: {
                userId: pesanan.customerId,
                userUserId: pesanan.customerId,
                groupKey: `qris:diganti:${qrisId}:${pesanan.id}`,
                message:
                  `QRIS toko telah diperbarui. Pesanan ${pesanan.orderNumber} ` +
                  'mungkin menggunakan QRIS lama. Silakan lihat QRIS terbaru sebelum transfer.',
                isRead: false,
                retryCount: 0,
              },
            })
          }

          await catatAudit({
            actorId: user.id,
            actorRole: 'ADMIN_UTAMA',
            action: 'GANTI_QRIS',
            targetEntity: 'QrisConfig',
            targetId: qrisId,
            oldValue: lama ? { imageUrl: lama.imageUrl, isActive: true } : {},
            newValue: { imageUrl: tersimpan.imageUrl, isActive: true, keterangan },
            reason: keterangan || 'Penggantian QRIS toko',
            client: tx,
          })

          return { qrisId, jumlahDiberitahu: pesananAktif.length }
        },
        { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
      )

      beriTahuTerminal(
        'QRIS Toko Diperbarui',
        `QRIS baru disimpan. Notifikasi terkirim ke pesanan aktif. Keterangan: ${keterangan || '-'}`
      )

      return NextResponse.json({
        success: true,
        pesan: 'QRIS berhasil diperbarui. Riwayat QRIS lama tetap tersimpan.',
        data: await dataQris(),
      })
    } catch (error: any) {
      console.error('Transaksi ganti QRIS gagal:', error)
      return NextResponse.json(
        { error: error?.message || 'Gagal menyimpan QRIS baru' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('API POST /api/admin/qris error:', error)
    return NextResponse.json({ error: 'Gagal memproses QRIS' }, { status: 500 })
  }
}
