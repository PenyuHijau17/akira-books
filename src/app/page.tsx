'use client'

// src/app/page.tsx
// Beranda Akira Books — etalase toko buku independen bernuansa kertas klasik.
// 100% Bahasa Indonesia. Tidak memuat field modal/keuntungan (GR-03).

import { useEffect, useState } from 'react'
import { AlertBanner, Badge } from '@/components/ui'
import BannerCarousel from '@/components/BannerCarousel'
import { formatRupiah, toWIBString } from '@/lib/timezone'

type BukuEtalase = {
  id: string
  code: string
  title: string
  author: string
  imageUrl?: string | null
  description?: string | null
  sellingPrice: number
  stockTotal: number
  status: string
}

type StatusToko = {
  isOpen: boolean
  activeClosureReason?: string | null
  lastUpdated?: string | null
}

const langkahBelanja = [
  {
    nomor: '01',
    judul: 'Pilih Buku di Katalog',
    deskripsi:
      'Telusuri judul original dan bekas terkurasi. Periksa detail buku, lalu tambahkan ke keranjang.',
  },
  {
    nomor: '02',
    judul: 'Bayar via QRIS & Unggah Bukti',
    deskripsi:
      'Transfer ke QRIS toko, lalu unggah bukti pembayaran sebelum tenggat 24 jam. Admin memeriksa dalam dua tahap.',
  },
  {
    nomor: '03',
    judul: 'Ambil Minggu Pagi di Booth CFD',
    deskripsi:
      'Pilih jadwal Minggu, lalu ambil buku di booth CFD paling lambat pukul 09.00 WIB.',
  },
]

/**
 * BR-026: sistem tidak menyimpan kondisi fisik per eksemplar.
 * Label ini hanya petunjuk tingkat katalog yang diambil dari keterangan buku,
 * bukan klaim kondisi tiap eksemplar.
 */
function labelKondisi(buku: BukuEtalase): 'Original' | 'Bekas' {
  const teks = `${buku.title} ${buku.description ?? ''}`.toLowerCase()
  return /(^|\s)bekas(\s|$)|preloved|second/.test(teks) ? 'Bekas' : 'Original'
}

function SampulPlaceholder({ judul }: { judul: string }) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#EFE4D2]"
      role="img"
      aria-label={`Sampul buku ${judul} belum tersedia`}
    >
      <div className="absolute inset-y-0 left-0 w-2 bg-[#8D5B4C]/80" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 11px, rgba(62,39,35,0.12) 12px)',
        }}
      />
      <div className="relative px-5 text-center">
        <span className="block font-serif text-4xl leading-none text-[#8D5B4C]/55">A</span>
        <span className="mt-3 block text-[9px] font-semibold uppercase tracking-[0.32em] text-[#6B4F43]">
          Akira Books
        </span>
        <span className="mx-auto mt-3 block h-px w-10 bg-[#8D5B4C]/40" />
      </div>
    </div>
  )
}

