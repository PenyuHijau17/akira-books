// src/lib/buku.ts
// DTO buku untuk admin: GR-03 — costPrice hanya boleh muncul untuk Admin Utama.

import { boleLihatModalLaba, type RolePengguna } from '@/lib/rbac'

export function dtoBuku(buku: any, peran: RolePengguna | string) {
  const aman: Record<string, unknown> = {
    id: buku.id,
    code: buku.code,
    title: buku.title,
    author: buku.author,
    publisher: buku.publisher,
    publishYear: buku.publishYear,
    imageUrl: buku.imageUrl,
    description: buku.description,
    sellingPrice: buku.sellingPrice,
    stockTotal: buku.stockTotal,
    stockReserved: buku.stockReserved,
    status: buku.status,
    categoryId: buku.categoryId,
  }
  if (boleLihatModalLaba(peran as RolePengguna)) aman.costPrice = buku.costPrice
  return aman
}
