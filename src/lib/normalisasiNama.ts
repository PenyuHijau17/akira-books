// src/lib/normalisasiNama.ts
// Lapisan server: rapikan spasi dan samakan Penulis/Penerbit dengan ejaan yang
// sudah tersimpan di database (case-insensitive). Dipakai POST & PATCH buku.

import prisma from '@/lib/prisma'
import { daftarNamaUnik, rapikanNama, samakanNama } from '@/lib/namaBuku'

export async function samakanNamaBuku(
  author: unknown,
  publisher: unknown
): Promise<{ author: string; publisher: string }> {
  const penulis = rapikanNama(author)
  const penerbit = rapikanNama(publisher)
  if (!penulis && !penerbit) return { author: '', publisher: '' }

  const buku = await prisma().book.findMany({
    select: { author: true, publisher: true },
  })
  const daftarPenulis = daftarNamaUnik(buku.map((item) => item.author))
  const daftarPenerbit = daftarNamaUnik(buku.map((item) => item.publisher))

  return {
    author: samakanNama(penulis, daftarPenulis),
    publisher: samakanNama(penerbit, daftarPenerbit),
  }
}
