"use client"

// src/app/ditandai/page.tsx
// Halaman Buku Ditandai (wishlist) untuk Customer.
// 100% Bahasa Indonesia. Otorisasi tetap diverifikasi API/server (GR-02).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TandaiBukuProvider, useTandaiBuku } from '@/components/TandaiBukuContext'
import { TombolTandaiBuku } from '@/components/TombolTandaiBuku'
import { slugBuku } from '@/lib/slugBuku'

type BukuDitandai = {
  id: string
  code: string
  slug: string
  title: string
  author: string
  publisher: string
  imageUrl: string | null
  sellingPrice: number
  stockTotal: number
  status: string
  kategori: string
}

export default function DitandaiPage() {
  return (
    <TandaiBukuProvider>
      <DaftarBukuDitandai />
    </TandaiBukuProvider>
  )
}

function DaftarBukuDitandai() {
  const {
    pengguna,
    bookIds,
    sedangMuat: sedangMuatSesi,
    pesan: pesanTandai,
  } = useTandaiBuku()
  const [books, setBooks] = useState<BukuDitandai[]>([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menambahId, setMenambahId] = useState<string | null>(null)
  const [pesanKeranjang, setPesanKeranjang] = useState<Record<string, string>>({})

  useEffect(() => {
    if (sedangMuatSesi) return

    if (pengguna?.role !== 'CUSTOMER') {
      setSedangMuat(false)
      return
    }

    let aktif = true
    setSedangMuat(true)
    setError(null)

    fetch('/api/tandai-buku?detail=1', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Gagal mengambil buku ditandai')
        return res.json()
      })
      .then((data) => {
        if (aktif) setBooks(Array.isArray(data?.books) ? data.books : [])
      })
      .catch((e: any) => {
        if (aktif) setError(e?.message || 'Terjadi kesalahan')
      })
      .finally(() => {
        if (aktif) setSedangMuat(false)
      })

    return () => {
      aktif = false
    }
  }, [pengguna, sedangMuatSesi])

  async function tambahKeKeranjang(book: BukuDitandai) {
    setMenambahId(book.id)
    setPesanKeranjang((sebelum) => ({ ...sebelum, [book.id]: '' }))
    try {
      const res = await fetch('/api/keranjang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, quantity: 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Gagal menambah buku ke keranjang')
      setPesanKeranjang((sebelum) => ({
        ...sebelum,
        [book.id]: 'Berhasil ditambahkan ke keranjang.',
      }))
    } catch (e: any) {
      setPesanKeranjang((sebelum) => ({
        ...sebelum,
        [book.id]: e?.message || 'Gagal menambah buku ke keranjang.',
      }))
    } finally {
      setMenambahId(null)
    }
  }

  // Ikut berubah seketika saat tandaan dihapus dari halaman ini.
  const daftarTampil = books.filter((book) => bookIds.has(book.id))

  if (sedangMuatSesi || sedangMuat) {
    return (
      <div className="min-h-screen p-8 text-center text-[#6B4F43]">
        Memuat buku ditandai...
      </div>
    )
  }

  if (pengguna?.role !== 'CUSTOMER') {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[#4A2C2A]">Buku Ditandai</h1>
        <p className="mb-4 text-[#6B4F43]">
          Silakan masuk sebagai pelanggan untuk menyimpan dan melihat buku yang Anda incar.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-sm bg-[#8D5B4C] px-4 py-2 text-sm font-semibold text-[#FAF6F0] hover:bg-[#6D463B]"
        >
          Masuk Sekarang
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-4 text-sm text-[#6B4F43]">
          <Link href="/katalog" className="underline hover:text-[#8D5B4C]">
            Kembali ke Katalog
          </Link>
          <span> › </span>
          <span>Buku Ditandai</span>
        </nav>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4A2C2A]">Buku Ditandai</h1>
            <p className="mt-1 text-sm text-[#6B4F43]">
              {daftarTampil.length} buku tersimpan. Kini lebih mudah ditemukan saat hendak dibeli.
            </p>
          </div>
          <Link
            href="/katalog"
            className="rounded-sm border border-[#C8B6A6] bg-[#FFFDF9] px-3 py-2 text-sm font-semibold text-[#4A2C2A] hover:bg-[#F3ECE1]"
          >
            Jelajahi Katalog
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-[#9A4A34]">{error}</p>}
        {pesanTandai && (
          <p role="status" className="mb-4 text-sm text-[#3F6B45]">{pesanTandai}</p>
        )}

        {daftarTampil.length === 0 ? (
          <div className="rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] p-8 text-center text-[#6B4F43]">
            <p className="font-medium">Belum ada buku yang ditandai.</p>
            <p className="mt-1 text-sm">
              Tekan tombol Tandai pada buku di katalog untuk menyimpannya di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {daftarTampil.map((book) => {
              const slug = encodeURIComponent(
                book.slug || slugBuku(book.title, book.code) || book.code || book.id
              )
              const bisaBeli = book.status === 'TERSEDIA' && Number(book.stockTotal) > 0

              return (
                <article
                  key={book.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] shadow-sm"
                >
                  <Link href={`/katalog/${slug}`} aria-label={`Lihat detail ${book.title}`}>
                    {book.imageUrl ? (
                      <img
                        src={book.imageUrl}
                        alt={`Sampul ${book.title}`}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center bg-[#F3ECE1] text-sm text-[#8D5B4C]">
                        Tanpa Sampul
                      </div>
                    )}
                  </Link>

                  <div className="mt-auto border-t border-[#E6DCD0] p-3">
                    <h2 className="line-clamp-2 text-sm font-semibold text-[#3E2723]">
                      {book.title}
                    </h2>
                    <p className="line-clamp-1 text-xs text-[#6B4F43]">{book.author}</p>
                    <p className="mt-2 font-bold text-[#8D5B4C]">
                      Rp {Number(book.sellingPrice || 0).toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1 text-xs text-[#6B4F43]">
                      Status: {book.status} · Stok: {book.stockTotal} eksemplar
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/katalog/${slug}`}
                        className="inline-flex items-center rounded-sm border border-[#C8B6A6] px-3 py-1.5 text-xs font-semibold text-[#4A2C2A] hover:bg-[#F3ECE1]"
                      >
                        Lihat Detail
                      </Link>
                      <TombolTandaiBuku bookId={book.id} judul={book.title} />
                      {bisaBeli && (
                        <button
                          type="button"
                          onClick={() => tambahKeKeranjang(book)}
                          disabled={menambahId === book.id}
                          className="inline-flex items-center rounded-sm bg-[#4A2C2A] px-3 py-1.5 text-xs font-semibold text-[#FAF6F0] hover:bg-[#5E3935] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {menambahId === book.id ? 'Menambah...' : '+ Keranjang'}
                        </button>
                      )}
                    </div>

                    {pesanKeranjang[book.id] && (
                      <p role="status" className="mt-2 text-[11px] text-[#3F6B45]">
                        {pesanKeranjang[book.id]}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
