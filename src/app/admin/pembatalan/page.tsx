'use client'

// src/app/admin/pembatalan/page.tsx
// Pembatalan pesanan & koreksi status Selesai (Tahap 10).
// 100% Bahasa Indonesia, komponen @/components/ui, tema klasik krem/cokelat.
// GR-02/GR-03/GR-06: keputusan divalidasi server; audit append-only; tanpa field modal.

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
import { labelStatusBukti, labelStatusPesanan, labelStatusRefund } from '@/lib/pesanan'

type RingkasanRefund = {
  nominalDibayar: number
  totalDisetujui: number
  totalMenunggu: number
  sisa: number
  status: string
}

type DaftarItem = {
  id: string
  orderNumber: string
  orderStatus: string
  paymentProofStatus: string
  paidAt: string | null
  refundStatus: string
  cancelReason: string | null
  stockReleased: boolean
  stockSold: boolean
  totalAmount: number
  ringkasanRefund: RingkasanRefund
  createdAt: string
}

type Detail = {
  pesanan: {
    id: string
    orderNumber: string
    customerId: string
    orderStatus: string
    paymentProofStatus: string
    paymentReviewStatus: string
    paidAt: string | null
    refundStatus: string
    cancelReason: string | null
    cancelReasonTambahan: string | null
    cancelledAt: string | null
    cancelledById: string | null
    cancelledByRole: string | null
    stockReleased: boolean
    stockSold: boolean
    completedAt: string | null
    totalAmount: number
  }
  items: Array<{
    id: string
    snapshotTitle: string
    snapshotCode: string
    quantity: number
    subtotal: number
  }>
  riwayat: Array<{
    id: string
    domain: string
    oldStatus: string
    newStatus: string
    reason: string | null
    createdAt: string
  }>
  refund: Array<{
    id: string
    refundAmount: number
    status: string
    reason: string
    metode: string | null
    bukti: string | null
    approvedById: string | null
    refundedAt: string
  }>
  ringkasanRefund: RingkasanRefund
  statusSebelumSelesai: string | null
  hakAkses: {
    bisaBatalkan: boolean
    bisaKoreksi: boolean
    butuhAlasanTambahan: boolean
  }
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

export default function HalamanPembatalanAdmin() {
  const [daftar, setDaftar] = useState<DaftarItem[]>([])
  const [ringkasan, setRingkasan] = useState<Record<string, number>>({})
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [aksi, setAksi] = useState('BATALKAN')
  const [alasan, setAlasan] = useState('')
  const [alasanTambahan, setAlasanTambahan] = useState('')
  const [pesan, setPesan] = useState<{ jenis: 'success' | 'error' | 'info'; teks: string } | null>(
    null
  )
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const [sedangMemproses, setSedangMemproses] = useState(false)

  const muatDaftar = useCallback(async () => {
    setSedangMemuat(true)
    try {
      const res = await fetch('/api/admin/pembatalan', { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat daftar pembatalan')
      setDaftar(isi.daftar || [])
      setRingkasan(isi.ringkasan || {})
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat daftar pembatalan' })
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
      const res = await fetch(`/api/admin/pembatalan/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat detail pembatalan')
      setDetail(isi as Detail)
      setTerpilih(id)
      setAksi('BATALKAN')
      setAlasan('')
      setAlasanTambahan('')
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat detail pembatalan' })
    } finally {
      setSedangMemproses(false)
    }
  }, [])

  async function kirimKeputusan() {
    if (!terpilih || !detail) return
    if (alasan.trim().length < 3) {
      setPesan({ jenis: 'error', teks: 'Alasan wajib diisi minimal 3 karakter' })
      return
    }
    if (
      aksi === 'BATALKAN' &&
      detail.hakAkses.butuhAlasanTambahan &&
      alasanTambahan.trim().length < 3
    ) {
      setPesan({
        jenis: 'error',
        teks: 'Admin Utama tunggal wajib mengisi alasan tambahan untuk pembatalan pesanan lunas',
      })
      return
    }
    setSedangMemproses(true)
    setPesan(null)
    try {
      const res = await fetch(`/api/admin/pembatalan/${encodeURIComponent(terpilih)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: aksi, alasan, alasanTambahan }),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Keputusan pembatalan gagal')
      setPesan({ jenis: 'success', teks: isi.pesan || 'Keputusan berhasil dicatat.' })
      setAlasan('')
      setAlasanTambahan('')
      await Promise.all([muatDaftar(), muatDetail(terpilih)])
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Keputusan pembatalan gagal' })
    } finally {
      setSedangMemproses(false)
    }
  }

  const opsiAksi = detail
    ? [
        ...(detail.hakAkses.bisaBatalkan
          ? [{ value: 'BATALKAN', label: 'Batalkan pesanan (final)' }]
          : []),
        ...(detail.hakAkses.bisaKoreksi && detail.pesanan.orderStatus === 'SELESAI'
          ? [
              {
                value: 'KOREKSI_SELESAI',
                label: `Koreksi Selesai ke ${detail.statusSebelumSelesai || 'status riwayat'}`,
              },
            ]
          : []),
      ]
    : []

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Pembatalan Pesanan</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Pembatalan bersifat final dan stok tertahan dikembalikan tepat sekali. Pesanan lunas hanya
        dapat dibatalkan Admin Utama; refund tetap diproses terpisah melalui menu Refund.
      </p>

      {pesan && <AlertBanner type={pesan.jenis} title="Informasi" description={pesan.teks} />}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Badge variant="info">Aktif: {ringkasan.aktif || 0}</Badge>
        <Badge variant="danger">Dibatalkan: {ringkasan.dibatalkan || 0}</Badge>
        <Badge variant="success">Selesai: {ringkasan.selesai || 0}</Badge>
        <Badge variant="warning">Perlu refund: {ringkasan.perluRefund || 0}</Badge>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
          gap: '1rem',
        }}
      >
        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>Daftar Pesanan</h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.6rem' }}>
            {sedangMemuat ? (
              <p>Sedang memuat pesanan...</p>
            ) : daftar.length === 0 ? (
              <p>Tidak ada pesanan untuk ditinjau.</p>
            ) : (
              daftar.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => muatDetail(item.id)}
                  style={{
                    textAlign: 'left',
                    background: terpilih === item.id ? '#efe3cf' : '#faf7ef',
                    border: '1px solid #d7ccc8',
                    borderRadius: 6,
                    padding: '0.7rem',
                    cursor: 'pointer',
                    color: '#4d372d',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.orderNumber}</div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {labelStatusPesanan(item.orderStatus)} · {rupiah(item.totalAmount)}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Refund: {labelStatusRefund(item.refundStatus)} · Sisa{' '}
                    {rupiah(item.ringkasanRefund?.sisa || 0)}
                  </div>
                  {item.cancelReason && (
                    <div style={{ fontSize: '0.85rem', color: '#7b2d26' }}>
                      Alasan: {item.cancelReason}
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
              Detail &amp; Keputusan
            </h2>
          </CardHeader>
          {!detail ? (
            <CardContent>
              <p>Pilih pesanan untuk melihat detail pembatalan.</p>
            </CardContent>
          ) : (
            <>
              <CardContent style={{ display: 'grid', gap: '0.8rem' }}>
                <div>
                  <strong>{detail.pesanan.orderNumber}</strong> ·{' '}
                  <Badge variant="warning">
                    {labelStatusPesanan(detail.pesanan.orderStatus)}
                  </Badge>
                </div>
                <div>
                  Pembayaran: {labelStatusBukti(detail.pesanan.paymentProofStatus)} ·{' '}
                  {detail.pesanan.paidAt
                    ? `Lunas ${tanggal(detail.pesanan.paidAt)} WIB`
                    : 'Belum lunas'}
                </div>
                <div>Status refund: {labelStatusRefund(detail.pesanan.refundStatus)}</div>
                {detail.pesanan.cancelledAt && (
                  <AlertBanner
                    type="warning"
                    title="Pesanan sudah dibatalkan"
                    description={`Dibatalkan oleh ${detail.pesanan.cancelledByRole || '-'} pada ${tanggal(detail.pesanan.cancelledAt)} WIB. Alasan: ${detail.pesanan.cancelReason || '-'}${detail.pesanan.cancelReasonTambahan ? ` · Tambahan: ${detail.pesanan.cancelReasonTambahan}` : ''}`}
                  />
                )}
                {detail.pesanan.orderStatus === 'SELESAI' && (
                  <AlertBanner
                    type="info"
                    title="Koreksi status Selesai"
                    description={
                      detail.statusSebelumSelesai
                        ? `Status akan dikembalikan ke ${detail.statusSebelumSelesai} sesuai riwayat. Stok Total dan stok tertahan dikembalikan dalam satu transaksi.`
                        : 'Riwayat transisi ke Selesai tidak ditemukan, sehingga koreksi tidak dapat dilakukan.'
                    }
                  />
                )}
                <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.75rem' }}>
                  <strong style={{ color: '#4d372d' }}>Item Pesanan</strong>
                  {detail.items.map((item) => (
                    <div key={item.id} style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                      {item.snapshotTitle} · {item.quantity} eksemplar · {rupiah(item.subtotal)}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                  Nominal dibayar: {rupiah(detail.ringkasanRefund?.nominalDibayar || 0)} · Sudah
                  refund: {rupiah(detail.ringkasanRefund?.totalDisetujui || 0)} · Menunggu:{' '}
                  {rupiah(detail.ringkasanRefund?.totalMenunggu || 0)} · Sisa{' '}
                  {rupiah(detail.ringkasanRefund?.sisa || 0)}
                </div>
                {detail.riwayat.length > 0 && (
                  <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.75rem' }}>
                    <strong style={{ color: '#4d372d' }}>Riwayat Status</strong>
                    {detail.riwayat.slice(0, 12).map((item) => (
                      <div key={item.id} style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                        {tanggal(item.createdAt)} WIB · {item.domain}: {item.oldStatus} →{' '}
                        {item.newStatus}
                        {item.reason ? ` · ${item.reason}` : ''}
                      </div>
                    ))}
                  </div>
                )}

                {opsiAksi.length > 0 && (
                  <>
                    <Input
                      as="select"
                      label="Tindakan"
                      value={aksi}
                      onChange={(e) => setAksi(e.target.value)}
                      options={opsiAksi}
                    />
                    <Input
                      as="textarea"
                      label="Alasan (wajib, minimal 3 karakter)"
                      rows={2}
                      value={alasan}
                      onChange={(e) => setAlasan(e.target.value)}
                    />
                    {aksi === 'BATALKAN' && detail.hakAkses.butuhAlasanTambahan && (
                      <Input
                        as="textarea"
                        label="Alasan tambahan Admin Utama tunggal (wajib untuk pesanan lunas)"
                        rows={2}
                        value={alasanTambahan}
                        onChange={(e) => setAlasanTambahan(e.target.value)}
                      />
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                {opsiAksi.length > 0 && (
                  <Button variant="danger" onClick={kirimKeputusan} isLoading={sedangMemproses}>
                    Kirim Keputusan
                  </Button>
                )}
                <Button variant="secondary" onClick={muatDaftar}>
                  Muat Ulang Daftar
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
