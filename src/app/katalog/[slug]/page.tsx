"use client"

// src/app/katalog/[slug]/page.tsx
// Next.js 16 + Cache Components: params dinamis berupa Promise. Nilainya
// di-resolve di dalam effect (bukan dibaca sinkron saat render), sehingga
// prerender tidak terhalang dan tidak muncul Issue "useParams outside Suspense".
// Pola ini sama dengan halaman /pesanan/[id].

import { useEffect, useState } from 'react'
import { AlertBanner, Button } from '@/components/ui'
import { TandaiBukuProvider, useTandaiBuku } from '@/components/TandaiBukuContext'
import { TombolTandaiBuku } from '@/components/TombolTandaiBuku'

export default function DetailBukuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return (
    <TandaiBukuProvider>
      <DetailBukuKonten params={params} />
    </TandaiBukuProvider>
  )
}

function DetailBukuKonten({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // null = params belum selesai dibaca; '' = slug tidak ada.
  const [slug, setSlug] = useState<string | null>(null)
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pesanKeranjang, setPesanKeranjang] = useState<{ jenis: 'success' | 'error'; teks: string } | null>(null)
  const [sedangMenambah, setSedangMenambah] = useState(false)
  const { pesan: pesanTandai } = useTandaiBuku()

  useEffect(() => {
    let aktif = true
    params
      .then((p) => {
        if (aktif) setSlug(String(p?.slug || ''))
      })
      .catch(() => {
        if (aktif) setSlug('')
      })
    return () => {
      aktif = false
    }
  }, [params])

  async function tambahKeKeranjang() {
    if (!book?.id) return
    setSedangMenambah(true)
    setPesanKeranjang(null)
    try {
      const res = await fetch('/api/keranjang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal menambah ke keranjang')
      setPesanKeranjang({ jenis: 'success', teks: 'Buku berhasil ditambahkan ke keranjang.' })
    } catch (e: any) {
      setPesanKeranjang({
        jenis: 'error',
        teks: e?.message === 'Tidak diizinkan'
          ? 'Silakan masuk sebagai pelanggan untuk menambah buku ke keranjang.'
          : e?.message || 'Terjadi kesalahan saat menambah ke keranjang',
      })
    } finally {
      setSedangMenambah(false)
    }
  }

  useEffect(() => {
    // Masih menunggu params dari Next.js; jangan mengubah status loading.
    if (slug === null) return

    if (!slug) {
      setError('Buku tidak ditemukan')
      setLoading(false)
      return
    }

    let aktif = true
    setLoading(true)
    setError(null)

    async function muatDetail() {
      try {
        const res = await fetch(`/api/katalog/${encodeURIComponent(slug as string)}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Buku tidak ditemukan')
        const data = await res.json()
        const ditemukan = Array.isArray(data?.books)
          ? data.books[0]
          : data?.book ?? null
        if (!ditemukan) throw new Error('Buku tidak ditemukan')
        if (aktif) setBook(ditemukan)
      } catch (e: any) {
        if (aktif) setError(e?.message || 'Terjadi kesalahan')
      } finally {
        if (aktif) setLoading(false)
      }
    }

    muatDetail()
    return () => {
      aktif = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <span className="animate-spin inline-block mr-2"></span>
        <span>Memuat detail buku...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <h3>Terjadi Kesalahan</h3>
        <p>{error}</p>
        <a
          href="/katalog"
          className="mt-2 text-amber-600 hover:text-amber-800"
        >
          Kembali ke Katalog
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <a
          href="/katalog"
          className="underline hover:text-amber-700"
        >
          Kembali ke Katalog
        </a>
        <span> › </span>
        <span>{book?.title || 'Detail Buku'}</span>
      </nav>

      {/* Detail Buku Card */}
      <div>
        {/* Cover Image */}
        {book?.imageUrl ? (
          <img
            src={book.imageUrl}
            alt={book.title}
            className="w-full h-64 object-cover rounded-md mb-4"
          />
        ) : (
          <div
            className="w-full h-64 bg-amber-200 flex items-center justify-center rounded-md mb-4 text-gray-400"
          >
            <span>Sampul belum tersedia</span>
          </div>
        )}

        {/* Book Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{book?.title}</h2>
            <p className="text-amber-600 font-medium">{book?.author}</p>
            <p className="text-gray-500 text-sm mb-4">
              {book?.publisher} · {book?.publishYear}
            </p>

            {/* Kategori */}
            {book?.kategori && (
              <div className="mb-3 px-3 py-1 bg-amber-50 rounded text-amber-700 text-xs">
                {book.kategori}
              </div>
            )}

            {/* Deskripsi */}
            {book?.description && (
              <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                {book.description}
              </p>
            )}
          </div>

          {/* Detail Harga & Stok */}
          <div>
            <p className="text-gray-500 text-sm mb-2">Harga Jual</p>
            <p className="text-3xl font-bold text-amber-600">
              Rp {book?.sellingPrice?.toLocaleString('id-ID')}
            </p>

            <div style={{ marginTop: '1rem' }}>
              {pesanKeranjang && (
                <AlertBanner
                  type={pesanKeranjang.jenis}
                  title={pesanKeranjang.jenis === 'success' ? 'Berhasil' : 'Perhatian'}
                  description={pesanKeranjang.teks}
                />
              )}
              <Button
                onClick={tambahKeKeranjang}
                isLoading={sedangMenambah}
                disabled={!book || book.stockTotal <= 0}
              >
                Tambah ke Keranjang
              </Button>{' '}
              <TombolTandaiBuku bookId={book?.id || ''} judul={book?.title || ''} />{' '}
              <a href="/keranjang" style={{ marginLeft: '0.5rem' }}>
                Lihat Keranjang
              </a>
              {pesanTandai && (
                <p role="status" className="mt-2 text-sm text-[#3F6B45]">
                  {pesanTandai}
                </p>
              )}
            </div>

            <p className="text-gray-500 text-sm mt-2">Stok Tersedia</p>
            <p className="text-2xl font-semibold">
              {book?.stockTotal} eksemplar
            </p>

            {/* Status Buku */}
            <p className="mt-3 text-sm">
              <span
                className={`inline-block px-2 py-1 rounded text-xs capitalize ${
                  book?.status === 'TERSEDIA' ? 'bg-amber-100 text-amber-800' :
                  book?.status === 'SEDANG_DIPESAN' ? 'bg-amber-200 text-amber-700' :
                  book?.status === 'TERJUAL' ? 'bg-gray-200 text-gray-600' :
                  'bg-gray-100 text-gray-500'
                }`}
              >
                {book?.status}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
