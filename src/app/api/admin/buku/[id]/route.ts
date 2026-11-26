// src/app/api/admin/buku/[id]/route.ts
// Ubah/nonaktifkan/hapus permanen buku. GR-02: otorisasi di server.
// GR-03: costPrice hanya boleh diubah Admin Utama dan tidak pernah muncul di DTO Admin Biasa.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { boleLihatModalLaba, butuhAksesAdmin } from '@/lib/rbac'
import { catatAudit } from '@/lib/pembayaranServer'
import { dtoBuku } from '@/lib/buku'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

// PUT /api/admin/buku/[id] — ubah data buku / nonaktifkan.
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!butuhAksesAdmin(user.role)) return gagal('Hanya admin yang dapat mengubah buku', 403)

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const bukuLama = await prisma().book.findUnique({ where: { id } })
    if (!bukuLama) return gagal('Buku tidak ditemukan', 404)

    const bolehModal = boleLihatModalLaba(user.role)
    const hanyaNonaktifkan = Boolean(body?.hanyaNonaktifkan)
    const statusBaru = hanyaNonaktifkan ? 'NONAKTIF' : String(body?.status || bukuLama.status)

    const data: any = {
      code: hanyaNonaktifkan ? bukuLama.code : String(body?.code ?? bukuLama.code),
      title: hanyaNonaktifkan ? bukuLama.title : String(body?.title ?? bukuLama.title),
      author: hanyaNonaktifkan ? bukuLama.author : String(body?.author ?? bukuLama.author),
      publisher: hanyaNonaktifkan ? bukuLama.publisher : String(body?.publisher ?? bukuLama.publisher),
      publishYear: hanyaNonaktifkan ? bukuLama.publishYear : Number(body?.publishYear ?? bukuLama.publishYear),
      imageUrl: hanyaNonaktifkan ? bukuLama.imageUrl : String(body?.imageUrl ?? bukuLama.imageUrl),
      description: hanyaNonaktifkan ? bukuLama.description : String(body?.description ?? bukuLama.description),
      sellingPrice: hanyaNonaktifkan ? bukuLama.sellingPrice : Number(body?.sellingPrice ?? bukuLama.sellingPrice),
      stockTotal: hanyaNonaktifkan ? bukuLama.stockTotal : Number(body?.stockTotal ?? bukuLama.stockTotal),
      status: statusBaru,
    }
    // Admin Biasa tidak boleh menyentuh modal; nilai lama tetap dipertahankan.
    if (bolehModal && body?.costPrice !== undefined && !hanyaNonaktifkan) {
      data.costPrice = Number(body.costPrice)
    }
    if (Number(data.stockTotal) < 0) return gagal('Stok tidak boleh negatif', 400)

    const bukuBaru = await prisma().book.update({ where: { id }, data })

    if (bolehModal && data.costPrice !== undefined && data.costPrice !== bukuLama.costPrice) {
      await prisma().bookCostHistory.create({
        data: {
          bookId: id,
          oldCostPrice: bukuLama.costPrice,
          newCostPrice: data.costPrice,
          reason: String(body?.alasanModal || 'Koreksi modal oleh Admin Utama'),
          changedById: user.id,
        },
      })
    }

    await catatAudit({
      actorId: user.id,
      actorRole: user.role,
      action: hanyaNonaktifkan ? 'NONAKTIFKAN_BUKU' : 'UBAH_BUKU',
      targetEntity: 'Book',
      targetId: id,
      oldValue: dtoBuku(bukuLama, user.role),
      newValue: dtoBuku(bukuBaru, user.role),
      reason: String(body?.alasan || (hanyaNonaktifkan ? 'Buku dinonaktifkan' : 'Data buku diperbarui')),
    })

    return NextResponse.json({ success: true, book: dtoBuku(bukuBaru, user.role) })
  } catch (error) {
    console.error('Gagal mengubah buku:', error)
    return gagal('Gagal mengubah buku', 500)
  }
}

// DELETE /api/admin/buku/[id] — hapus permanen, HANYA Admin Utama.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_UTAMA') {
      return gagal('Hanya Admin Utama yang dapat menghapus buku permanen', 403)
    }

    const { id } = await context.params
    const buku = await prisma().book.findUnique({ where: { id } })
    if (!buku) return gagal('Buku tidak ditemukan', 404)
    if (buku.stockReserved > 0) {
      return gagal('Buku masih memiliki stok tertahan pesanan dan tidak dapat dihapus', 400)
    }

    await prisma().book.delete({ where: { id } })
    await catatAudit({
      actorId: user.id,
      actorRole: 'ADMIN_UTAMA',
      action: 'HAPUS_BUKU_PERMANEN',
      targetEntity: 'Book',
      targetId: id,
      oldValue: dtoBuku(buku, user.role),
      newValue: {},
      reason: 'Penghapusan permanen buku oleh Admin Utama',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gagal menghapus buku:', error)
    return gagal('Gagal menghapus buku', 500)
  }
}
