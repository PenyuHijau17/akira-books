'use client'

// src/app/admin/penjualan-offline/page.tsx
// Penjualan langsung di booth & koreksi harga (Tahap 11).
// 100% Bahasa Indonesia, tema klasik krem/cokelat, komponen @/components/ui.
// GR-02/GR-03/GR-06: otorisasi di server; modal & laba tidak dirender untuk Admin Biasa.

import { useCallback, useEffect, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
} from '@/components/ui'

type Buku = {
  id: string
  code: string
  title: string
  sellingPrice: number
  status: string
  stokTersedia: number
}

type ItemPenjualan = {
  id: string
  bookId: string
  quantity: number
  actualSellingPrice: number
  snapshotTitle: string
  subtotal: number
}

type Penjualan = {
  id: string
  soldAt: string
  status: string
  catatan: string | null
  pendapatan: number
  unit: number
  items: ItemPenjualan[]
  labaHistoris?: number
}

type Koreksi = {
  id: string
  offlineSaleId: string
  offlineSaleItemId: string
  pengajuId: string
  peranPengaju: string
  hargaLama: number
  hargaBaru: number
  alasan: string
  status: string
  createdAt: string
}

type Detail = {
  penjualan: { id: string; soldAt: string; status: string; catatan: string | null }
  items: ItemPenjualan[]
  koreksi: Koreksi[]
  hakAkses: { bisaMengusulkan: boolean; bisaMemutuskan: boolean }
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai || 0)

