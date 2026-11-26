'use client'

// src/app/admin/jadwal/page.tsx
// Antrean jadwal pengambilan: persetujuan, usulan admin, no-show, gabung jadwal, dan Selesai.
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
import { labelStatusBukti, labelStatusJadwal, labelStatusPesanan } from '@/lib/pesanan'

type Antrean = {
  id: string
  orderNumber: string
  customerId: string
  orderStatus: string
  paymentProofStatus: string
  pickupStatus: string
  pickupSundayDate: string
  pickupGroupId: string | null
  noShowAt: string | null
  noShowHoldDeadline: string | null
  noShowReason: string | null
  noShowCount: number
  completedAt: string | null
  stockSold: boolean
  totalAmount: number
  usulan: { id: string; jenis: string; tanggalBaru: string; alasan: string | null } | null
}

type Usulan = {
  id: string
  jenis: string
  pengajuId: string
  peranPengaju: string
  tanggalLama: string
  tanggalBaru: string
  status: string
  statusSebelumnya: string | null
  alasan: string | null
  alasanKeputusan: string | null
  createdAt: string
}

type Detail = {
  pesanan: Antrean & { completedById: string | null }
  riwayat: Usulan[]
  grup: Array<{ id: string; orderNumber: string; orderStatus: string; paymentProofStatus: string; pickupStatus: string }>
  statusJadwal: Array<{ id: string; oldStatus: string; newStatus: string; reason: string | null; createdAt: string }>
  usulanTertunda: Usulan | null
  hakAkses: { bisaSelesaikan: boolean; bisaBatalkan: boolean }
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

const tanggalMinggu = (nilai: string) =>
  new Date(nilai).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

function daftarAksi(pickupStatus: string, adaGrup: boolean): Array<{ value: string; label: string }> {
  const aksi: Array<{ value: string; label: string }> = [
    { value: 'SELESAIKAN', label: 'Selesaikan (buku diserahkan fisik)' },
  ]
  if (pickupStatus === 'MENUNGGU_KONFIRMASI') {
    aksi.push(
      { value: 'SETUJU_TANGGAL', label: 'Setujui tanggal customer' },
      { value: 'TOLAK_TANGGAL', label: 'Tolak tanggal customer (wajib alasan)' }
    )
  }
  if (pickupStatus === 'PERUBAHAN_MENUNGGU_PERSETUJUAN') {
    aksi.push(
      { value: 'SETUJU_PERUBAHAN', label: 'Setujui perubahan jadwal customer' },
      { value: 'TOLAK_PERUBAHAN', label: 'Tolak perubahan jadwal customer (wajib alasan)' }
    )
  }
  if (['DISETUJUI', 'TIDAK_HADIR', 'PERLU_TANGGAL_BARU'].includes(pickupStatus)) {
    aksi.push({ value: 'USUL_UBAH', label: 'Usulkan tanggal pengganti ke customer' })
  }
  if (pickupStatus === 'DISETUJUI') {
    aksi.push({ value: 'TANDAI_NO_SHOW', label: 'Tandai no-show setelah pukul 09.00 WIB' })
  }
  if (pickupStatus === 'TIDAK_HADIR') {
    aksi.push({
      value: 'PERPANJANG_TENGGAT_TAHAN',
      label: 'Perpanjang penahanan buku (wajib alasan & tenggat)',
    })
  }
  aksi.push({ value: 'GABUNG', label: 'Gabungkan jadwal beberapa pesanan' })
  if (adaGrup) aksi.push({ value: 'LEPAS_GABUNGAN', label: 'Lepaskan dari jadwal gabungan' })
  return aksi
}

export default function HalamanJadwalAdmin() {
  const [daftar, setDaftar] = useState<Antrean[]>([])
  const [ringkasan, setRingkasan] = useState<Record<string, number>>({})
  const [daftarMinggu, setDaftarMinggu] = useState<string[]>([])
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [aksi, setAksi] = useState('')
  const [alasan, setAlasan] = useState('')
  const [tanggalUsulan, setTanggalUsulan] = useState('')
  const [tenggatTahan, setTenggatTahan] = useState('')
  const [orderIdsText, setOrderIdsText] = useState('')
  const [pesan, setPesan] = useState<{ jenis: 'success' | 'error' | 'info'; teks: string } | null>(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const [sedangMemproses, setSedangMemproses] = useState(false)

  const muatDaftar = useCallback(async () => {
    setSedangMemuat(true)
    try {
      const res = await fetch('/api/admin/jadwal', { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat antrean jadwal')
      setDaftar(isi.daftar || [])
      setRingkasan(isi.ringkasan || {})
      setDaftarMinggu(isi.daftarMinggu || [])
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat antrean jadwal' })
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
      const res = await fetch(`/api/admin/jadwal/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat detail jadwal')
      setDetail(isi as Detail)
      setTerpilih(id)
      setAksi('')
      setAlasan('')
      setTanggalUsulan(isi?.pesanan?.pickupSundayDate ? isi.pesanan.pickupSundayDate.slice(0, 10) : '')
      setTenggatTahan('')
      setOrderIdsText(
        (isi?.grup || []).filter((g: any) => g.id !== id).map((g: any) => g.id).join(', ')
      )
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat detail jadwal' })
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
      ['TOLAK_TANGGAL', 'TOLAK_PERUBAHAN', 'USUL_UBAH', 'PERPANJANG_TENGGAT_TAHAN'].includes(aksi) &&
      alasan.trim().length < 3
    ) {
      setPesan({ jenis: 'error', teks: 'Alasan wajib diisi minimal 3 karakter' })
      return
    }
    if (['USUL_UBAH', 'GABUNG'].includes(aksi) && !tanggalUsulan) {
      setPesan({ jenis: 'error', teks: 'Pilih tanggal Minggu pengganti terlebih dahulu' })
      return
    }
    if (aksi === 'PERPANJANG_TENGGAT_TAHAN' && !tenggatTahan) {
      setPesan({ jenis: 'error', teks: 'Tenggat penahanan baru wajib diisi' })
      return
    }

    setSedangMemproses(true)
    setPesan(null)
    try {
      const body: Record<string, unknown> = { action: aksi, alasan }
      if (['USUL_UBAH', 'GABUNG'].includes(aksi)) {
        body.pickupSundayDate = tanggalUsulan
      }
      if (aksi === 'PERPANJANG_TENGGAT_TAHAN') {
        body.tenggatBaru = new Date(tenggatTahan).toISOString()
      }
      if (aksi === 'GABUNG') {
        const tambahan = orderIdsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        body.orderIds = [...new Set([terpilih, ...tambahan])]
      }
      const res = await fetch(`/api/admin/jadwal/${encodeURIComponent(terpilih)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Tindakan jadwal gagal')
      setPesan({ jenis: 'success', teks: isi.pesan || 'Keputusan jadwal berhasil dicatat.' })
      setAlasan('')
      await Promise.all([muatDaftar(), muatDetail(terpilih)])
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Tindakan jadwal gagal' })
    } finally {
      setSedangMemproses(false)
    }
  }

  const opsiAksi = detail ? daftarAksi(detail.pesanan.pickupStatus, !!detail.pesanan.pickupGroupId) : []

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Jadwal Pengambilan</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Pengambilan hanya pada hari Minggu, tutup pukul 09.00 WIB. Keputusan dicatat di audit
        administratif yang tidak dapat diubah.
      </p>

      {pesan && <AlertBanner type={pesan.jenis} title="Informasi" description={pesan.teks} />}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Badge variant="info">Menunggu konfirmasi: {ringkasan.menungguKonfirmasi || 0}</Badge>
        <Badge variant="warning">Perubahan: {ringkasan.perubahan || 0}</Badge>
        <Badge variant="danger">Tidak hadir: {ringkasan.tidakHadir || 0}</Badge>
        <Badge variant="success">Siap diselesaikan: {ringkasan.siapSelesai || 0}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem' }}>
        <Card>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>Antrean Jadwal</h2>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '0.6rem' }}>
            {sedangMemuat ? (
              <p>Sedang memuat antrean...</p>
            ) : daftar.length === 0 ? (
              <p>Tidak ada jadwal yang menunggu keputusan.</p>
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
                    {tanggalMinggu(item.pickupSundayDate)} · {rupiah(item.totalAmount)}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {labelStatusJadwal(item.pickupStatus)} · {labelStatusBukti(item.paymentProofStatus)}
                  </div>
                  {item.noShowHoldDeadline && (
                    <div style={{ fontSize: '0.85rem', color: '#7b2d26' }}>
                      Ditahan sampai {tanggal(item.noShowHoldDeadline)} WIB
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
              <p>Pilih pesanan di antrean untuk melihat detail jadwal.</p>
            </CardContent>
          ) : (
            <>
              <CardContent style={{ display: 'grid', gap: '0.8rem' }}>
                <div>
                  <strong>{detail.pesanan.orderNumber}</strong> ·{' '}
                  {labelStatusPesanan(detail.pesanan.orderStatus)}
                </div>
                <div>Jadwal: {tanggalMinggu(detail.pesanan.pickupSundayDate)} · 09.00 WIB</div>
                <div>
                  Status jadwal: <Badge variant="warning">{labelStatusJadwal(detail.pesanan.pickupStatus)}</Badge>
                </div>
                <div>
                  Pembayaran: {labelStatusBukti(detail.pesanan.paymentProofStatus)} ·{' '}
                  {rupiah(detail.pesanan.totalAmount)}
                </div>
                {detail.pesanan.noShowAt && (
                  <AlertBanner
                    type="warning"
                    title="No-show tercatat"
                    description={
                      (detail.pesanan.noShowReason || 'Customer tidak hadir sebelum pukul 09.00 WIB.') +
                      (detail.pesanan.noShowHoldDeadline
                        ? ` Tenggat penahanan: ${tanggal(detail.pesanan.noShowHoldDeadline)} WIB.`
                        : '')
                    }
                  />
                )}
                {detail.usulanTertunda && (
                  <AlertBanner
                    type="info"
                    title="Usulan menunggu keputusan"
                    description={
                      `${detail.usulanTertunda.jenis === 'USULAN_ADMIN' ? 'Usulan admin' : 'Pengajuan customer'}: ` +
                      `${tanggalMinggu(detail.usulanTertunda.tanggalBaru)}. ` +
                      `Alasan: ${detail.usulanTertunda.alasan || '-'}`
                    }
                  />
                )}
                {detail.grup.length > 1 && (
                  <div style={{ color: '#5d4037' }}>
                    Jadwal gabungan: {detail.grup.map((g) => g.orderNumber).join(', ')}
                  </div>
                )}

                <Input
                  as="select"
                  label="Tindakan"
                  value={aksi}
                  onChange={(e) => setAksi(e.target.value)}
                  options={[{ value: '', label: '-- Pilih tindakan --' }, ...opsiAksi]}
                />
                <Input
                  as="textarea"
                  label="Alasan (wajib untuk penolakan, usulan, dan perpanjangan penahanan)"
                  rows={2}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                />
                {['USUL_UBAH', 'GABUNG'].includes(aksi) && (
                  <Input
                    as="select"
                    label="Tanggal Minggu pengganti"
                    value={tanggalUsulan}
                    onChange={(e) => setTanggalUsulan(e.target.value)}
                    options={[
                      { value: '', label: '-- Pilih tanggal --' },
                      ...daftarMinggu.map((m) => ({ value: m, label: tanggalMinggu(m) })),
                    ]}
                  />
                )}
                {aksi === 'PERPANJANG_TENGGAT_TAHAN' && (
                  <Input
                    label="Tenggat penahanan baru"
                    type="datetime-local"
                    value={tenggatTahan}
                    onChange={(e) => setTenggatTahan(e.target.value)}
                  />
                )}
                {aksi === 'GABUNG' && (
                  <Input
                    label="ID pesanan lain milik customer yang sama (pisahkan dengan koma)"
                    value={orderIdsText}
                    onChange={(e) => setOrderIdsText(e.target.value)}
                  />
                )}

                <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.75rem' }}>
                  <strong style={{ color: '#4d372d' }}>Riwayat Pengajuan Jadwal</strong>
                  {detail.riwayat.length === 0 && <p>Belum ada pengajuan perubahan.</p>}
                  {detail.riwayat.map((item) => (
                    <div key={item.id} style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                      {tanggal(item.createdAt)} WIB · {item.jenis} · {item.status} ·{' '}
                      {tanggalMinggu(item.tanggalBaru)}
                      {item.alasan ? ` · ${item.alasan}` : ''}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button onClick={kirimKeputusan} isLoading={sedangMemproses}>
                  Kirim Keputusan
                </Button>
                <Button variant="secondary" onClick={() => muatDaftar()}>
                  Muat Ulang Antrean
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