export default function Page() {
  const [statusToko, setStatusToko] = useState<StatusToko | null>(null)
  const [semuaBuku, setSemuaBuku] = useState<BukuEtalase[]>([])
  const [memuat, setMemuat] = useState(true)
  const [gagal, setGagal] = useState(false)

  useEffect(() => {
    let aktif = true

    async function muatBeranda() {
      setMemuat(true)
      setGagal(false)
      try {
        const [responsToko, responsKatalog] = await Promise.all([
          fetch('/api/store-status', { cache: 'no-store' }),
          fetch('/api/katalog?status=TERSEDIA&sort=terbaru', { cache: 'no-store' }),
        ])
        if (!responsToko.ok || !responsKatalog.ok) {
          throw new Error('Gagal memuat data beranda')
        }

        const dataToko = await responsToko.json()
        const dataKatalog = await responsKatalog.json()
        if (!aktif) return

        setStatusToko({
          isOpen: Boolean(dataToko?.isOpen),
          activeClosureReason: dataToko?.activeClosureReason ?? null,
          lastUpdated: dataToko?.lastUpdated ?? null,
        })

        const daftar: BukuEtalase[] = Array.isArray(dataKatalog?.books)
          ? dataKatalog.books
          : []
        setSemuaBuku(
          daftar.filter(
            (buku) =>
              buku.status === 'TERSEDIA' && Number(buku.stockTotal) > 0
          )
        )
      } catch {
        if (aktif) {
          setGagal(true)
          setStatusToko(null)
          setSemuaBuku([])
        }
      } finally {
        if (aktif) setMemuat(false)
      }
    }

    muatBeranda()
    return () => {
      aktif = false
    }
  }, [])

  const etalase = semuaBuku.slice(0, 6)
  const judulTersedia = semuaBuku.length
  const tokoBuka = statusToko?.isOpen === true

  return (
    // Layout root sudah membungkus children dengan <main>; memakai <div>
    // di sini mencegah peringatan DOM nesting / hydration di dev overlay.
    <div className="min-h-screen bg-[#FAF6F0] text-[#3E2723]">
      {/* ===================== HERO EDITORIAL ===================== */}
      <section className="border-b border-[#E6DCD0]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Sisi kiri: narasi editorial (7 kolom) */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-[#E6DCD0] bg-white/80 p-7 shadow-sm sm:p-10">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8D5B4C] via-[#C8A46A] to-transparent" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8D5B4C]">
                  Toko Buku Independen · Koleksi Terkurasi
                </p>

                <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.15] tracking-tight text-[#3E2723] sm:text-5xl lg:text-[3.25rem]">
                  Buku pilihan untuk dibawa pulang,{' '}
                  <span className="text-[#8D5B4C]">Minggu pagi.</span>
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-[#6B4F43] sm:text-[15px]">
                  Kami merawat koleksi buku{' '}
                  <strong className="font-semibold text-[#4A2C2A]">original</strong> dan{' '}
                  <strong className="font-semibold text-[#4A2C2A]">bekas</strong> yang
                  terkurasi satu per satu. Pesan dari mana saja, bayar dengan QRIS
                  toko, lalu ambil di booth CFD pada hari Minggu pagi.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6B4F43]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8D5B4C]" />
                    Booth CFD
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8D5B4C]" />
                    Minggu pagi
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8D5B4C]" />
                    Tutup pukul 09.00 WIB
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="/katalog"
                    className="inline-flex items-center justify-center rounded-lg bg-[#4A2C2A] px-6 py-3 text-sm font-semibold text-[#FAF6F0] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#5E3935] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C]"
                  >
                    Jelajahi Katalog Buku
                  </a>
                  <a
                    href="#cara-pemesanan"
                    className="inline-flex items-center justify-center rounded-lg border border-[#C8B6A6] bg-white/60 px-6 py-3 text-sm font-semibold text-[#4A2C2A] transition duration-200 hover:bg-[#F3ECE1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C]"
                  >
                    Cara Pemesanan
                  </a>
                </div>

                <div className="mt-8 border-t border-[#E6DCD0] pt-4 text-[11px] leading-5 text-[#6B4F43]">
                  Pembayaran QRIS toko · bukti diverifikasi dua tahap · stok
                  disesuaikan otomatis
                </div>
              </div>
            </div>

            {/* Sisi kanan: kartu sorotan toko (5 kolom) */}
            <aside className="lg:col-span-5">
              <div className="rounded-2xl border border-[#DFD3C3] bg-[#F3ECE1] p-7 shadow-sm sm:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8D5B4C]">
                      Sorotan Toko
                    </p>
                    <h2 className="mt-2 font-serif text-xl text-[#3E2723]">
                      Kondisi hari ini
                    </h2>
                  </div>
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        statusToko === null ? '#B08D57' : tokoBuka ? '#5C9A63' : '#C97B60',
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-6">
                  {statusToko === null ? (
                    <Badge className="inline-flex items-center rounded-full border border-[#DFD3C3] bg-white/70 px-3 py-1 text-xs font-semibold text-[#6B4F43]">
                      Memeriksa status…
                    </Badge>
                  ) : tokoBuka ? (
                    <Badge className="inline-flex items-center gap-2 rounded-full border border-[#BFD9BB] bg-[#E4F0E2] px-3 py-1 text-xs font-semibold text-[#3F6B45]">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#5C9A63]"
                        aria-hidden="true"
                      />
                      Toko Buka
                    </Badge>
                  ) : (
                    <Badge className="inline-flex items-center gap-2 rounded-full border border-[#EAC3B4] bg-[#F9E3DB] px-3 py-1 text-xs font-semibold text-[#9A4A34]">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#C97B60]"
                        aria-hidden="true"
                      />
                      Toko Libur
                    </Badge>
                  )}
                  {statusToko && !tokoBuka && statusToko.activeClosureReason && (
                    <p className="mt-3 text-xs leading-5 text-[#6B4F43]">
                      {statusToko.activeClosureReason}
                    </p>
                  )}
                </div>

                <div className="mt-7 space-y-5 border-t border-[#DFD3C3] pt-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8D5B4C]">
                      Jadwal Pengambilan
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#3E2723]">
                      Setiap Minggu pagi
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B4F43]">
                      Booth CFD · tutup 09.00 WIB
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#8D5B4C]">
                      Judul Tersedia
                    </p>
                    <p className="mt-1 font-serif text-3xl text-[#3E2723]">
                      {memuat ? '—' : judulTersedia}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B4F43]">
                      judul siap dipesan hari ini
                    </p>
                  </div>
                </div>

                <div className="mt-7 border-t border-[#DFD3C3] pt-5 text-[11px] leading-5 text-[#6B4F43]">
                  {statusToko?.lastUpdated
                    ? `Status diperbarui ${toWIBString(statusToko.lastUpdated)} WIB`
                    : 'Status toko diperbarui berkala.'}
                </div>
              </div>
            </aside>
          </div>

          {gagal && (
            <div className="mt-6 max-w-2xl">
              <AlertBanner
                type="warning"
                title="Informasi toko belum dapat dimuat"
                description="Katalog dan status toko sedang tidak tersedia. Silakan muat ulang halaman beberapa saat lagi."
              />
            </div>
          )}
        </div>
      </section>

      {/* ===================== BANNER PROMOSI ===================== */}
      {/* BannerCarousel tidak merender apa pun saat 0 banner aktif; empty:hidden
          memastikan kotak ini tidak menyisakan ruang kosong. */}
      <div className="mx-auto max-w-7xl px-4 pb-2 pt-8 empty:hidden sm:pt-10">
        <BannerCarousel />
      </div>

      {/* ===================== ETALASE BUKU ===================== */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6DCD0] pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8D5B4C]">
              Dari Rak Kami
            </p>
            <h2 className="mt-3 font-serif text-2xl text-[#3E2723] sm:text-3xl">
              Koleksi Buku Pilihan
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6B4F43]">
              Judul yang baru tersedia dan masih bisa dipesan hari ini.
            </p>
          </div>
          <a
            href="/katalog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8D5B4C] underline decoration-[#8D5B4C]/40 underline-offset-4 transition hover:text-[#3E2723]"
          >
            Lihat semua buku <span aria-hidden="true">→</span>
          </a>
        </div>

        {memuat ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[380px] animate-pulse rounded-xl border border-[#E6DCD0] bg-white/80 p-6 shadow-sm"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : etalase.length === 0 ? (
          <div className="mt-8 rounded-xl border border-[#E6DCD0] bg-white/80 p-6 text-center shadow-sm">
            <p className="font-serif text-lg text-[#3E2723]">Rak sedang dirapikan</p>
            <p className="mt-2 text-sm text-[#6B4F43]">
              Belum ada judul yang siap dipesan. Kembali lagi nanti atau cek
              katalog untuk melihat koleksi lainnya.
            </p>
            <a
              href="/katalog"
              className="mt-5 inline-flex rounded-lg border border-[#C8B6A6] px-5 py-2 text-sm font-semibold text-[#4A2C2A] transition hover:bg-[#F3ECE1]"
            >
              Buka Katalog
            </a>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {etalase.map((buku) => {
              const kondisi = labelKondisi(buku)
              return (
                <a
                  key={buku.id}
                  href={`/katalog/${encodeURIComponent(buku.code)}`}
                  className="group flex flex-col rounded-xl border border-[#E6DCD0] bg-white/80 p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C8A46A] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C]"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-[#E6DCD0] bg-[#EFE4D2]">
                    {buku.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buku.imageUrl}
                        alt={`Sampul buku ${buku.title}`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <SampulPlaceholder judul={buku.title} />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col pt-5">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          kondisi === 'Bekas'
                            ? 'bg-[#EADBC8] text-[#6B4F43]'
                            : 'bg-[#F2E7D5] text-[#8D5B4C]'
                        }`}
                      >
                        {kondisi}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-wider text-[#6B4F43]/70">
                        {buku.code}
                      </span>
                    </div>

                    <h3
                      className="mt-3 line-clamp-2 font-serif text-[15px] leading-6 text-[#3E2723]"
                      title={buku.title}
                    >
                      {buku.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-[#6B4F43]">
                      {buku.author}
                    </p>

                    <div className="mt-auto border-t border-[#E6DCD0] pt-3">
                      <p className="font-semibold text-[#8D5B4C]">
                        {formatRupiah(buku.sellingPrice)}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-[#3E2723] transition group-hover:text-[#8D5B4C]">
                        Lihat detail buku →
                      </p>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </section>

      {/* ===================== ALUR BELANJA ===================== */}
      <section
        id="cara-pemesanan"
        className="scroll-mt-24 border-y border-[#E6DCD0] bg-[#F3ECE1]"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8D5B4C]">
              Panduan Singkat
            </p>
            <h2 className="mt-3 font-serif text-2xl text-[#3E2723] sm:text-3xl">
              Tiga langkah membawa buku pulang
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6B4F43]">
              Dari rak toko sampai ke tangan Anda di booth CFD.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {langkahBelanja.map((langkah) => (
              <article
                key={langkah.nomor}
                className="rounded-xl border border-[#E6DCD0] bg-white/80 p-6 shadow-sm"
              >
                <span className="font-serif text-3xl text-[#8D5B4C]/35">
                  {langkah.nomor}
                </span>
                <h3 className="mt-3 font-serif text-base text-[#3E2723]">
                  {langkah.judul}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#6B4F43]">
                  {langkah.deskripsi}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/katalog"
              className="inline-flex items-center justify-center rounded-lg bg-[#4A2C2A] px-6 py-3 text-sm font-semibold text-[#FAF6F0] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#5E3935] hover:shadow-md"
            >
              Mulai dari Katalog
            </a>
            <p className="text-xs text-[#6B4F43]">
              Sudah punya akun?{' '}
              <a
                href="/login"
                className="font-semibold text-[#8D5B4C] underline underline-offset-4"
              >
                Masuk di sini
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ===================== CATATAN OPERASIONAL ===================== */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <div className="flex flex-col gap-4 rounded-xl border border-[#E6DCD0] bg-white/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg text-[#3E2723]">
              Ingin melihat langsung koleksinya?
            </h2>
            <p className="mt-1 text-sm text-[#6B4F43]">
              Kami berada di booth CFD setiap Minggu pagi. Pengambilan ditutup
              pukul 09.00 WIB.
            </p>
          </div>
          <a
            href="/katalog"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#C8B6A6] px-5 py-2.5 text-sm font-semibold text-[#4A2C2A] transition hover:bg-[#F3ECE1]"
          >
            Cari buku sekarang
          </a>
        </div>
      </section>
    </div>
  )
}