const tanggal = (nilai: string) =>
  new Date(nilai).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const kunciBaru = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function HalamanPenjualanOffline() {
  const [peran, setPeran] = useState<string | null>(null)
  const [daftar, setDaftar] = useState<Penjualan[]>([])
  const [daftarBuku, setDaftarBuku] = useState<Buku[]>([])
  const [koreksiMenunggu, setKoreksiMenunggu] = useState<Koreksi[]>([])
  const [bisaLihatKeuangan, setBisaLihatKeuangan] = useState(false)
  const [bookId, setBookId] = useState('')
  const [kuantitas, setKuantitas] = useState('1')
  const [hargaJual, setHargaJual] = useState('')
  const [catatan, setCatatan] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [itemKoreksiId, setItemKoreksiId] = useState('')
  const [hargaKoreksi, setHargaKoreksi] = useState('')
  const [alasanUsul, setAlasanUsul] = useState('')
  const [alasanKeputusan, setAlasanKeputusan] = useState('')
  const [pesan, setPesan] = useState<{ jenis: 'success' | 'error' | 'info'; teks: string } | null>(
    null
  )
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const [sedangMemproses, setSedangMemproses] = useState(false)

  const muatDaftar = useCallback(async () => {
    setSedangMemuat(true)
    try {
      const res = await fetch('/api/admin/penjualan-offline', { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat penjualan offline')
      setDaftar(isi.daftar || [])
      setDaftarBuku(isi.daftarBuku || [])
      setKoreksiMenunggu(isi.koreksiMenunggu || [])
      setBisaLihatKeuangan(Boolean(isi?.hakAkses?.bisaLihatKeuangan))
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat penjualan offline' })
    } finally {
      setSedangMemuat(false)
    }
  }, [])

  useEffect(() => {
    let aktif = true
    async function muat() {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' })
        const isi = await res.json()
        const peranUser = String(isi?.user?.role || '')
        if (!aktif) return
        setPeran(peranUser)
        if (peranUser === 'ADMIN_BIASA' || peranUser === 'ADMIN_UTAMA') {
          await muatDaftar()
        } else {
          setSedangMemuat(false)
        }
      } catch {
        if (aktif) setSedangMemuat(false)
      }
    }
    muat()
    setIdempotencyKey(kunciBaru())
    return () => {
      aktif = false
    }
  }, [muatDaftar])

  const muatDetail = useCallback(async (id: string) => {
    setSedangMemproses(true)
    setPesan(null)
    try {
      const res = await fetch(`/api/admin/penjualan-offline/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat detail penjualan')
      setDetail(isi as Detail)
      setTerpilih(id)
      setItemKoreksiId(isi?.items?.[0]?.id || '')
      setHargaKoreksi(String(isi?.items?.[0]?.actualSellingPrice || ''))
      setAlasanUsul('')
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat detail penjualan' })
    } finally {
      setSedangMemproses(false)
    }
  }, [])

  async function catatPenjualan() {
    const buku = daftarBuku.find((b) => b.id === bookId)
    if (!buku) {
      setPesan({ jenis: 'error', teks: 'Pilih judul buku terlebih dahulu' })
      return
    }
    setSedangMemproses(true)
    setPesan(null)
    try {
      const res = await fetch('/api/admin/penjualan-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey || kunciBaru(),
          catatan,
          items: [
            {
              bookId,
              quantity: Number(kuantitas),
              actualSellingPrice: Number(hargaJual || buku.sellingPrice),
            },
          ],
        }),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Penjualan gagal dicatat')
      setPesan({ jenis: 'success', teks: isi.pesan || 'Penjualan offline berhasil dicatat.' })
      setBookId('')
      setKuantitas('1')
      setHargaJual('')
      setCatatan('')
      setIdempotencyKey(kunciBaru())
      await muatDaftar()
      if (isi?.penjualan?.id) await muatDetail(isi.penjualan.id)
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Penjualan gagal dicatat' })
    } finally {
      setSedangMemproses(false)
    }
  }

  async function kirimKoreksi(
    action: 'USUL_KOREKSI' | 'SETUJUI_KOREKSI' | 'TOLAK_KOREKSI',
    koreksiId?: string,
    saleIdParam?: string
  ) {
    const target = saleIdParam || terpilih
    if (!target) return
    setSedangMemproses(true)
    setPesan(null)
    try {
      const res = await fetch(`/api/admin/penjualan-offline/${encodeURIComponent(target)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          itemId: action === 'USUL_KOREKSI' ? itemKoreksiId : undefined,
          koreksiId,
          hargaBaru: action === 'USUL_KOREKSI' ? Number(hargaKoreksi) : undefined,
          alasan: action === 'USUL_KOREKSI' ? alasanUsul : alasanKeputusan,
        }),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Koreksi gagal diproses')
      setPesan({ jenis: 'success', teks: isi.pesan || 'Koreksi berhasil diproses.' })
      setAlasanUsul('')
      setAlasanKeputusan('')
      await Promise.all([muatDaftar(), muatDetail(target)])
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Koreksi gagal diproses' })
    } finally {
      setSedangMemproses(false)
    }
  }

  if (!sedangMemuat && peran !== 'ADMIN_BIASA' && peran !== 'ADMIN_UTAMA') {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <AlertBanner
          type="error"
          title="Akses ditolak"
          description="Halaman penjualan offline hanya tersedia untuk Admin Biasa dan Admin Utama."
        />
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Penjualan Offline</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Catat penjualan langsung di lapak/CFD. Stok buku berkurang seketika dan keranjang
        pelanggan yang terdampak otomatis disesuaikan. Harga jual boleh berbeda dari harga
        katalog.
      </p>

      {pesan && <AlertBanner type={pesan.jenis} title="Informasi" description={pesan.teks} />}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
          gap: '1rem',
        }}
      >
        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
              Catat Transaksi Baru
            </h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.8rem' }}>
            <Input
              as="select"
              label="Judul buku"
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value)
                const dipilih = daftarBuku.find((b) => b.id === e.target.value)
                setHargaJual(dipilih ? String(dipilih.sellingPrice) : '')
              }}
              options={daftarBuku.map((b) => ({
                value: b.id,
                label: `${b.title} — sisa ${b.stokTersedia} eksemplar`,
              }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <Input
                type="number"
                min={1}
                label="Kuantitas"
                value={kuantitas}
                onChange={(e) => setKuantitas(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                label="Harga jual aktual per unit"
                helperText="Boleh berbeda dari harga katalog"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
              />
            </div>
            <Input
              as="textarea"
              rows={2}
              label="Catatan (opsional)"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={catatPenjualan} isLoading={sedangMemproses}>
              Simpan Penjualan
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
              Riwayat Penjualan
            </h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.6rem' }}>
            {sedangMemuat ? (
              <p>Sedang memuat...</p>
            ) : daftar.length === 0 ? (
              <p>Belum ada penjualan offline yang tercatat.</p>
            ) : (
              daftar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => muatDetail(s.id)}
                  style={{
                    textAlign: 'left',
                    background: terpilih === s.id ? '#efe3cf' : '#faf7ef',
                    border: '1px solid #d7ccc8',
                    borderRadius: 6,
                    padding: '0.7rem',
                    cursor: 'pointer',
                    color: '#4d372d',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {s.items.map((i) => i.snapshotTitle).join(', ') || 'Penjualan offline'}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {tanggal(s.soldAt)} WIB · {s.unit} eksemplar · {rupiah(s.pendapatan)}
                  </div>
                  {bisaLihatKeuangan && typeof s.labaHistoris === 'number' && (
                    <div style={{ fontSize: '0.85rem' }}>
                      Laba historis: {rupiah(s.labaHistoris)}
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {detail && (
        <Card style={{ marginTop: '1rem' }}>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
              Detail Penjualan &amp; Koreksi Harga
            </h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.8rem' }}>
            <Badge variant="success">{detail.penjualan.status}</Badge>
            {detail.items.map((item) => (
              <div key={item.id} style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                {item.snapshotTitle} · {item.quantity} eksemplar ·{' '}
                {rupiah(item.actualSellingPrice)} per unit → {rupiah(item.subtotal)}
              </div>
            ))}

            {detail.hakAkses.bisaMengusulkan && (
              <div
                style={{
                  borderTop: '1px solid #d7ccc8',
                  paddingTop: '0.75rem',
                  display: 'grid',
                  gap: '0.8rem',
                }}
              >
                <strong style={{ color: '#4d372d' }}>Usul Koreksi Harga</strong>
                <Input
                  as="select"
                  label="Item yang dikoreksi"
                  value={itemKoreksiId}
                  onChange={(e) => setItemKoreksiId(e.target.value)}
                  options={detail.items.map((i) => ({
                    value: i.id,
                    label: `${i.snapshotTitle} — ${rupiah(i.actualSellingPrice)}`,
                  }))}
                />
                <Input
                  type="number"
                  min={1}
                  label="Harga baru per unit"
                  value={hargaKoreksi}
                  onChange={(e) => setHargaKoreksi(e.target.value)}
                />
                <Input
                  as="textarea"
                  rows={2}
                  label="Alasan koreksi (wajib)"
                  value={alasanUsul}
                  onChange={(e) => setAlasanUsul(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => kirimKoreksi('USUL_KOREKSI')}
                  isLoading={sedangMemproses}
                >
                  Kirim Usul
                </Button>
              </div>
            )}

            {koreksiMenunggu.length > 0 && (
              <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.75rem' }}>
                <strong style={{ color: '#4d372d' }}>Usul Menunggu Persetujuan</strong>
                {koreksiMenunggu.map((k) => (
                  <div key={k.id} style={{ fontSize: '0.85rem', color: '#5d4037', marginTop: 4 }}>
                    {rupiah(k.hargaLama)} → {rupiah(k.hargaBaru)} · {k.peranPengaju} · {k.alasan}
                    {detail.hakAkses.bisaMemutuskan && (
                      <span style={{ marginLeft: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            void kirimKoreksi('SETUJUI_KOREKSI', k.id, k.offlineSaleId)
                          }}
                          style={{ marginRight: 6, cursor: 'pointer' }}
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void kirimKoreksi('TOLAK_KOREKSI', k.id, k.offlineSaleId)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          Tolak
                        </button>
                      </span>
                    )}
                  </div>
                ))}
                {detail.hakAkses.bisaMemutuskan && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <Input
                      as="textarea"
                      rows={2}
                      label="Alasan keputusan (wajib saat menolak)"
                      value={alasanKeputusan}
                      onChange={(e) => setAlasanKeputusan(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
