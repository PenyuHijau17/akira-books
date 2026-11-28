"use client"

// src/components/TombolTandaiBuku.tsx
// Tombol "Tandai / Ditandai" pada kartu katalog, detail buku, dan halaman ditandai.
// Pengunjung yang belum login diarahkan ke /login oleh context (GR-02).

import { useTandaiBuku } from '@/components/TandaiBukuContext'

type Props = {
  bookId: string
  judul?: string
  ringkas?: boolean
  className?: string
}

export function TombolTandaiBuku({
  bookId,
  judul,
  ringkas = false,
  className = '',
}: Props) {
  const { bookIds, sedangMengubah, toggle } = useTandaiBuku()
  const ditandai = bookIds.has(bookId)
  const sibuk = sedangMengubah === bookId
  const teks = sibuk ? 'Menyimpan...' : ditandai ? 'Ditandai' : 'Tandai'

  return (
    <button
      type="button"
      aria-pressed={ditandai}
      aria-label={`${ditandai ? 'Hapus tandaan' : 'Tandai'} buku ${judul || ''}`.trim()}
      disabled={sibuk || !bookId}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle(bookId, judul)
      }}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C] ${
        ditandai
          ? 'border-[#8D5B4C] bg-[#8D5B4C] text-[#FAF6F0] hover:bg-[#6D463B]'
          : 'border-[#C8B6A6] bg-[#FFFDF9] text-[#4A2C2A] hover:bg-[#F3ECE1]'
      } ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={ditandai ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        />
      </svg>
      {!ringkas && <span>{teks}</span>}
    </button>
  )
}
