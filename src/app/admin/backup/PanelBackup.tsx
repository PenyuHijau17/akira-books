'use client'

// src/app/admin/backup/PanelBackup.tsx
// Tahap 13 — panel Admin Utama untuk backup manual & riwayat retensi 30 hari.
// 100% Bahasa Indonesia, tema krem/cokelat, komponen @/components/ui.
// GR-02/GR-03: otorisasi dan penyaringan data dilakukan di server.

import { useCallback, useEffect, useState } from 'react'
import { AlertBanner, Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui'

type Riwayat = {
  id: string
  namaFile: string
  ukuranByte: number
  ukuranTampil: string
  jenis: 'HARIAN' | 'MANUAL'
  status: string
  checksumSha256: string | null
  keterangan: string | null
  dibuatPada: string
  dihapusPada: string | null
  kedaluwarsa: boolean
  dibuatOleh: string | null
}

type Ringkasan = {
  batasHari: number
  total: number
  tersimpan: number
  kedaluwarsa: number
  sudahDihapus: number
  batasWaktuTerdekat: string | null
}

type Konfigurasi = {
  publicKeyTersedia: boolean
  jamWIB: string
  retensiHari: number
}

const LABEL_JENIS: Record<string, string> = { HARIAN: 'Otomatis Harian', MANUAL: 'Manual' }
const LABEL_STATUS: Record<string, string> = {
  BERHASIL: 'Berhasil',
  GAGAL: 'Gagal',
  DIHAPUS: 'Dibersihkan',
}

function waktuWIB(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
}

export default function PanelBackup() {
  const [daftar, setDaftar] = useState<Riwayat[]>([])
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null)
  const [konfigurasi, setKonfigurasi] = useState<Konfigurasi | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState<'otp' | 'backup' | null>(null)
  const [form, setForm] = useState({ konfirmasi: '', password: '', otp: '', keterangan: '' })
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const res = await fetch('/api/admin/backup', { cache: 'no-store' })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal memuat riwayat backup')
      setDaftar((hasil.daftar ?? []) as Riwayat[])
      setRingkasan((hasil.ringkasan ?? null) as Ringkasan | null)
      setKonfigurasi((hasil.konfigurasi ?? null) as Konfigurasi | null)
      setPesan(null)
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal memuat riwayat backup'), sukses: false })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function mintaOtp() {
    setMemproses('otp')
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'minta-otp' }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal mengirim OTP')
      setPesan({ teks: hasil.pesan || 'OTP berhasil dikirim ke terminal server.', sukses: true })
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal mengirim OTP'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  async function jalankanBackup() {
    setMemproses('backup')
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'jalankan', ...form }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menjalankan backup')
      setPesan({
        teks: `Backup berhasil dibuat: ${hasil.backup?.namaFile || '-'}`,
        sukses: true,
      })
      setForm({ konfirmasi: '', password: '', otp: '', keterangan: '' })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menjalankan backup'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Backup &amp; Pemulihan</h1>
          <p style={{ margin: 0, color: '#6b584e' }}>
            Database dan seluruh berkas media dikemas, dikompresi, lalu dienkripsi dengan age.
            Hanya Admin Utama yang dapat memicu backup manual.
          </p>
        </div>
        <Button variant="secondary" onClick={muat} disabled={memuat}>
          Muat Ulang
        </Button>
      </div>

      {pesan && (
        <div style={{ marginTop: '1rem' }}>
          <AlertBanner type={pesan.sukses ? 'success' : 'error'}>{pesan.teks}</AlertBanner>
        </div>
      )}

      {konfigurasi && (
        <Card style={{ marginTop: '1.5rem' }}>
          <CardHeader>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Status Konfigurasi</h2>
          </CardHeader>
          <CardContent style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Badge variant={konfigurasi.publicKeyTersedia ? 'success' : 'danger'}>
              {konfigurasi.publicKeyTersedia
                ? 'Kunci publik age sudah terpasang'
                : 'Kunci publik age belum terpasang'}
            </Badge>
            <Badge variant="neutral">Jam backup harian: {konfigurasi.jamWIB} WIB</Badge>
            <Badge variant="neutral">Retensi: {konfigurasi.retensiHari} hari</Badge>
          </CardContent>
        </Card>
      )}

      {ringkasan && (
        <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Card><CardContent><strong>{ringkasan.tersimpan}</strong><p style={{ margin: 0 }}>Arsip tersimpan</p></CardContent></Card>
          <Card><CardContent><strong>{ringkasan.kedaluwarsa}</strong><p style={{ margin: 0 }}>Menunggu dibersihkan</p></CardContent></Card>
          <Card><CardContent><strong>{ringkasan.sudahDihapus}</strong><p style={{ margin: 0 }}>Sudah dibersihkan</p></CardContent></Card>
          <Card><CardContent><strong>{ringkasan.batasHari} hari</strong><p style={{ margin: 0 }}>Batas retensi</p></CardContent></Card>
        </div>
      )}

      <Card style={{ marginTop: '1.5rem' }}>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Backup Manual</h2>
        </CardHeader>
        <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
          <Input
            label="Ketik YA untuk mengonfirmasi"
            value={form.konfirmasi}
            onChange={(e) => setForm((s) => ({ ...s, konfirmasi: e.target.value }))}
            placeholder="YA"
          />
          <Input
            label="Kata sandi Admin Utama"
            type="password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            placeholder="Kata sandi"
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Input
              label="OTP 6 digit"
              value={form.otp}
              onChange={(e) => setForm((s) => ({ ...s, otp: e.target.value }))}
              placeholder="123456"
            />
            <Button variant="secondary" onClick={mintaOtp} isLoading={memproses === 'otp'} disabled={memproses !== null}>
              Minta OTP
            </Button>
          </div>
          <Input
            label="Keterangan (opsional)"
            value={form.keterangan}
            onChange={(e) => setForm((s) => ({ ...s, keterangan: e.target.value }))}
            placeholder="Misalnya: sebelum pembaruan besar"
          />
          <div>
            <Button onClick={jalankanBackup} isLoading={memproses === 'backup'} disabled={memproses !== null}>
              Jalankan Backup Sekarang
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: '1.5rem' }}>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Riwayat Backup</h2>
        </CardHeader>
        <CardContent>
          {memuat && <p>Sedang memuat riwayat…</p>}
          {!memuat && daftar.length === 0 && <p>Belum ada arsip backup.</p>}
          {!memuat && daftar.length > 0 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {daftar.map((item) => (
                <div
                  key={item.id}
                  style={{ borderBottom: '1px solid #d7ccc8', paddingBottom: '0.75rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{item.namaFile}</strong>
                    <Badge variant={item.status === 'BERHASIL' ? 'success' : item.status === 'GAGAL' ? 'danger' : 'neutral'}>
                      {LABEL_STATUS[item.status] || item.status}
                    </Badge>
                  </div>
                  <p style={{ margin: '0.35rem 0', color: '#6b584e', fontSize: '0.9rem' }}>
                    {LABEL_JENIS[item.jenis] || item.jenis} · {item.ukuranTampil} · {waktuWIB(item.dibuatPada)} WIB · {item.dibuatOleh}
                  </p>
                  {item.keterangan && (
                    <p style={{ margin: '0.25rem 0', color: '#6b584e', fontSize: '0.85rem' }}>
                      {item.keterangan}
                    </p>
                  )}
                  {item.kedaluwarsa && (
                    <Badge variant="warning">Melewati batas retensi</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
