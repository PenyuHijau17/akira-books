"use client"

import { useState, useEffect, useRef } from 'react'
import prisma from '@/lib/prisma'

export default function DetailBukuPage({
  params,
}: { params: { slug: string } }) {
  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const coverRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    fetchDetail()
  }, [])

  async function fetchDetail() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/katalog/${params.slug}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Buku tidak ditemukan')
      const data = await res.json()
      // Cari buku yang cocok dengan slug (code)
      const found = data.books.find((b: any) => b.code === params.slug)
      if (!found) throw new Error('Buku tidak ditemukan')
      setBook(found)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

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
        <h3>Error</h3>
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
            <span>No Cover Available</span>
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