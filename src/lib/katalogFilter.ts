// src/lib/katalogFilter.ts
// Penyusun filter katalog (murni) agar bisa diuji tanpa database.

export type KatalogFilter = {
  q?: string
  kategori?: string
  penulis?: string
  penerbit?: string
  status?: string
  sort?: string
}

export function bangunWhereKatalog(filter: KatalogFilter): Record<string, unknown> {
  const where: Record<string, unknown> = {
    status: filter.status || 'TERSEDIA',
  }

  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { author: { contains: filter.q, mode: 'insensitive' } },
      { code: { contains: filter.q, mode: 'insensitive' } },
    ]
  }
  if (filter.kategori) where.categoryId = filter.kategori
  if (filter.penulis) where.author = { equals: filter.penulis, mode: 'insensitive' }
  if (filter.penerbit) where.publisher = { equals: filter.penerbit, mode: 'insensitive' }

  return where
}

export function bangunOrderKatalog(sort?: string): Record<string, 'asc' | 'desc'> {
  if (sort === 'harga_rendah') return { sellingPrice: 'asc' }
  if (sort === 'harga_tinggi') return { sellingPrice: 'desc' }
  return { id: 'desc' }
}
