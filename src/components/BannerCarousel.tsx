"use client"

// src/components/BannerCarousel.tsx
// Carousel banner promosi untuk halaman publik.
// Aturan (BR/FR-BNR):
// - Hanya menampilkan banner berstatus ACTIVE dari /api/kbanner
// - Autoplay, berhenti saat hover / sentuh
// - Overlay blur di sisi kiri agar teks terbaca
// - Tanpa tombol CTA
// - Jika hanya 1 banner: tampil statis tanpa navigasi
// - Jika 0 banner: tidak merender apa pun

import { useCallback, useEffect, useRef, useState } from "react"

type Banner = {
  id: string
  title?: string | null
  description?: string | null
  imageUrl: string
  url?: string | null
}

const AUTOPLAY_MS = 5000

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const touchStartX = useRef<number | null>(null)

  // Ambil banner aktif dari API publik
  useEffect(() => {
    let aktif = true

    async function muat() {
      try {
        const res = await fetch("/api/kbanner", { cache: "no-store" })
        if (!res.ok) throw new Error("Gagal memuat banner")
        const data = await res.json()
        if (aktif) {
          setBanners(Array.isArray(data?.banners) ? data.banners : [])
        }
      } catch {
        if (aktif) setBanners([])
      } finally {
        if (aktif) setLoaded(true)
      }
    }

    muat()
    return () => {
      aktif = false
    }
  }, [])

  // Autoplay hanya jika lebih dari 1 banner dan tidak sedang dijeda
  useEffect(() => {
    if (banners.length <= 1 || paused) return

    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length)
    }, AUTOPLAY_MS)

    return () => clearInterval(timer)
  }, [banners.length, paused])

  const keIndex = useCallback(
    (i: number) => {
      if (banners.length === 0) return
      setIndex(((i % banners.length) + banners.length) % banners.length)
    },
    [banners.length]
  )

  function onTouchStart(e: React.TouchEvent) {
    setPaused(true)
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current
    const end = e.changedTouches[0]?.clientX ?? null
    touchStartX.current = null

    if (start !== null && end !== null) {
      const delta = end - start
      if (Math.abs(delta) > 40) {
        keIndex(delta < 0 ? index + 1 : index - 1)
      }
    }

    setPaused(false)
  }

  // Tidak merender apa pun jika belum ada banner
  if (!loaded || banners.length === 0) return null

  const banner = banners[index]
  if (!banner) return null

  const banyak = banners.length > 1

  return (
    <section
      className="relative w-full overflow-hidden rounded-lg bg-[#efe6d6]"
      aria-label="Banner promosi"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-56 w-full sm:h-72 md:h-96">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={banner.id}
          src={banner.imageUrl}
          alt={banner.title || "Banner promosi Akira Books"}
          className="h-full w-full object-cover transition-opacity duration-500"
        />

        {/* Overlay blur di sisi kiri agar teks terbaca */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#3b2a20]/70 via-[#3b2a20]/35 to-transparent backdrop-blur-[2px]" />

        {/* Teks banner (tanpa CTA) */}
        {(banner.title || banner.description) && (
          <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center gap-2 p-6 text-[#f7f1e3] sm:p-10">
            {banner.title && (
              <h3 className="text-xl font-bold drop-shadow sm:text-2xl md:text-3xl">
                {banner.title}
              </h3>
            )}
            {banner.description && (
              <p className="text-sm text-[#efe6d6] sm:text-base">
                {banner.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigasi hanya jika lebih dari 1 banner */}
      {banyak && (
        <>
          <button
            type="button"
            onClick={() => keIndex(index - 1)}
            aria-label="Banner sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#3b2a20]/60 p-2 text-[#f7f1e3] transition hover:bg-[#3b2a20]/80"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={() => keIndex(index + 1)}
            aria-label="Banner berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#3b2a20]/60 p-2 text-[#f7f1e3] transition hover:bg-[#3b2a20]/80"
          >
            <span aria-hidden="true">›</span>
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => keIndex(i)}
                aria-label={`Banner ke-${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === index ? "bg-[#f7f1e3]" : "bg-[#f7f1e3]/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
