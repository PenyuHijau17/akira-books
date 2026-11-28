"use client"

// src/components/Header.tsx
// Navigasi utama dengan status login nyata (membaca /api/auth).
// MENU ADMIN diringkas jadi 8 item di desktop; pada mobile diganti FAB yang
// membuka panel cepat berisi seluruh menu + enam modul Penjualan.
// Otorisasi tetap di server (GR-02); daftar ini hanya pengelompokan UI.

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { formatBadgeBelumDibaca } from "@/lib/notifikasi"
import {
  MODUL_PENJUALAN,
  bolehBukaTautan,
  daftarMenuAdmin,
  tautanSedangAktif,
} from "@/lib/navigasiAdmin"

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

const kelasTautanAdmin = (aktif: boolean) =>
  aktif
    ? "font-semibold text-[#E8C98A] underline decoration-[#E8C98A]/70 underline-offset-4"
    : "text-[#EFE0CE]/85 transition hover:text-[#E8C98A]"

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [belumDibaca, setBelumDibaca] = useState(0)
  const [memuat, setMemuat] = useState(true)
  const [panelAdminTerbuka, setPanelAdminTerbuka] = useState(false)

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

  // Tutup panel FAB berpindah halaman atau menekan Escape.
  useEffect(() => {
    setPanelAdminTerbuka(false)
  }, [pathname])

  useEffect(() => {
    if (!panelAdminTerbuka) return
    const tutupDenganEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelAdminTerbuka(false)
    }
    window.addEventListener("keydown", tutupDenganEscape)
    return () => window.removeEventListener("keydown", tutupDenganEscape)
  }, [panelAdminTerbuka])

  async function keluar() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
    } finally {
      setUser(null)
      // Langsung ke halaman masuk agar mudah berganti akun setelah keluar.
      window.location.href = "/login"
    }
  }

  const adalahAdmin = user?.role === "ADMIN_UTAMA" || user?.role === "ADMIN_BIASA"
  const badge = formatBadgeBelumDibaca(belumDibaca)
  const menuAdmin = daftarMenuAdmin(user?.role)

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-0 z-50 w-full border-b border-[#8D5B4C]/50 bg-[#3E2723] text-[#FAF6F0] shadow-[0_2px_12px_-8px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Baris utama: identitas toko + navigasi pembeli */}
        <div className="flex flex-nowrap items-center justify-between gap-4 py-3">
          <a href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Akira Books — beranda">
            <span className="grid h-8 w-8 place-items-center rounded-sm border border-[#D9A679]/60 font-serif text-sm text-[#E8C98A] transition group-hover:border-[#E8C98A]">
              A
            </span>
            <span className="font-serif text-lg tracking-wide">
              Akira <span className="text-[#D9A679]">Books</span>
            </span>
          </a>

          <div className="flex min-w-0 flex-nowrap items-center gap-x-4 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-x-5">
            {tautanPublik.map((tautan) => (
              <a
                key={tautan.href}
                href={tautan.href}
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap text-[#FAF6F0]/90 transition hover:text-[#E8C98A]"
              >
                {tautan.label}
              </a>
            ))}

            {/* Wishlist hanya untuk Customer yang sedang masuk (GR-02). */}
            {!memuat && user?.role === 'CUSTOMER' && (
              <a
                href="/ditandai"
                aria-current={pathname === '/ditandai' ? 'page' : undefined}
                className={
                  pathname === '/ditandai'
                    ? "inline-flex h-8 shrink-0 items-center whitespace-nowrap font-semibold text-[#E8C98A] underline decoration-[#E8C98A]/70 underline-offset-4"
                    : "inline-flex h-8 shrink-0 items-center whitespace-nowrap text-[#FAF6F0]/90 transition hover:text-[#E8C98A]"
                }
              >
                Ditandai
              </a>
            )}

            {/* Tombol Keluar wajib tampil untuk semua peran yang sedang masuk,
                ditempatkan tepat di sisi kanan tautan Akun. */}
            {!memuat && user && (
              <button
                type="button"
                onClick={keluar}
                aria-label="Keluar dari akun"
                className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-sm border border-[#D9A679]/70 bg-[#8D5B4C]/25 px-3 text-xs font-semibold text-[#FFF7EA] transition hover:bg-[#8D5B4C] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C98A]"
              >
                Keluar
              </button>
            )}

            {!memuat && user && (
              <a
                href="/notifikasi"
                title="Notifikasi"
                aria-label={`Notifikasi${badge ? `, ${belumDibaca} belum dibaca` : ''}`}
                aria-current={pathname === '/notifikasi' ? 'page' : undefined}
                className="relative inline-grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#D9A679]/60 text-[#FAF6F0]/90 transition hover:border-[#E8C98A] hover:text-[#E8C98A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C98A]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
                  />
                </svg>
                {badge && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full border border-[#E8C98A]/60 bg-[#8D5B4C] px-1 text-center text-[10px] font-semibold leading-5 text-[#FFF7EA]">
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
          </div>
        </div>

        {/* Baris MENU ADMIN desktop: 8 item, satu baris (bisa digeser jika sempit).
            Ini tampilan saja; pembatasan akses tetap di server (GR-02). */}
        {adalahAdmin && (
          <div className="hidden border-t border-white/10 py-2 md:block">
            <div className="flex flex-nowrap items-center gap-x-4 overflow-x-auto whitespace-nowrap text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 font-semibold uppercase tracking-[0.16em] text-[#D9A679]">
                Menu Admin
              </span>
              {menuAdmin.map((tautan) => {
                const aktif = tautanSedangAktif(pathname, tautan.href)
                return (
                  <a
                    key={tautan.href}
                    href={tautan.href}
                    aria-current={aktif ? "page" : undefined}
                    className={kelasTautanAdmin(aktif)}
                  >
                    {tautan.label}
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* FAB + panel cepat khusus mobile */}
      {adalahAdmin && (
        <div className="md:hidden">
          {panelAdminTerbuka && (
            <>
              <button
                type="button"
                aria-label="Tutup panel menu admin"
                onClick={() => setPanelAdminTerbuka(false)}
                className="fixed inset-0 z-30 bg-[#1E1210]/50"
              />
              <div
                id="panel-menu-admin"
                role="dialog"
                aria-modal="true"
                aria-label="Menu Admin"
                className="fixed bottom-20 right-5 z-40 max-h-[70vh] w-[min(18rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-[#D9A679]/60 bg-[#FFFDF9] p-3 text-[#4A2C2A] shadow-2xl"
              >
                <div className="mb-2 flex items-center justify-between border-b border-[#E6DCD0] pb-2">
                  <span className="font-serif text-sm font-bold uppercase tracking-[0.12em] text-[#4A2C2A]">
                    Menu Admin
                  </span>
                  <button
                    type="button"
                    aria-label="Tutup menu admin"
                    onClick={() => setPanelAdminTerbuka(false)}
                    className="grid h-7 w-7 place-items-center rounded-md text-lg leading-none text-[#6B4F43] hover:bg-[#F3ECE1]"
                  >
                    ×
                  </button>
                </div>

                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8D5B4C]">
                  Menu utama
                </p>
                <ul className="space-y-1">
                  {menuAdmin.map((tautan) => {
                    const aktif = tautanSedangAktif(pathname, tautan.href)
                    return (
                      <li key={tautan.href}>
                        <a
                          href={tautan.href}
                          onClick={() => setPanelAdminTerbuka(false)}
                          aria-current={aktif ? "page" : undefined}
                          className={`block rounded-md px-2 py-2 text-sm transition ${
                            aktif
                              ? "bg-[#F3ECE1] font-semibold text-[#4A2C2A]"
                              : "text-[#6B4F43] hover:bg-[#F7EFE2]"
                          }`}
                        >
                          {tautan.label}
                        </a>
                      </li>
                    )
                  })}
                </ul>

                <p className="mt-3 px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8D5B4C]">
                  Penjualan
                </p>
                <ul className="space-y-1">
                  {MODUL_PENJUALAN.map((modul) => {
                    const boleh = bolehBukaTautan(user?.role, modul)
                    const konten = (
                      <>
                        <span>{modul.label}</span>
                        {!boleh && (
                          <span className="ml-2 rounded-full border border-[#D9C4AD] bg-[#F7EFE2] px-1.5 py-0.5 text-[9px] font-semibold text-[#8D5B4C]">
                            Admin Utama
                          </span>
                        )}
                      </>
                    )
                    return (
                      <li key={modul.href}>
                        {boleh ? (
                          <a
                            href={modul.href}
                            onClick={() => setPanelAdminTerbuka(false)}
                            className="block rounded-md px-2 py-2 text-sm text-[#6B4F43] transition hover:bg-[#F7EFE2]"
                          >
                            {konten}
                          </a>
                        ) : (
                          <span
                            aria-disabled="true"
                            className="block cursor-not-allowed rounded-md px-2 py-2 text-sm text-[#9A887A]"
                          >
                            {konten}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setPanelAdminTerbuka((buka) => !buka)}
            aria-expanded={panelAdminTerbuka}
            aria-controls={panelAdminTerbuka ? "panel-menu-admin" : undefined}
            aria-label={panelAdminTerbuka ? "Tutup Menu Admin" : "Buka Menu Admin"}
            className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#4A2C2A] text-[#FAF6F0] shadow-lg transition hover:bg-[#5E3935] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C98A]"
          >
            {panelAdminTerbuka ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      )}
    </nav>
  )
}
