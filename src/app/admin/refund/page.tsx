'use client'

// src/app/admin/refund/page.tsx
// Modul Refund terpisah dari pembatalan (Tahap 10).
// Pengajuan dicatat, persetujuan akhir hanya Admin Utama; nominal bertahap terverifikasi.
// 100% Bahasa Indonesia, komponen @/components/ui, tema klasik krem/cokelat.

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
import { labelStatusPesanan, labelStatusRefund } from '@/lib/pesanan'

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
  refundStatus: string
  cancelReason: string | null
  cancelledAt: string | null
  totalAmount: number
  ringkasanRefund: RingkasanRefund
}

type RefundRecord = {
  id: string
  refundAmount: number
  reason: string
  status: string
  metode: string | null
  bukti: string | null
  catatan: string | null
  processedById: string
  approvedById: string | null
  approvedAt: string | null
  refundedAt: string
  createdAt: string
}

type Detail = {
  pesanan: {
    id: string
    orderNumber: string
    orderStatus: string
    refundStatus: string
    refundNominal: number | null
    paidAt: string | null
    cancelReason: string | null
    cancelledAt: string | null
  }
  refund: RefundRecord[]
  riwayat: Array<{
    id: string
    domain: string
    oldStatus: string
    newStatus: string
    reason: string | null
    createdAt: string
  }>
  ringkasanRefund: RingkasanRefund
  labelStatusRefund: string
  hakAkses: { bisaMemproses: boolean }
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

const LABEL_METODE: Record<string, string> = {
  TRANSFER_BANK: 'Transfer Bank',
  TUNAI: 'Tunai',
  QRIS: 'QRIS',
  LAINNYA: 'Lainnya',
}

export default function HalamanRefundAdmin() {
  const [daftar, setDaftar] = useState<DaftarItem[]>([])
  const [ringkasan, setRingkasan] = useState<Record<string, number>>({})
  const [metode, setMetode] = useState<string[]>([])
  const [hakAkses, setHakAkses] = useState({ bisaAjukan: false, bisaMemproses: false })
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [aksi, setAksi] = useState('AJUKAN')
  const [nominal, setNominal] = useState('')
  const [alasan, setAlasan] = useState('')
  const [metodeRefund, setMetodeRefund] = useState('TRANSFER_BANK')
  const [bukti, setBukti] = useState('')
  const [catatan, setCatatan] = useState('')
  const [refundId, setRefundId] = useState('')
  const [pesan, setPesan] = useState<{ jenis: 'success' | 'error' | 'info'; teks: string } | null>(
    null
  )
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const [sedangMemproses, setSedangMemproses] = useState(false)

  const muatDaftar = useCallback(async () => {
    setSedangMemuat(true)
    try {
      const res = await fetch('/api/admin/refund', { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat daftar refund')
      setDaftar(isi.daftar || [])
      setRingkasan(isi.ringkasan || {})
      setMetode(isi.metode || [])
      setHakAkses(isi.hakAkses || { bisaAjukan: false, bisaMemproses: false })
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat daftar refund' })
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
      const res = await fetch(`/api/admin/refund/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat detail refund')
      setDetail(isi as Detail)
      setTerpilih(id)
      setAksi('AJUKAN')
      setNominal(String(isi?.ringkasanRefund?.sisa ?? ''))
      setAlasan('')
      setBukti('')
      setCatatan('')
      const menunggu = (isi.refund || []).find(
        (r: RefundRecord) => r.status === 'MENUNGGU_PERSETUJUAN'
      )
      setRefundId(menunggu?.id || '')
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat detail refund' })
    } finally {
      setSedangMemproses(false)
    }
  }, [])

  async function kirimAksi() {
    if (!terpilih || !detail) return
    if (alasan.trim().length < 3) {
      setPesan({ jenis: 'error', teks: 'Alasan wajib diisi minimal 3 karakter' })
      return
    }
    if (aksi === 'AJUKAN' && (!nominal || Number(nominal) <= 0)) {
      setPesan({ jenis: 'error', teks: 'Nominal refund harus bilangan bulat positif' })
      return
    }
    setSedangMemproses(true)
    setPesan(null)
    try {
      const res = await fetch(`/api/admin/refund/${encodeURIComponent(terpilih)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: aksi,
          nominal: Number(nominal),
          alasan,
          metode: metodeRefund,
          bukti,
          catatan,
          refundId,
        }),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Pemrosesan refund gagal')
      setPesan({ jenis: 'success', teks: isi.pesan || 'Refund berhasil diproses.' })
      setAlasan('')
      await Promise.all([muatDaftar(), muatDetail(terpilih)])
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Pemrosesan refund gagal' })
    } finally {
      setSedangMemproses(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Pengembalian Dana (Refund)</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Refund dikelola terpisah dari pembatalan pesanan. Pengajuan dicatat dengan alasan, lalu
        Admin Utama menyetujui atau menolak. Total refund tidak boleh melebihi nominal pembayaran.
      </p>

      {pesan && <AlertBanner type={pesan.jenis} title="Informasi" description={pesan.teks} />}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Badge variant="warning">Perlu diproses: {ringkasan.perluDiproses || 0}</Badge>
        <Badge variant="info">Sebagian: {ringkasan.sebagian || 0}</Badge>
        <Badge variant="success">Selesai: {ringkasan.selesai || 0}</Badge>
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
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
              Pesanan Perlu Refund
            </h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.6rem' }}>
            {sedangMemuat ? (
              <p>Sedang memuat refund...</p>
            ) : daftar.length === 0 ? (
              <p>Tidak ada pesanan dengan kewajiban refund.</p>
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
                    {labelStatusRefund(item.refundStatus)} · Dibayar{' '}
                    {rupiah(item.ringkasanRefund?.nominalDibayar || 0)}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Sisa {rupiah(item.ringkasanRefund?.sisa || 0)}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
              Detail &amp; Proses Refund
            </h2>
          </CardHeader>
          {!detail ? (
            <CardContent>
              <p>Pilih pesanan untuk mengajukan atau memproses refund.</p>
            </CardContent>
          ) : (
            <>
              <CardContent style={{ display: 'grid', gap: '0.8rem' }}>
                <div>
                  <strong>{detail.pesanan.orderNumber}</strong> ·{' '}
                  {labelStatusPesanan(detail.pesanan.orderStatus)}
                </div>
                <div>
                  Status refund:{' '}
                  <Badge variant="warning">{detail.labelStatusRefund}</Badge>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                  Nominal dibayar: {rupiah(detail.ringkasanRefund?.nominalDibayar || 0)} · Disetujui:{' '}
                  {rupiah(detail.ringkasanRefund?.totalDisetujui || 0)} · Menunggu:{' '}
                  {rupiah(detail.ringkasanRefund?.totalMenunggu || 0)} · Sisa{' '}
                  {rupiah(detail.ringkasanRefund?.sisa || 0)}
                </div>
                {detail.pesanan.cancelReason && (
                  <AlertBanner
                    type="info"
                    title="Alasan pembatalan"
                    description={detail.pesanan.cancelReason}
                  />
                )}

                <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.75rem' }}>
                  <strong style={{ color: '#4d372d' }}>Riwayat Refund</strong>
                  {detail.refund.length === 0 && <p>Belum ada catatan refund.</p>}
                  {detail.refund.map((item) => (
                    <div key={item.id} style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                      {tanggal(item.refundedAt)} WIB · {rupiah(item.refundAmount)} · {item.status} ·{' '}
                      {item.metode ? LABEL_METODE[item.metode] || item.metode : 'metode belum diisi'}
                      {item.bukti ? ` · bukti: ${item.bukti}` : ''}
                      {item.approvedById ? ' · disetujui Admin Utama' : ''}
                      {item.reason ? ` · ${item.reason}` : ''}
                    </div>
                  ))}
                </div>

                {detail.riwayat.filter((r) => r.domain === 'REFUND').length > 0 && (
                  <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.75rem' }}>
                    <strong style={{ color: '#4d372d' }}>Riwayat Status Refund</strong>
                    {detail.riwayat
                      .filter((r) => r.domain === 'REFUND')
                      .map((item) => (
                        <div key={item.id} style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                          {tanggal(item.createdAt)} WIB · {item.oldStatus} → {item.newStatus}
                          {item.reason ? ` · ${item.reason}` : ''}
                        </div>
                      ))}
                  </div>
                )}

                <Input
                  as="select"
                  label="Tindakan"
                  value={aksi}
                  onChange={(e) => setAksi(e.target.value)}
                  options={[
                    ...(hakAkses.bisaAjukan
                      ? [{ value: 'AJUKAN', label: 'Ajukan refund baru' }]
                      : []),
                    ...(hakAkses.bisaMemproses
                      ? [
                          { value: 'SETUJUI', label: 'Setujui pengajuan (Admin Utama)' },
                          { value: 'TOLAK', label: 'Tolak pengajuan (Admin Utama)' },
                        ]
                      : []),
                  ]}
                />
                {aksi === 'AJUKAN' && (
                  <>
                    <Input
                      label="Nominal refund (Rupiah)"
                      type="number"
                      min={1}
                      value={nominal}
                      onChange={(e) => setNominal(e.target.value)}
                      helperText={`Sisa yang dapat diajukan: ${rupiah(detail.ringkasanRefund?.sisa || 0)}`}
                    />
                    <Input
                      as="select"
                      label="Metode pengembalian"
                      value={metodeRefund}
                      onChange={(e) => setMetodeRefund(e.target.value)}
                      options={metode.map((m) => ({
                        value: m,
                        label: LABEL_METODE[m] || m,
                      }))}
                    />
                  </>
                )}
                {aksi === 'SETUJUI' &&
                  detail.refund.some((r) => r.status === 'MENUNGGU_PERSETUJUAN') && (
                    <Input
                      as="select"
                      label="Pengajuan yang diproses"
                      value={refundId}
                      onChange={(e) => setRefundId(e.target.value)}
                      options={[
                        { value: '', label: '-- Pengajuan terlama --' },
                        ...detail.refund
                          .filter((r) => r.status === 'MENUNGGU_PERSETUJUAN')
                          .map((r) => ({
                            value: r.id,
                            label: `${rupiah(r.refundAmount)} · ${tanggal(r.refundedAt)} WIB`,
                          })),
                      ]}
                    />
                  )}
                {aksi === 'SETUJUI' && (
                  <>
                    <Input
                      as="select"
                      label="Metode pengembalian yang digunakan"
                      value={metodeRefund}
                      onChange={(e) => setMetodeRefund(e.target.value)}
                      options={metode.map((m) => ({
                        value: m,
                        label: LABEL_METODE[m] || m,
                      }))}
                    />
                    <Input
                      label="Bukti proses (nomor referensi/transaksi)"
                      value={bukti}
                      onChange={(e) => setBukti(e.target.value)}
                    />
                  </>
                )}
                <Input
                  as="textarea"
                  label="Alasan / catatan (wajib, minimal 3 karakter)"
                  rows={2}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                />
                <Input
                  as="textarea"
                  label="Catatan tambahan (opsional)"
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </CardContent>
              <CardFooter style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button onClick={kirimAksi} isLoading={sedangMemproses}>
                  Kirim Proses Refund
                </Button>
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
