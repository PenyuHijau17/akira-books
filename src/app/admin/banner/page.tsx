"use client"

// src/app/admin/banner/page.tsx
// Halaman pengelolaan Banner Promosi (FR-BNR).
// - Admin Biasa: ajukan banner (maks 3 PENDING), batalkan PENDING miliknya.
// - Admin Utama: setujui, tolak, aktifkan/nonaktifkan, hapus, lihat alasan penolakan.
// 100% Bahasa Indonesia, tema kertas klasik.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Input, Card, CardContent, Badge, AlertBanner } from "@/components/ui"

type Role = "PENGUNGGUNG" | "CUSTOMER" | "ADMIN_BIASA" | "ADMIN_UTAMA"

type Banner = {
  id: string
  title?: string | null
  description?: string | null
  imageUrl: string
  url?: string | null
  sortOrder: number
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | "CANCELLED" | string
  submittedById?: string | null
  rejectReason?: string | null
  createdAt?: string
}

type TabKey = "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED"

const tabsAdminBiasa: Array<{ key: TabKey; label: string }> = [
  { key: "PENDING", label: "Menunggu" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "INACTIVE", label: "Nonaktif" },
]

const tabsAdminUtama: Array<{ key: TabKey; label: string }> = [
  ...tabsAdminBiasa,
  { key: "REJECTED", label: "Ditolak" },
]

const labelStatus: Record<string, string> = {
  PENDING: "Menunggu",
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
}

const varianStatus: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  PENDING: "warning",
  ACTIVE: "success",
  INACTIVE: "neutral",
  REJECTED: "danger",
  CANCELLED: "neutral",
}

