'use client'

// src/app/notifikasi/page.tsx
// Inbox dua tingkat: Admin memilih akun (Level 1), lalu melihat notifikasi
// akun tersebut (Level 2). Customer langsung melihat notifikasinya.
// 100% Bahasa Indonesia; komponen @/components/ui; tema krem/cokelat.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertBanner, Badge, Button, Card, CardContent } from '@/components/ui'
import { AvatarPengguna } from '@/components/AvatarPengguna'
import { formatWaktuWIB } from '@/lib/notifikasi'
import type {
  FilterJenisNotifikasi,
  KartuNotifikasi,
} from '@/lib/notifikasiKartu'

type AkunRingkas = {
  id: string
  nama: string
  avatarUrl: string | null
  peran: string
  cuplikan: string | null
  waktuTerbaru: string | null
  belumDibaca: number
  total: number
  sistem: boolean
}

type SesiRingkas = { id: string; nama: string; role: string }

type HasilInbox = {
  belumDibaca: number
  kartu: KartuNotifikasi[]
}

type FilterStatus = 'semua' | 'belum'

const PILIHAN_JENIS: Array<{ nilai: FilterJenisNotifikasi; label: string }> = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'pemesanan', label: 'Pemesanan' },
  { nilai: 'pembayaran', label: 'Pembayaran' },
  { nilai: 'jadwal', label: 'Jadwal' },
  { nilai: 'pembatalan-refund', label: 'Pembatalan & Refund' },
  { nilai: 'sistem', label: 'Sistem' },
]

const kelasJenis = (aktif: boolean) =>
  aktif
    ? 'whitespace-nowrap rounded-full bg-[#4A2C2A] px-3 py-1.5 text-xs font-semibold text-[#FAF6F0]'
    : 'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-[#6B4F43] transition hover:bg-white'

const kelasStatus = (aktif: boolean) =>
  aktif
    ? 'whitespace-nowrap rounded-full bg-[#FFFDF9] px-2.5 py-1 text-[11px] font-semibold text-[#4A2C2A] shadow-sm'
    : 'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#6B584E]'

function pesanError(error: unknown, pengganti: string): string {
  return error instanceof Error && error.message ? error.message : pengganti
}

function varianBadge(label: string): 'danger' | 'warning' | 'info' | 'neutral' {
  if (label === 'PEMBATALAN') return 'danger'
  if (label === 'REFUND' || label === 'PEMBAYARAN' || label === 'JADWAL') return 'warning'
  if (label === 'PEMESANAN' || label === 'KOREKSI HARGA') return 'info'
  return 'neutral'
}

