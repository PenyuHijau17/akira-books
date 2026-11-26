// src/app/api/admin/audit/route.ts
// Tahap 14 — pembaca audit administratif untuk Admin Utama (GR-06).
// Audit bersifat append-only: endpoint ini HANYA membaca, tidak pernah menulis/mengubah/menghapus.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { dapatkanRiwayatAudit, EnumRoleActor } from '@/lib/audit'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_UTAMA') {
      return gagal('Hanya Admin Utama yang dapat membaca audit administratif', 403)
    }

    const { searchParams } = new URL(request.url)
    const targetEntity = searchParams.get('targetEntity') || undefined
    const targetId = searchParams.get('targetId') || undefined
    const peran = searchParams.get('actorRole')
    const actorRole = Object.values(EnumRoleActor).includes(peran as EnumRoleActor)
      ? (peran as EnumRoleActor)
      : undefined

    const daftar = await dapatkanRiwayatAudit(prisma(), {
      targetEntity,
      targetId,
      actorRole,
    })

    return NextResponse.json({ daftar })
  } catch (error) {
    console.error('API GET /api/admin/audit error:', error)
    return gagal('Gagal memuat audit administratif', 500)
  }
}