export default function AdminBannerPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [cekSesi, setCekSesi] = useState(true)

  const [tab, setTab] = useState<TabKey>("PENDING")
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  // Form pengajuan
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [url, setUrl] = useState("")
  const [mengirim, setMengirim] = useState(false)

  const adalahAdminUtama = role === "ADMIN_UTAMA"
  const adalahAdmin = role === "ADMIN_BIASA" || role === "ADMIN_UTAMA"

  const daftarTab = useMemo(
    () => (adalahAdminUtama ? tabsAdminUtama : tabsAdminBiasa),
    [adalahAdminUtama]
  )

  // Cek sesi pengguna
  useEffect(() => {
    let aktif = true
    async function cek() {
      try {
        const res = await fetch("/api/auth", { cache: "no-store" })
        const data = await res.json()
        if (aktif) setRole((data?.user?.role as Role) ?? null)
      } catch {
        if (aktif) setRole(null)
      } finally {
        if (aktif) setCekSesi(false)
      }
    }
    cek()
    return () => {
      aktif = false
    }
  }, [])

  const muatBanner = useCallback(async (status: TabKey) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/banner?status=${status}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal memuat banner")
      setBanners(Array.isArray(data?.banners) ? data.banners : [])
    } catch (e) {
      setBanners([])
      setError(e instanceof Error ? e.message : "Gagal memuat banner")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!adalahAdmin) return
    muatBanner(tab)
  }, [adalahAdmin, tab, muatBanner])

  async function ajukanBanner(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPesan(null)

    if (!imageUrl.trim()) {
      setError("URL gambar banner wajib diisi")
      return
    }

    setMengirim(true)
    try {
      const res = await fetch("/api/admin/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: judul.trim() || null,
          description: deskripsi.trim() || null,
          imageUrl: imageUrl.trim(),
          url: url.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal mengajukan banner")

      setPesan("Banner berhasil diajukan dan menunggu persetujuan Admin Utama.")
      setJudul("")
      setDeskripsi("")
      setImageUrl("")
      setUrl("")
      setTab("PENDING")
      muatBanner("PENDING")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengajukan banner")
    } finally {
      setMengirim(false)
    }
  }

  async function aksi(id: string, action: string, extra?: Record<string, unknown>) {
    setError(null)
    setPesan(null)

    let rejectReason: string | undefined
    if (action === "reject") {
      const alasan = window.prompt("Alasan penolakan banner (wajib diisi):") || ""
      if (!alasan.trim()) {
        setError("Alasan penolakan wajib diisi")
        return
      }
      rejectReason = alasan.trim()
    }

    try {
      const res = await fetch(`/api/admin/banner/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectReason, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Aksi gagal")

      setPesan("Aksi berhasil dilakukan.")
      muatBanner(tab)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aksi gagal")
    }
  }

  async function hapus(id: string) {
    if (!window.confirm("Hapus banner ini secara permanen?")) return
    setError(null)
    setPesan(null)
    try {
      const res = await fetch(`/api/admin/banner/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus banner")
      setPesan("Banner berhasil dihapus permanen.")
      muatBanner(tab)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus banner")
    }
  }

  if (cekSesi) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-center text-sm text-brown-500">Memuat sesi...</p>
      </div>
    )
  }

  if (!adalahAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <AlertBanner
          type="warning"
          title="Akses ditolak"
          description="Halaman ini hanya dapat diakses oleh Admin Biasa atau Admin Utama."
        />
        <p className="mt-4 text-center text-sm">
          Silakan <a href="/login" className="text-brown-600 underline">masuk</a> dengan akun admin.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-center text-3xl font-bold text-brown-700">
        Banner Promosi
      </h1>
      <p className="mb-8 text-center text-sm text-brown-500">
        Kelola banner promosi yang tampil di halaman beranda dan katalog.
      </p>

      {error && <AlertBanner type="error" title="Terjadi kesalahan" description={error} />}
      {pesan && <AlertBanner type="success" title="Berhasil" description={pesan} />}

      {/* Form pengajuan banner */}
      <Card className="mb-8">
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold text-brown-700">
            Ajukan Banner Baru
          </h2>
          <p className="mb-4 text-xs text-brown-500">
            Admin Biasa maksimal memiliki 3 banner berstatus Menunggu. Banner yang
            disetujui Admin Utama akan tampil otomatis di halaman publik.
          </p>

          <form onSubmit={ajukanBanner} className="space-y-4">
            <Input
              label="Judul (opsional)"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Promo Akhir Tahun"
            />
            <Input
              as="textarea"
              label="Deskripsi (opsional)"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Keterangan singkat banner"
            />
            <Input
              label="URL Gambar"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://.../banner.jpg"
              helperText="Wajib. Format JPG/PNG/WebP, maksimal 5 MB."
            />
            <Input
              label="URL Tujuan (opsional)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={mengirim} className="px-6 py-2">
                Ajukan Banner
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tab status */}
      <div className="mb-4 flex flex-wrap gap-2">
        {daftarTab.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "primary" : "secondary"}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 text-sm"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading && (
        <p className="py-8 text-center text-sm text-brown-500">Memuat banner...</p>
      )}

      {!loading && banners.length === 0 && (
        <Card>
          <CardContent>
            <p className="py-6 text-center text-sm text-brown-500">
              Belum ada banner pada kategori ini.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {banners.map((b) => {
          const milikSendiri =
            role === "ADMIN_BIASA" && b.submittedById !== undefined

          return (
            <Card key={b.id}>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.imageUrl}
                    alt={b.title || "Banner"}
                    className="h-32 w-full rounded-md object-cover sm:w-56"
                  />

                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant={varianStatus[b.status] || "neutral"}>
                        {labelStatus[b.status] || b.status}
                      </Badge>
                      <span className="text-xs text-brown-400">
                        Urutan: {b.sortOrder}
                      </span>
                    </div>

                    <h3 className="font-semibold text-brown-700">
                      {b.title || "(Tanpa judul)"}
                    </h3>
                    {b.description && (
                      <p className="text-sm text-brown-500">{b.description}</p>
                    )}
                    {b.url && (
                      <p className="mt-1 break-all text-xs text-brown-400">
                        {b.url}
                      </p>
                    )}

                    {/* Alasan penolakan HANYA untuk Admin Utama (GR-03) */}
                    {adalahAdminUtama && b.rejectReason && (
                      <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                        Alasan penolakan: {b.rejectReason}
                      </p>
                    )}

                    {/* Aksi */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {adalahAdminUtama && b.status === "PENDING" && (
                        <>
                          <Button
                            onClick={() => aksi(b.id, "approve")}
                            className="px-3 py-1.5 text-sm"
                          >
                            Setujui
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => aksi(b.id, "reject")}
                            className="px-3 py-1.5 text-sm"
                          >
                            Tolak
                          </Button>
                        </>
                      )}

                      {adalahAdminUtama && b.status === "INACTIVE" && (
                        <Button
                          onClick={() => aksi(b.id, "activate")}
                          className="px-3 py-1.5 text-sm"
                        >
                          Aktifkan
                        </Button>
                      )}

                      {adalahAdminUtama && b.status === "ACTIVE" && (
                        <Button
                          variant="secondary"
                          onClick={() => aksi(b.id, "deactivate")}
                          className="px-3 py-1.5 text-sm"
                        >
                          Nonaktifkan
                        </Button>
                      )}

                      {adalahAdminUtama && (
                        <Button
                          variant="danger"
                          onClick={() => hapus(b.id)}
                          className="px-3 py-1.5 text-sm"
                        >
                          Hapus
                        </Button>
                      )}

                      {!adalahAdminUtama && b.status === "PENDING" && (
                        <Button
                          variant="secondary"
                          onClick={() => aksi(b.id, "cancel")}
                          className="px-3 py-1.5 text-sm"
                        >
                          Batalkan
                        </Button>
                      )}

                      {milikSendiri && (
                        <span className="self-center text-xs text-brown-400">
                          Diajukan oleh Anda
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
