"use client"

// src/components/TandaiBukuContext.tsx
// Satu sumber state tandaan (wishlist) untuk katalog, detail buku, dan /ditandai.
// Sesi tetap diverifikasi server (GR-02); komponen ini hanya mengelola UI.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

type PenggunaTandai = { id?: string; role?: string } | null

type NilaiTandaiBuku = {
  pengguna: PenggunaTandai
  bookIds: Set<string>
  sedangMuat: boolean
  sedangMengubah: string | null
  pesan: string | null
  toggle: (bookId: string, judul?: string) => Promise<void>
  muatUlang: () => Promise<void>
}

const KonteksTandaiBuku = createContext<NilaiTandaiBuku | null>(null)

export function TandaiBukuProvider({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<PenggunaTandai>(null)
  const [bookIds, setBookIds] = useState<Set<string>>(new Set())
  const [sedangMuat, setSedangMuat] = useState(true)
  const [sedangMengubah, setSedangMengubah] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muatUlang = useCallback(async () => {
    setSedangMuat(true)
    try {
      const [authRes, tandaRes] = await Promise.all([
        fetch('/api/auth', { cache: 'no-store' }),
        fetch('/api/tandai-buku', { cache: 'no-store' }),
      ])
      const authData = await authRes.json().catch(() => ({}))
      const penggunaLogin = authData?.user ?? null
      setPengguna(penggunaLogin)

      if (penggunaLogin?.role === 'CUSTOMER' && tandaRes.ok) {
        const data = await tandaRes.json().catch(() => ({}))
        setBookIds(
          new Set(Array.isArray(data?.bookIds) ? data.bookIds : [])
        )
      } else {
        setBookIds(new Set())
      }
    } catch {
      setPengguna(null)
      setBookIds(new Set())
    } finally {
      setSedangMuat(false)
    }
  }, [])

  useEffect(() => {
    muatUlang()
  }, [muatUlang])

  const toggle = useCallback(
    async (bookId: string, judul?: string) => {
      if (!bookId) return

      // Pengunjung/admin tidak memiliki wishlist: arahkan ke halaman masuk.
      if (pengguna?.role !== 'CUSTOMER') {
        window.location.assign('/login')
        return
      }

      setSedangMengubah(bookId)
      setPesan(null)
      try {
        const res = await fetch('/api/tandai-buku', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan tandaan')

        const ditandai = Boolean(data?.ditandai)
        setBookIds((sebelum) => {
          const berikut = new Set(sebelum)
          if (ditandai) berikut.add(bookId)
          else berikut.delete(bookId)
          return berikut
        })
        setPesan(
          data?.pesan ||
            (ditandai
              ? `Buku "${judul || ''}" berhasil ditandai.`
              : 'Tandaan buku berhasil dihapus.')
        )
      } catch (error: any) {
        setPesan(error?.message || 'Gagal menyimpan tandaan buku.')
      } finally {
        setSedangMengubah(null)
      }
    },
    [pengguna]
  )

  const nilai = useMemo(
    () => ({
      pengguna,
      bookIds,
      sedangMuat,
      sedangMengubah,
      pesan,
      toggle,
      muatUlang,
    }),
    [pengguna, bookIds, sedangMuat, sedangMengubah, pesan, toggle, muatUlang]
  )

  return (
    <KonteksTandaiBuku.Provider value={nilai}>
      {children}
    </KonteksTandaiBuku.Provider>
  )
}

export function useTandaiBuku(): NilaiTandaiBuku {
  const konteks = useContext(KonteksTandaiBuku)
  if (!konteks) {
    throw new Error('useTandaiBuku harus dipakai di dalam TandaiBukuProvider')
  }
  return konteks
}
