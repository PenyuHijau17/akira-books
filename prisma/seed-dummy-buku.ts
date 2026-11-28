// prisma/seed-dummy-buku.ts
// Seeder dummy katalog buku Indonesia untuk pengujian beranda, /katalog,
// detail buku, dan /admin/buku.
//
// Jalankan di dalam container Docker:
//   docker compose exec app npx --yes tsx prisma/seed-dummy-buku.ts
//
// Idempoten: buku yang sudah ada berdasarkan `code` dilewati (tidak ditimpa).
// `upsert` dengan `update: {}` dipakai sebagai pengaman race condition agar
// dua kali eksekusi tidak pernah membuat duplikat kode.
//
// Sampul dummy sengaja TIDAK dibuat. Semua buku dummy memakai `imageUrl: null`
// sehingga UI menampilkan placeholder "Tanpa Sampul" bawaan tanpa memuat gambar.
// Sampul yang diunggah manual melalui admin (/api/media/sampul/...) tidak disentuh.

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { daftarDummyBuku } from '../src/lib/dataDummyBuku'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL belum disetel. Jalankan seeder lewat docker compose exec app.')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== Memulai seeder dummy katalog buku ===\n')

  // 1. Siapkan kategori (juga idempoten, tanpa mengubah nama yang sudah ada).
  const namaKategori = Array.from(
    new Set(daftarDummyBuku.map((buku) => buku.kategori))
  ).sort()
  const petaKategori = new Map<string, string>()

  for (const nama of namaKategori) {
    const kategori = await prisma.category.upsert({
      where: { name: nama },
      update: {},
      create: { name: nama },
    })
    petaKategori.set(nama, kategori.id)
  }
  console.log(`✓ Kategori siap (${namaKategori.length}): ${namaKategori.join(', ')}`)

  // 2. Bersihkan hanya tautan sampul dummy hasil generator lama.
  //    URL sampul unggahan manual (/api/media/sampul/...) sengaja dipertahankan.
  const kodeDummy = daftarDummyBuku.map((buku) => buku.code)
  const dibersihkan = await prisma.book.updateMany({
    where: {
      code: { in: kodeDummy },
      imageUrl: { startsWith: '/uploads/covers/' },
    },
    data: { imageUrl: null },
  })
  if (dibersihkan.count > 0) {
    console.log(`✓ Cover dummy dikosongkan pada ${dibersihkan.count} buku`)
  } else {
    console.log('✓ Tidak ada tautan cover dummy yang perlu dikosongkan')
  }

  // 3. Pastikan seluruh buku dummy ada tanpa membuat file gambar.
  let dibuat = 0
  let dilewati = 0

  for (const buku of daftarDummyBuku) {
    const sudahAda = await prisma.book.findUnique({
      where: { code: buku.code },
      select: { id: true, title: true },
    })

    if (sudahAda) {
      dilewati++
      console.log(`- Lewati ${buku.code}: sudah ada "${sudahAda.title}" (data tidak diubah)`)
      continue
    }

    const categoryId = petaKategori.get(buku.kategori)
    if (!categoryId) {
      throw new Error(`Kategori "${buku.kategori}" tidak ditemukan untuk ${buku.code}`)
    }

    const hasil = await prisma.book.upsert({
      where: { code: buku.code },
      update: {},
      create: {
        code: buku.code,
        title: buku.title,
        author: buku.author,
        publisher: buku.publisher,
        publishYear: buku.publishYear,
        imageUrl: null,
        description: `Kondisi: ${buku.kondisi}. ${buku.sinopsis}`,
        sellingPrice: buku.hargaJual,
        costPrice: buku.hargaModal,
        stockTotal: buku.stok,
        stockReserved: 0,
        status: buku.status,
        categoryId,
      },
    })

    if (buku.stok > 0) {
      await prisma.stockMovement.create({
        data: {
          bookId: hasil.id,
          type: 'MASUK',
          quantity: buku.stok,
          reason: 'Stok awal dari seeder dummy katalog',
          createdBy: null,
        },
      })
    }

    dibuat++
    console.log(`+ ${buku.code}: ${buku.title} (${buku.kondisi}, stok ${buku.stok})`)
  }

  const totalBuku = await prisma.book.count()
  console.log(`\nRingkasan: ${dibuat} buku dibuat, ${dilewati} buku dilewati.`)
  console.log(`Total buku di database sekarang: ${totalBuku}`)
  console.log('Sampul: placeholder "Tanpa Sampul" (tidak ada file dummy yang dibuat)')
  console.log('\n=== Seeder selesai ===')
}

main()
  .catch((error) => {
    console.error('Error selama seeding dummy buku:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