export default function HalamanNotifikasi() {
  const [saya, setSaya] = useState<SesiRingkas | null>(null)
  const [daftarAkun, setDaftarAkun] = useState<AkunRingkas[]>([])
  const [akunDipilih, setAkunDipilih] = useState<AkunRingkas | null>(null)
  const [data, setData] = useState<HasilInbox | null>(null)
  const [jenis, setJenis] = useState<FilterJenisNotifikasi>('semua')
  const [status, setStatus] = useState<FilterStatus>('semua')
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const admin =
    saya?.role === 'ADMIN_UTAMA' || saya?.role === 'ADMIN_BIASA'

  const muatDaftarAkun = useCallback(async () => {
    try {
      const res = await fetch('/api/notifikasi/akun', { cache: 'no-store' })
      if (!res.ok) {
        setDaftarAkun([])
        return
      }
      const hasil = await res.json()
      setDaftarAkun(Array.isArray(hasil?.akun) ? hasil.akun : [])
    } catch (error) {
      console.error('Gagal memuat daftar akun:', error)
      setDaftarAkun([])
    }
  }, [])

  const muatNotifikasi = useCallback(async (akun: AkunRingkas | null) => {
    setMemuat(true)
    try {
      const parameter = new URLSearchParams({ limit: '200' })
      if (akun) parameter.set('userId', akun.id)
      const res = await fetch(`/api/notifikasi?${parameter.toString()}`, {
        cache: 'no-store',
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal memuat notifikasi')
      setData({
        belumDibaca: Number(hasil?.belumDibaca) || 0,
        kartu: Array.isArray(hasil?.kartu) ? hasil.kartu : [],
      })
      setPesan(null)
    } catch (error) {
      setPesan({
        teks: pesanError(error, 'Gagal memuat notifikasi'),
        sukses: false,
      })
      setData({ belumDibaca: 0, kartu: [] })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    let aktif = true
    async function awal() {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' })
        const hasil = await res.json()
        const user = hasil?.user
        const sesi = user
          ? { id: String(user.id), nama: String(user.name || ''), role: String(user.role || '') }
          : null
        if (!aktif) return
        setSaya(sesi)
        const peranAdmin = sesi?.role === 'ADMIN_UTAMA' || sesi?.role === 'ADMIN_BIASA'
        if (peranAdmin) await muatDaftarAkun()
        await muatNotifikasi(null)
      } catch {
        if (aktif) {
          setPesan({ teks: 'Gagal memuat sesi pengguna.', sukses: false })
          setMemuat(false)
        }
      }
    }
    awal()
    return () => {
      aktif = false
    }
  }, [muatDaftarAkun, muatNotifikasi])

  const bukaAkun = (akun: AkunRingkas) => {
    setAkunDipilih(akun)
    setJenis('semua')
    setStatus('semua')
    muatNotifikasi(akun)
  }

  const kembali = () => {
    setAkunDipilih(null)
    setData(null)
    setJenis('semua')
    setStatus('semua')
    muatDaftarAkun()
  }

  const kartuTampil = useMemo(() => {
    const semua = data?.kartu ?? []
    return semua.filter((kartu) => {
      if (jenis !== 'semua' && kartu.filterJenis !== jenis) return false
      if (status === 'belum' && !kartu.belumDibaca) return false
      return true
    })
  }, [data, jenis, status])

  async function tandai(ids: string[], semua: boolean = false) {
    if (ids.length === 0 && !semua) return
    setMemproses(true)
    try {
      const body: Record<string, unknown> = { action: 'tandai-dibaca', ids, semua }
      if (admin && akunDipilih) body.userId = akunDipilih.id
      const res = await fetch('/api/notifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menandai notifikasi')
      const jumlah = Number(hasil?.belumDibaca)
      if (data) {
        setData({
          ...data,
          belumDibaca: Number.isFinite(jumlah) ? jumlah : data.belumDibaca,
          kartu: data.kartu.map((kartu) =>
            semua || kartu.ids.some((id) => ids.includes(id))
              ? { ...kartu, belumDibaca: false }
              : kartu
          ),
        })
      }
      if (admin) await muatDaftarAkun()
      setPesan({
        teks: `${hasil?.berubah ?? ids.length} notifikasi ditandai sudah dibaca.`,
        sukses: true,
      })
    } catch (error) {
      setPesan({
        teks: pesanError(error, 'Gagal menandai notifikasi'),
        sukses: false,
      })
    } finally {
      setMemproses(false)
    }
  }

  const detailTampil = !admin || Boolean(akunDipilih)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl text-[#4A2C2A]">Notifikasi</h1>
          <p className="mt-1 text-sm text-[#6B584E]">
            {admin
              ? 'Pilih akun untuk melihat notifikasinya, atau buka Sistem Toko.'
              : 'Kabar pesanan, pembayaran, jadwal, dan peringatan toko.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => (admin && akunDipilih ? muatNotifikasi(akunDipilih) : muatNotifikasi(null))}
            disabled={memuat}
            className="px-3 py-1.5 text-xs"
          >
            Muat Ulang
          </Button>
          {detailTampil && data && data.belumDibaca > 0 && (
            <Button
              variant="primary"
              onClick={() => tandai([], true)}
              disabled={memproses}
              className="whitespace-nowrap px-3 py-1.5 text-xs"
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </div>
      </div>

      {pesan && (
        <div className="mt-4">
          <AlertBanner type={pesan.sukses ? 'success' : 'error'} description={pesan.teks} />
        </div>
      )}

      <div className={admin ? 'mt-6 grid items-start gap-4 md:grid-cols-[19rem_1fr]' : 'mt-6'}>
        {admin && (
          <section className={akunDipilih ? 'hidden md:block' : ''} aria-label="Daftar akun">
            <Card className="p-3">
              <h2 className="m-0 px-1 pb-3 font-serif text-base text-[#4A2C2A]">
                Daftar Akun
              </h2>
              {memuat && !akunDipilih && (
                <p className="px-1 text-xs text-[#6B584E]">Sedang memuat akun…</p>
              )}
              {!memuat && daftarAkun.length === 0 && (
                <p className="px-1 text-xs text-[#6B584E]">Belum ada akun dengan notifikasi.</p>
              )}
              <ul className="m-0 grid list-none gap-2 p-0">
                {daftarAkun.map((akun) => (
                  <li key={akun.id}>
                    <button
                      type="button"
                      aria-pressed={akunDipilih?.id === akun.id}
                      onClick={() => bukaAkun(akun)}
                      className="w-full rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] p-3 text-left transition hover:border-[#C8B6A6] hover:bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <AvatarPengguna
                          nama={akun.nama}
                          avatarUrl={akun.avatarUrl}
                          ukuran="kecil"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <p className="m-0 truncate text-sm font-bold text-[#4A2C2A]">
                              {akun.nama}
                            </p>
                            {akun.belumDibaca > 0 && (
                              <Badge variant="warning" className="whitespace-nowrap text-[10px]">
                                {akun.belumDibaca} belum dibaca
                              </Badge>
                            )}
                          </div>
                          <p className="m-0 mt-1 line-clamp-1 text-xs text-[#6B584E]">
                            {akun.cuplikan || 'Belum ada aktivitas.'}
                          </p>
                          <p className="m-0 mt-1 text-[11px] text-[#9A887A]">
                            {akun.waktuTerbaru
                              ? `${formatWaktuWIB(akun.waktuTerbaru)} WIB`
                              : 'Waktu belum tersedia'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {detailTampil && (
          <section aria-label="Daftar notifikasi">
            {admin && (
              <div className="mb-4">
                <Button variant="ghost" onClick={kembali} className="px-2 py-1 text-xs">
                  ← Kembali ke Daftar Akun
                </Button>
                <h2 className="m-0 mt-2 font-serif text-lg text-[#4A2C2A]">
                  Notifikasi {akunDipilih?.nama || ''}
                </h2>
              </div>
            )}

            <div className="grid gap-3">
              <div
                className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Filter jenis notifikasi"
              >
                {PILIHAN_JENIS.map((pilihan) => (
                  <button
                    key={pilihan.nilai}
                    type="button"
                    aria-pressed={jenis === pilihan.nilai}
                    onClick={() => setJenis(pilihan.nilai)}
                    className={kelasJenis(jenis === pilihan.nilai)}
                  >
                    {pilihan.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-[#6B584E]">Status:</span>
                <div
                  className="flex items-center gap-0.5 rounded-full bg-[#F3ECE1] p-0.5"
                  role="group"
                  aria-label="Filter status notifikasi"
                >
                  <button
                    type="button"
                    aria-pressed={status === 'semua'}
                    onClick={() => setStatus('semua')}
                    className={kelasStatus(status === 'semua')}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    aria-pressed={status === 'belum'}
                    onClick={() => setStatus('belum')}
                    className={kelasStatus(status === 'belum')}
                  >
                    Belum Dibaca
                  </button>
                </div>
                {data && (
                  <Badge variant={data.belumDibaca > 0 ? 'warning' : 'neutral'}>
                    {data.belumDibaca} belum dibaca
                  </Badge>
                )}
              </div>
            </div>

            {memuat && <p className="mt-6 text-sm text-[#6B584E]">Sedang memuat notifikasi…</p>}

            {!memuat && kartuTampil.length === 0 && (
              <Card className="mt-6">
                <CardContent>
                  <p className="m-0 text-sm text-[#5D4037]">
                    {status === 'belum'
                      ? 'Tidak ada notifikasi belum dibaca pada filter ini.'
                      : 'Belum ada notifikasi pada filter ini.'}
                  </p>
                </CardContent>
              </Card>
            )}

            {!memuat && kartuTampil.length > 0 && (
              <ul className="m-0 mt-6 grid list-none gap-3 p-0">
                {kartuTampil.map((kartu) => (
                  <li key={kartu.kunci}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={varianBadge(kartu.labelJenis)}
                          className="whitespace-nowrap uppercase tracking-wide"
                          style={{ fontWeight: 700, fontSize: '11px', padding: '4px 10px' }}
                        >
                          {kartu.labelJenis}
                        </Badge>
                        {kartu.belumDibaca && (
                          <Badge variant="warning" className="whitespace-nowrap text-[10px]">
                            Belum dibaca
                          </Badge>
                        )}
                      </div>

                      {(kartu.namaPelanggan || kartu.kode) && (
                        <p className="m-0 mt-3 break-words font-bold text-[#4A2C2A]">
                          {[kartu.namaPelanggan, kartu.kode].filter(Boolean).join(' • ')}
                        </p>
                      )}

                      <p className="m-0 mt-1 line-clamp-2 text-sm leading-relaxed text-[#5D4037]">
                        {kartu.ringkasan}
                      </p>

                      <p className="m-0 mt-2 text-[11px] text-[#9A887A]">
                        {formatWaktuWIB(kartu.waktuTerbaru)} WIB
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EDE4D8] pt-3">
                        {kartu.belumDibaca && (
                          <Button
                            variant="secondary"
                            onClick={() => tandai(kartu.ids)}
                            disabled={memproses}
                            className="px-3 py-1.5 text-xs"
                          >
                            Tandai Dibaca
                          </Button>
                        )}
                        {kartu.tautan && kartu.labelTautan && (
                          <a
                            href={kartu.tautan}
                            className="inline-flex items-center justify-center rounded-lg bg-[#4A2C2A] px-3 py-1.5 text-xs font-semibold text-[#FAF6F0] shadow-sm transition hover:bg-[#5E3935] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8D5B4C]"
                          >
                            {kartu.labelTautan} →
                          </a>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
