'use client';

// src/app/admin/pembayaran/page.tsx
// Antrean verifikasi pembayaran: Admin Biasa (pemeriksaan awal) & Admin Utama (putusan final).
// 100% Bahasa Indonesia, komponen @/components/ui, tema krem/cokelat.

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
import { labelStatusReview } from '@/lib/pembayaran'
import { labelStatusBukti, labelStatusPesanan } from '@/lib/pesanan'

type BuktiRingkas = {
  id: string
  imageUrl: string
  status: string
  amount: number
  isLatest: boolean
  uploadedAt: string
}

type Antrean = {
  id: string
  orderNumber: string
  orderStatus: string
  paymentProofStatus: string
  paymentReviewStatus: string
  paymentRejectedCount: number
  paymentDeadline: string
  totalAmount: number
  paymentMethod: string
  methodChangeStatus: string
  bukti: BuktiRingkas | null
}

type Detail = {
  pesanan: any
  riwayatBukti: any[]
  verifikasi: any[]
  perubahanMetode: any[]
  perpanjangan: any[]
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

const DAFTAR_AKSI_ADMIN_BIASA = [
  { value: 'PERIKSA_AWAL_DITERUSKAN', label: 'Teruskan hasil pemeriksaan ke Admin Utama' },
  { value: 'PERIKSA_AWAL_DITOLAK', label: 'Tolak bukti pada pemeriksaan awal' },
  { value: 'MINTA_BUKTI_BARU', label: 'Minta bukti baru dengan alasan' },
  { value: 'BAYAR_CFD', label: 'Catat pembayaran langsung di CFD' },
  { value: 'SETUJU_METODE', label: 'Setujui pengajuan ubah metode' },
  { value: 'TOLAK_METODE', label: 'Tolak pengajuan ubah metode' },
  { value: 'SETUJU_TENGGAT', label: 'Setujui pengajuan perpanjangan tenggat' },
  { value: 'TOLAK_TENGGAT', label: 'Tolak pengajuan perpanjangan tenggat' },
]

const DAFTAR_AKSI_ADMIN_UTAMA = [
  { value: 'PUTUS_FINAL_DISETUJUI', label: 'Setujui pembayaran secara final' },
  { value: 'PUTUS_FINAL_DITOLAK', label: 'Tolak pembayaran secara final' },
  { value: 'MINTA_BUKTI_BARU', label: 'Minta bukti baru dengan alasan' },
  { value: 'AMBIL_ALIH', label: 'Ambil alih kasus setelah penolakan' },
  { value: 'KOREKSI', label: 'Koreksi metode/status tanpa mengubah nominal' },
  { value: 'BAYAR_CFD', label: 'Catat pembayaran langsung di CFD' },
  { value: 'SETUJU_METODE', label: 'Setujui pengajuan ubah metode' },
  { value: 'TOLAK_METODE', label: 'Tolak pengajuan ubah metode' },
  { value: 'SETUJU_TENGGAT', label: 'Setujui pengajuan perpanjangan tenggat' },
  { value: 'TOLAK_TENGGAT', label: 'Tolak pengajuan perpanjangan tenggat' },
]

export default function HalamanPembayaranAdmin() {
  const [daftar, setDaftar] = useState<Antrean[]>([])
  const [ringkasan, setRingkasan] = useState<Record<string, number>>({})
  const [hakAkses, setHakAkses] = useState({ bisaPutusFinal: false, bisaKoreksi: false })
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [aksi, setAksi] = useState('')
  const [alasan, setAlasan] = useState('')
  const [tenggatBaru, setTenggatBaru] = useState('')
  const [metodeKoreksi, setMetodeKoreksi] = useState('QRIS')
  const [pesan, setPesan] = useState<{ jenis: 'success' | 'error' | 'info'; teks: string } | null>(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const [sedangMemproses, setSedangMemproses] = useState(false)

  const muatDaftar = useCallback(async () => {
    setSedangMemuat(true)
    try {
      const res = await fetch('/api/admin/pembayaran', { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat antrean')
      setDaftar(isi.daftar || [])
      setRingkasan(isi.ringkasan || {})
      setHakAkses(isi.hakAkses || { bisaPutusFinal: false, bisaKoreksi: false })
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat antrean' })
    } finally {
      setSedangMemuat(false)
    }
  }, [])

  useEffect(() => {
    muatDaftar()
  }, [muatDaftar])

  const muatDetail = useCallback(async (id: string) => {
    setSedangMemproses(true)
    setPesan(null)
    try {
      const res = await fetch(`/api/admin/pembayaran/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat detail')
      setDetail(isi as Detail)
      setTerpilih(id)
      setAksi('')
      setAlasan('')
      setTenggatBaru('')
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat detail' })
    } finally {
      setSedangMemproses(false)
    }
  }, [])

  async function kirimKeputusan() {
    if (!terpilih || !aksi) {
      setPesan({ jenis: 'error', teks: 'Pilih tindakan terlebih dahulu' })
      return
    }
    if (
      !alasan &&
      (aksi.includes('DITOLAK') ||
        aksi === 'MINTA_BUKTI_BARU' ||
        aksi === 'KOREKSI' ||
        aksi === 'TOLAK_METODE' ||
        aksi === 'TOLAK_TENGGAT' ||
        aksi === 'AMBIL_ALIH')
    ) {
      setPesan({ jenis: 'error', teks: 'Alasan wajib diisi untuk tindakan ini' })
      return
    }

    setSedangMemproses(true)
    setPesan(null)
    try {
      let body: Record<string, unknown> = { action: aksi, alasan }
      if (aksi === 'PERIKSA_AWAL_DITERUSKAN') body = { action: 'PERIKSA_AWAL', keputusan: 'DITERUSKAN', alasan }
      if (aksi === 'PERIKSA_AWAL_DITOLAK') body = { action: 'PERIKSA_AWAL', keputusan: 'DITOLAK', alasan }
      if (aksi === 'PUTUS_FINAL_DISETUJUI') body = { action: 'PUTUS_FINAL', keputusan: 'DISETUJUI', alasan }
      if (aksi === 'PUTUS_FINAL_DITOLAK') body = { action: 'PUTUS_FINAL', keputusan: 'DITOLAK', alasan }
      if (aksi === 'MINTA_BUKTI_BARU' && tenggatBaru) body.tenggatBaru = new Date(tenggatBaru).toISOString()
      if (aksi === 'KOREKSI') body.paymentMethod = metodeKoreksi

      const res = await fetch(`/api/admin/pembayaran/${encodeURIComponent(terpilih)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Tindakan gagal')

      setPesan({ jenis: 'success', teks: isi.pesan || 'Keputusan berhasil dicatat.' })
      await Promise.all([muatDaftar(), muatDetail(terpilih)])
      setAlasan('')
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Tindakan gagal' })
    } finally {
      setSedangMemproses(false)
    }
  }

  const aksiTersedia = hakAkses.bisaPutusFinal
    ? DAFTAR_AKSI_ADMIN_UTAMA
    : DAFTAR_AKSI_ADMIN_BIASA

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Verifikasi Pembayaran</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Pemeriksaan awal oleh Admin Biasa, lalu putusan final oleh Admin Utama.
      </p>

      {pesan && (
        <AlertBanner
          type={pesan.jenis}
          title={pesan.jenis === 'error' ? 'Perhatian' : 'Informasi'}
          description={pesan.teks}
        />
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Badge variant="info">Menunggu pemeriksaan: {ringkasan.menungguPemeriksaan || 0}</Badge>
        <Badge variant="warning">Menunggu putusan: {ringkasan.menungguPutusan || 0}</Badge>
        <Badge variant="danger">Perlu tindakan: {ringkasan.perluTindakan || 0}</Badge>
        <Badge variant="neutral">Ubah metode: {ringkasan.pengajuanUbahMetode || 0}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', gap: '1rem' }}>
        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, color: '#4d372d' }}>Antrean Pesanan</h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.6rem' }}>
            {sedangMemuat ? (
              <p>Sedang memuat antrean...</p>
            ) : daftar.length ? (
              daftar.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => muatDetail(item.id)}
                  style={{
                    textAlign: 'left',
                    background: terpilih === item.id ? '#e8dcc8' : '#fffaf0',
                    border: '1px solid #d7ccc8',
                    borderRadius: 6,
                    padding: '0.75rem',
                    cursor: 'pointer',
                    color: '#4d372d',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <strong>{item.orderNumber}</strong>
                    <Badge variant={item.paymentProofStatus === 'MENUNGGU_VERIFIKASI' ? 'info' : 'warning'}>
                      {labelStatusBukti(item.paymentProofStatus)}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    {labelStatusPesanan(item.orderStatus)} · {rupiah(item.totalAmount)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#5d4037' }}>
                    {labelStatusReview(item.paymentReviewStatus)} · penolakan: {item.paymentRejectedCount}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#5d4037' }}>
                    Tenggat: {tanggal(item.paymentDeadline)} WIB
                  </div>
                </button>
              ))
            ) : (
              <p>Belum ada antrean pembayaran.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, color: '#4d372d' }}>
              {detail ? `Detail ${detail.pesanan.orderNumber}` : 'Detail Pesanan'}
            </h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.9rem' }}>
            {!detail ? (
              <p>Pilih pesanan di samping untuk melihat bukti dan mengambil tindakan.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Badge variant="info">{labelStatusPesanan(detail.pesanan.orderStatus)}</Badge>
                  <Badge variant="warning">{labelStatusBukti(detail.pesanan.paymentProofStatus)}</Badge>
                  <Badge variant="neutral">{labelStatusReview(detail.pesanan.paymentReviewStatus)}</Badge>
                  {detail.pesanan.methodChangeStatus === 'MENUNGGU_PERSETUJUAN' && (
                    <Badge variant="danger">Timer dijeda: pengajuan ubah metode</Badge>
                  )}
                </div>

                <div>
                  <strong>Bukti terbaru</strong>
                  {detail.riwayatBukti.length ? (
                    <>
                      <div style={{ marginTop: '0.5rem' }}>
                        <img
                          src={detail.riwayatBukti[0].imageUrl}
                          alt="Bukti pembayaran pelanggan"
                          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                        Diunggah {tanggal(detail.riwayatBukti[0].uploadedAt)} WIB · riwayat:{' '}
                        {detail.riwayatBukti.length} berkas
                      </div>
                    </>
                  ) : (
                    <p>Bukti belum diunggah.</p>
                  )}
                </div>

                <Input
                  as="select"
                  label="Tindakan"
                  value={aksi}
                  onChange={(e) => setAksi(e.target.value)}
                  options={[
                    { value: '', label: 'Pilih tindakan...' },
                    ...aksiTersedia.map((item) => ({ value: item.value, label: item.label })),
                  ]}
                />
                <Input
                  as="textarea"
                  label="Alasan (wajib untuk penolakan, koreksi, dan permintaan bukti baru)"
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                />
                {aksi === 'MINTA_BUKTI_BARU' && (
                  <Input
                    label="Tenggat pengganti (opsional; default 24 jam)"
                    type="datetime-local"
                    value={tenggatBaru}
                    onChange={(e) => setTenggatBaru(e.target.value)}
                  />
                )}
                {aksi === 'KOREKSI' && (
                  <Input
                    as="select"
                    label="Metode pembayaran hasil koreksi"
                    value={metodeKoreksi}
                    onChange={(e) => setMetodeKoreksi(e.target.value)}
                    options={[
                      { value: 'QRIS', label: 'QRIS' },
                      { value: 'TUNAI_CFD', label: 'Tunai di Tempat (CFD)' },
                    ]}
                  />
                )}
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={kirimKeputusan} isLoading={sedangMemproses} disabled={!detail || !aksi}>
              Simpan Keputusan
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
