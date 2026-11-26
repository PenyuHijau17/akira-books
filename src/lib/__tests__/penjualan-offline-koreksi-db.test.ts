import { afterAll, describe, expect, it, vi } from 'vitest'

const sesi = vi.hoisted(() => ({
  id: '',
  role: 'ADMIN_BIASA' as string,
}))

vi.mock('@/lib/auth', () => ({
  getSessionUser: async () => ({
    id: sesi.id,
    email: 'uji-koreksi@example.test',
    name: 'Uji Koreksi',
    whatsapp: null,
    role: sesi.role,
    isActive: true,
  }),
}))

import prisma from '@/lib/prisma'
import { POST } from '@/app/api/admin/penjualan-offline/[saleId]/route'

function param(saleId: string) {
  return { params: Promise.resolve({ saleId }) }
}

async function kirim(
  saleId: string,
  body: Record<string, unknown>,
  peran: string,
  userId: string
) {
  sesi.role = peran
  sesi.id = userId
  const respons = await POST(
    new Request('http://localhost/api/admin/penjualan-offline/koreksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    param(saleId)
  )
  return { status: respons.status, isi: await respons.json() }
}

describe('Tahap 11 — usul & persetujuan koreksi harga offline (database nyata, GR-06)', () => {
  const unik = Date.now().toString(36)
  const dibersihkan: { koreksiIds: string[]; saleId?: string } = {
    koreksiIds: [],
  }

  afterAll(async () => {
    // AdminAuditLog sengaja tidak dihapus: GR-06 bersifat append-only, termasuk di database.
    const db = prisma()
    if (dibersihkan.koreksiIds.length > 0) {
      await db.notification
        .deleteMany({
          where: {
            OR: dibersihkan.koreksiIds.flatMap((id) => [
              { groupKey: { contains: `koreksi-offline:usul:${id}` } },
              { groupKey: { contains: `koreksi-offline:keputusan:${id}` } },
            ]),
          },
        })
        .catch(() => undefined)
      await db.offlinePriceCorrection
        .deleteMany({ where: { id: { in: dibersihkan.koreksiIds } } })
        .catch(() => undefined)
    }
    if (dibersihkan.saleId) {
      await db.offlineSaleItem
        .deleteMany({ where: { offlineSaleId: dibersihkan.saleId } })
        .catch(() => undefined)
      await db.offlineSale.delete({ where: { id: dibersihkan.saleId } }).catch(() => undefined)
    }
    await db.user
      .deleteMany({ where: { email: { endsWith: `koreksi11-${unik}@example.test` } } })
      .catch(() => undefined)
    await db.book.deleteMany({ where: { code: `KOR11-${unik}` } }).catch(() => undefined)
    await db.category.deleteMany({ where: { name: `Koreksi11-${unik}` } }).catch(() => undefined)
  })

  it('harga baru berlaku hanya setelah Admin Utama menyetujui, dengan audit append-only', async () => {
    const db = prisma()
    const adminBiasa = await db.user.create({
      data: {
        email: `biasa-koreksi11-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Admin Biasa Koreksi',
        role: 'ADMIN_BIASA',
      },
    })
    const adminUtama = await db.user.create({
      data: {
        email: `utama-koreksi11-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Admin Utama Koreksi',
        role: 'ADMIN_UTAMA',
      },
    })
    const kategori = await db.category.create({ data: { name: `Koreksi11-${unik}` } })
    const buku = await db.book.create({
      data: {
        code: `KOR11-${unik}`,
        title: 'Buku Koreksi Harga',
        author: 'Uji',
        publisher: 'Uji',
        publishYear: 2026,
        sellingPrice: 70000,
        costPrice: 30000,
        stockTotal: 8,
        stockReserved: 0,
        status: 'TERSEDIA',
        categoryId: kategori.id,
      },
    })
    const sale = await db.offlineSale.create({
      data: {
        recordedById: adminBiasa.id,
        userUserId: adminBiasa.id,
        status: 'SELESAI',
      },
    })
    dibersihkan.saleId = sale.id
    const item = await db.offlineSaleItem.create({
      data: {
        offlineSaleId: sale.id,
        offlineSaleOfflineSaleId: sale.id,
        bookId: buku.id,
        bookBookId: buku.id,
        quantity: 2,
        actualSellingPrice: 70000,
        costPrice: 30000,
        snapshotTitle: buku.title,
        subtotal: 140000,
      },
    })

    const usul = await kirim(
      sale.id,
      {
        action: 'USUL_KOREKSI',
        itemId: item.id,
        hargaBaru: 75000,
        alasan: 'Harga kesepakatan di lapak',
      },
      'ADMIN_BIASA',
      adminBiasa.id
    )
    expect(usul.status).toBe(200)
    expect(usul.isi.hasil.status).toBe('MENUNGGU_PERSETUJUAN')
    dibersihkan.koreksiIds.push(usul.isi.hasil.koreksiId)
    expect(usul.isi.hasil.hargaBerlaku).toBe(70000)
    expect(
      (await db.offlineSaleItem.findUnique({ where: { id: item.id } }))?.actualSellingPrice
    ).toBe(70000)

    const auditUsul = await db.adminAuditLog.findMany({
      where: { targetId: usul.isi.hasil.koreksiId },
    })
    expect(auditUsul).toHaveLength(1)
    expect(auditUsul[0].action).toBe('USUL_KOREKSI_HARGA_OFFLINE')
    expect(auditUsul[0].actorRoleSnapshot).toBe('ADMIN_BIASA')

    const ditolakAkses = await kirim(
      sale.id,
      {
        action: 'SETUJUI_KOREKSI',
        koreksiId: usul.isi.hasil.koreksiId,
        alasan: 'Saya setujui',
      },
      'ADMIN_BIASA',
      adminBiasa.id
    )
    expect(ditolakAkses.status).toBe(409)
    expect(ditolakAkses.isi.error).toContain('Admin Utama')
    expect(
      (await db.offlineSaleItem.findUnique({ where: { id: item.id } }))?.actualSellingPrice
    ).toBe(70000)

    const setuju = await kirim(
      sale.id,
      {
        action: 'SETUJUI_KOREKSI',
        koreksiId: usul.isi.hasil.koreksiId,
        alasan: 'Sesuai nota penjualan',
      },
      'ADMIN_UTAMA',
      adminUtama.id
    )
    expect(setuju.status).toBe(200)
    expect(setuju.isi.hasil.hargaBerlaku).toBe(75000)
    const itemSesudah = await db.offlineSaleItem.findUnique({ where: { id: item.id } })
    expect(itemSesudah?.actualSellingPrice).toBe(75000)
    expect(itemSesudah?.subtotal).toBe(150000)

    const semuaAudit = await db.adminAuditLog.findMany({
      where: { targetId: usul.isi.hasil.koreksiId },
      orderBy: { createdAt: 'asc' },
    })
    expect(semuaAudit.map((a) => a.action)).toEqual([
      'USUL_KOREKSI_HARGA_OFFLINE',
      'SETUJUI_KOREKSI_HARGA_OFFLINE',
    ])
    expect(semuaAudit[1].actorRoleSnapshot).toBe('ADMIN_UTAMA')

    const usulKedua = await kirim(
      sale.id,
      {
        action: 'USUL_KOREKSI',
        itemId: item.id,
        hargaBaru: 80000,
        alasan: 'Koreksi kedua',
      },
      'ADMIN_BIASA',
      adminBiasa.id
    )
    expect(usulKedua.status).toBe(200)
    dibersihkan.koreksiIds.push(usulKedua.isi.hasil.koreksiId)

    const tolakTanpaAlasan = await kirim(
      sale.id,
      { action: 'TOLAK_KOREKSI', koreksiId: usulKedua.isi.hasil.koreksiId, alasan: '' },
      'ADMIN_UTAMA',
      adminUtama.id
    )
    expect(tolakTanpaAlasan.status).toBe(409)
    expect(tolakTanpaAlasan.isi.error).toContain('Alasan penolakan')
    expect(
      (await db.offlineSaleItem.findUnique({ where: { id: item.id } }))?.actualSellingPrice
    ).toBe(75000)
  }, 90000)
})
