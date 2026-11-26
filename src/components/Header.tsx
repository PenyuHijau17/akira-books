"use client"

// src/components/Header.tsx
// Navigasi utama dengan status login nyata (membaca /api/auth).
// Tautan admin hanya ditampilkan untuk peran admin; otorisasi tetap di server (GR-02).

import { useEffect, useState } from "react"

type User = {
  id: string
  email: string
  name: string | null
  role: "PENGUNGGUNG" | "CUSTOMER" | "ADMIN_BIASA" | "ADMIN_UTAMA"
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    let aktif = true

    async function muat() {
      try {
        const res = await fetch("/api/auth", { cache: "no-store" })
        const data = await res.json()
        if (aktif) setUser(data?.user ?? null)
      } catch {
        if (aktif) setUser(null)
      } finally {
        if (aktif) setMemuat(false)
      }
    }

    muat()
    return () => {
      aktif = false
    }
  }, [])

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

  return (
    <nav className="navbar">
      <div className="container">
        <a href="/" className="logo">
          Akira Books
        </a>

        <div className="nav-links">
          <a href="/katalog">Katalog</a>
          <a href="/keranjang">Keranjang</a>
          <a href="/pesanan">Pesanan</a>
          <a href="/account">Akun</a>

          {adalahAdmin && <a href="/admin/buku">Kelola Buku</a>}
          {adalahAdmin && <a href="/admin/pembayaran">Verifikasi Bayar</a>}
          {adalahAdmin && <a href="/admin/jadwal">Jadwal Pengambilan</a>}
          {user?.role === "ADMIN_UTAMA" && <a href="/admin/qris">QRIS Toko</a>}
          {adalahAdmin && <a href="/admin/banner">Banner Promo</a>}

          {!memuat && !user && (
            <>
              <a href="/login">Masuk</a>
              <a href="/register">Daftar</a>
            </>
          )}

          {!memuat && user && (
            <button
              type="button"
              onClick={keluar}
              className="nav-link"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Keluar
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
