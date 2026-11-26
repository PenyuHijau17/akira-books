"use client"

// src/components/Header.tsx
// Navigasi utama dengan status login nyata (membaca /api/auth).
// Tautan admin dikelompokkan pada baris tersendiri; otorisasi tetap di server (GR-02).

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { formatBadgeBelumDibaca } from "@/lib/notifikasi"

type User = {
  id: string
  email: string
  name: string | null
  role: "PENGUNGGUNG" | "CUSTOMER" | "ADMIN_BIASA" | "ADMIN_UTAMA"
}

const tautanPublik = [
  { href: "/katalog", label: "Katalog" },
  { href: "/keranjang", label: "Keranjang" },
  { href: "/pesanan", label: "Pesanan" },
  { href: "/account", label: "Akun" },
]

const tautanAdminBiasa = [
  { href: "/admin/buku", label: "Kelola Buku" },
  { href: "/admin/pembayaran", label: "Verifikasi Bayar" },
  { href: "/admin/jadwal", label: "Jadwal Pengambilan" },
  { href: "/admin/pembatalan", label: "Pembatalan" },
  { href: "/admin/refund", label: "Refund" },
  { href: "/admin/penjualan-offline", label: "Penjualan Offline" },
  { href: "/admin/banner", label: "Banner Promo" },
]

const tautanAdminUtama = [
  { href: "/admin/laporan", label: "Laporan Keuangan" },
  { href: "/admin/qris", label: "QRIS Toko" },
  { href: "/admin/notifikasi", label: "Peringatan Notifikasi" },
  { href: "/admin/backup", label: "Backup & Pemulihan" },
]

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [belumDibaca, setBelumDibaca] = useState(0)
  const [memuat, setMemuat] = useState(true)

  // Cek ulang sesi setiap pathname berubah. Menjaga navbar tetap sinkron
  // setelah login/logout dengan navigasi klien (tanpa refresh manual).
  useEffect(() => {
    let aktif = true

    async function muat() {
      try {
        const res = await fetch("/api/auth", { cache: "no-store" })
        const data = await res.json()
        const pengguna = data?.user ?? null
        if (aktif) setUser(pengguna)

        if (pengguna && ["CUSTOMER", "ADMIN_BIASA", "ADMIN_UTAMA"].includes(pengguna.role)) {
          try {
            const notifRes = await fetch("/api/notifikasi?ringkas=1", { cache: "no-store" })
            const notifData = await notifRes.json()
            if (aktif) setBelumDibaca(Number(notifData?.belumDibaca) || 0)
          } catch {
            if (aktif) setBelumDibaca(0)
          }
        } else if (aktif) {
          setBelumDibaca(0)
        }
      } catch {
        if (aktif) {
          setUser(null)
          setBelumDibaca(0)
        }
      } finally {
        if (aktif) setMemuat(false)
      }
    }

    muat()
    return () => {
      aktif = false
    }
  }, [pathname])

  async function keluar() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
    } finally {
      setUser(null)
      window.location.href = "/"
    }
  }

  const adalahAdmin = user?.role === "ADMIN_UTAMA" || user?.role === "ADMIN_BIASA"
  const badge = formatBadgeBelumDibaca(belumDibaca)

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-0 z-50 w-full border-b border-[#8D5B4C]/50 bg-[#3E2723] text-[#FAF6F0] shadow-[0_2px_12px_-8px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Baris utama: identitas toko + navigasi pembeli */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <a href="/" className="group flex items-center gap-2.5" aria-label="Akira Books — beranda">
            <span className="grid h-8 w-8 place-items-center rounded-sm border border-[#D9A679]/60 font-serif text-sm text-[#E8C98A] transition group-hover:border-[#E8C98A]">
              A
            </span>
            <span className="font-serif text-lg tracking-wide">
              Akira <span className="text-[#D9A679]">Books</span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {tautanPublik.map((tautan) => (
              <a
                key={tautan.href}
                href={tautan.href}
                className="text-[#FAF6F0]/90 transition hover:text-[#E8C98A]"
              >
                {tautan.label}
              </a>
            ))}

            {!memuat && user && (
              <a
                href="/notifikasi"
                className="inline-flex items-center gap-1.5 text-[#FAF6F0]/90 transition hover:text-[#E8C98A]"
              >
                Notifikasi
                {badge && (
                  <span className="rounded-full border border-[#E8C98A]/50 bg-[#8D5B4C] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#FFF7EA]">
                    {badge}
                  </span>
                )}
              </a>
            )}

            {!memuat && !user && (
              <>
                <a
                  href="/login"
                  className="rounded-sm border border-[#D9A679]/60 px-3.5 py-1.5 text-xs font-semibold text-[#E8C98A] transition hover:bg-[#D9A679]/15"
                >
                  Masuk
                </a>
                <a
                  href="/register"
                  className="rounded-sm bg-[#8D5B4C] px-3.5 py-1.5 text-xs font-semibold text-[#FFF7EA] transition hover:bg-[#A06A59]"
                >
                  Daftar
                </a>
              </>
            )}

            {!memuat && user && (
              <button
                type="button"
                onClick={keluar}
                className="rounded-sm border border-[#FAF6F0]/30 px-3 py-1.5 text-xs font-medium text-[#FAF6F0]/90 transition hover:border-[#E8C98A]/70 hover:text-[#E8C98A]"
              >
                Keluar
              </button>
            )}
          </div>
        </div>

        {/* Baris admin: hanya untuk peran admin, tampilan bukan pembatas akses */}
        {adalahAdmin && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 py-2 text-xs">
            <span className="font-semibold uppercase tracking-[0.16em] text-[#D9A679]">
              Menu Admin
            </span>
            {tautanAdminBiasa.map((tautan) => (
              <a
                key={tautan.href}
                href={tautan.href}
                className="text-[#EFE0CE]/85 transition hover:text-[#E8C98A]"
              >
                {tautan.label}
              </a>
            ))}
            {user?.role === "ADMIN_UTAMA" &&
              tautanAdminUtama.map((tautan) => (
                <a
                  key={tautan.href}
                  href={tautan.href}
                  className="text-[#EFE0CE]/85 transition hover:text-[#E8C98A]"
                >
                  {tautan.label}
                </a>
              ))}
          </div>
        )}
      </div>
    </nav>
  )
}
