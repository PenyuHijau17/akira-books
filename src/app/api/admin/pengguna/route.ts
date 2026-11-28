// src/app/api/admin/pengguna/route.ts
// Kelola Pengguna — khusus ADMIN_UTAMA (GR-02, BR-005, FR-ACC-004/007).
// DTO memakai daftar putih: passwordHash dan field sensitif lain tidak pernah dikirim (GR-03).

import type { Prisma } from '@/generated/prisma/client'
import { NextResponse } from 'next/server'
import { getSessionUser, hashPassword } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { catatAudit } from '@/lib/pembayaranServer'
import {
  dtoAkunPengguna,
  adalahPeranYangBolehDiubah,
  type RingkasanPeran,
} from '@/lib/kelolaPengguna'
import { konsumsiOtpAdmin, mintaOtpAdmin } from '@/lib/otpAdmin'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

async function pastiAdminUtama(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return { user: null, respons: gagal('Sesi tidak valid. Silakan masuk kembali.', 401) }
  if (user.role !== 'ADMIN_UTAMA') {
    return { user: null, respons: gagal('Hanya Admin Utama yang dapat mengelola pengguna', 403) }
  }
  return { user, respons: null }
}

const EMAIL_VALID = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// GET: daftar seluruh akun + ringkasan peran; pencarian nama/email & filter peran.
export async function GET(request: Request) {
  try {
    const { respons } = await pastiAdminUtama(request)
    if (respons) return respons

    const db = prisma()
    const { searchParams } = new URL(request.url)
    const cari = String(searchParams.get('cari') ?? '').trim()
    const peran = String(searchParams.get('peran') ?? '').trim()

    const where: Prisma.UserWhereInput = {}
    if (adalahPeranYangBolehDiubah(peran) || peran === 'ADMIN_UTAMA') {
      where.role = peran as Prisma.UserWhereInput['role']
    }
    if (cari) {
      where.OR = [
        { name: { contains: cari, mode: 'insensitive' } },
        { email: { contains: cari, mode: 'insensitive' } },
      ]
    }

    const [baris, hitunganPesanan, hitunganPeran] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.order.groupBy({
        by: ['customerId'],
        _count: { _all: true },
      }),
      db.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ])

    const petaPesanan = new Map(
      hitunganPesanan.map((barisHitungan) => [
        barisHitungan.customerId,
        barisHitungan._count._all,
      ])
    )
    const akun = baris.map((barisAkun) =>
      dtoAkunPengguna(barisAkun, petaPesanan.get(barisAkun.id) ?? 0)
    )

    const ringkasan: RingkasanPeran = {
      CUSTOMER: 0,
      ADMIN_BIASA: 0,
      ADMIN_UTAMA: 0,
      total: 0,
    }
    for (const barisHitungan of hitunganPeran) {
      if (barisHitungan.role in ringkasan) {
        ringkasan[barisHitungan.role] = barisHitungan._count._all
      }
      ringkasan.total += barisHitungan._count._all
    }

    return NextResponse.json({ akun, ringkasan })
  } catch (error) {
    console.error('API GET /api/admin/pengguna error:', error)
    return gagal('Gagal memuat daftar pengguna', 500)
  }
}

// POST: minta OTP atau buat akun baru oleh Admin Utama.
export async function POST(request: Request) {
  try {
    const { user, respons } = await pastiAdminUtama(request)
    if (respons || !user) return respons ?? gagal('Sesi tidak valid. Silakan masuk kembali.', 401)

    const body = await request.json().catch(() => null)
    if (String(body?.action ?? '') === 'minta-otp') {
      const hasil = await mintaOtpAdmin(user.id, user.email)
      if (!hasil.ok) return gagal(hasil.pesan, hasil.status)
      return NextResponse.json({ success: true, pesan: hasil.pesan })
    }

    const nama = String(body?.nama ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const whatsapp = String(body?.whatsapp ?? '').trim()
    const password = String(body?.password ?? '')
    const peran = body?.peran
    const otp = String(body?.otp ?? '')

    if (!nama) return gagal('Nama wajib diisi', 400)
    if (!EMAIL_VALID.test(email)) return gagal('Format email tidak valid', 400)
    if (password.length < 8) return gagal('Kata sandi minimal 8 karakter', 400)
    if (!adalahPeranYangBolehDiubah(peran)) {
      return gagal('Peran hanya boleh Pelanggan atau Admin Biasa', 400)
    }
    if (!/^\d{6}$/.test(otp)) return gagal('OTP 6 digit wajib diisi', 400)

    const db = prisma()
    const sudahAda = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (sudahAda) return gagal('Email sudah terdaftar', 409)

    let otpSah = false
    const dibuat = await db.$transaction(async (tx) => {
      otpSah = await konsumsiOtpAdmin(user.id, otp, tx)
      if (!otpSah) return null
      const akunBaru = await tx.user.create({
        data: {
          name: nama,
          email,
          whatsapp: whatsapp || null,
          passwordHash: hashPassword(password),
          role: peran,
          isActive: true,
        },
      })
      await catatAudit({
        actorId: user.id,
        actorRole: user.role,
        action: peran === 'ADMIN_BIASA' ? 'BUAT_ADMIN' : 'BUAT_AKUN',
        targetEntity: 'User',
        targetId: akunBaru.id,
        oldValue: {},
        newValue: { email, nama, peran },
        reason: 'Pembuatan akun melalui Kelola Pengguna',
        client: tx,
      })
      return akunBaru
    })

    if (!otpSah) return gagal('OTP tidak valid atau sudah kedaluarsa', 401)
    if (!dibuat) return gagal('Gagal membuat akun', 500)

    return NextResponse.json({
      success: true,
      pesan: 'Akun berhasil dibuat',
      akun: dtoAkunPengguna(dibuat, 0),
    })
  } catch (error: unknown) {
    const kode =
      error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (kode === 'P2002') return gagal('Email sudah terdaftar', 409)
    console.error('API POST /api/admin/pengguna error:', error)
    return gagal('Terjadi kesalahan sistem', 500)
  }
}
