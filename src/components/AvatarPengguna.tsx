'use client'

// src/components/AvatarPengguna.tsx
// Avatar lingkaran: foto profil bila ada, jika tidak inisial nama.
// Dipakai halaman Akun dan Kotak Masuk. 100% Bahasa Indonesia.

import { useEffect, useState } from 'react'
import { inisialNama } from '@/lib/avatar'

type Props = {
  nama?: string | null
  avatarUrl?: string | null
  ukuran?: 'kecil' | 'sedang' | 'besar'
  className?: string
}

const UKURAN: Record<NonNullable<Props['ukuran']>, string> = {
  kecil: 'h-9 w-9 text-[11px]',
  sedang: 'h-11 w-11 text-xs',
  besar: 'h-16 w-16 text-lg',
}

export function AvatarPengguna({
  nama,
  avatarUrl,
  ukuran = 'sedang',
  className = '',
}: Props) {
  const [gagal, setGagal] = useState(false)

  useEffect(() => setGagal(false), [avatarUrl])

  const dasar = `shrink-0 overflow-hidden rounded-full border border-[#D9C9BA] ${UKURAN[ukuran]} ${className}`
  const namaAman = String(nama || '').trim() || 'pengguna'

  if (avatarUrl && !gagal) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`Foto profil ${namaAman}`}
        className={`${dasar} object-cover`}
        onError={() => setGagal(true)}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${dasar} flex items-center justify-center bg-[#4A2C2A] font-semibold text-[#FAF6F0]`}
    >
      {inisialNama(namaAman)}
    </div>
  )
}

export default AvatarPengguna
