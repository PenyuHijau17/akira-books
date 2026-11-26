'use client'

// src/app/admin/notifikasi/page.tsx
// Panel Admin Utama untuk eskalasi kegagalan pengiriman outbox (Tahap 12).
// GR-02: akses divalidasi server. GR-06: tindak lanjut dicatat di audit append-only.
// 100% Bahasa Indonesia; komponen @/components/ui; tema krem/cokelat.

import { useCallback, useEffect, useState } from 'react'
import { AlertBanner, Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui'

type OutboxGagal = {
  id: string
  deliveryKey: string
  kanal: string
  kategori: string
  message: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  escalationNotified: boolean
  createdAt: string
}

const LABEL_KANAL: Record<string, string> = {
  IN_APP: 'Dalam Aplikasi',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
}

export default function HalamanPanelNotifikasi() {
  const [daftar, setDaftar] = useState<OutboxGagal[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const res = await fetch('/api/admin/notifikasi/outbox', { cache: 'no-store' })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal memuat panel notifikasi')
      setDaftar((hasil.daftar ?? []) as OutboxGagal[])
      setPesan(null)
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal memuat panel notifikasi'), sukses: false })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function tindakLanjut(id: string) {
    const alasan = String(catatan[id] || '').trim()
    if (!alasan) {
      setPesan({ teks: 'Catatan tindak lanjut wajib diisi.', sukses: false })
      return
    }
    setMemproses(id)
    try {
      const res = await fetch('/api/admin/notifikasi/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tindak-lanjut', id, catatan: alasan }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menindaklanjuti pengiriman')
      setPesan({ teks: 'Kegagalan pengiriman ditandai sudah ditindaklanjuti.', sukses: true })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menindaklanjuti pengiriman'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Peringatan Pengiriman Notifikasi</h1>
          <p style={{ margin: 0, color: '#6b584e' }}>
            Daftar pengiriman yang gagal setelah retry bertahap maksimal. Hanya Admin Utama yang dapat menindaklanjuti.
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

      {memuat && <p style={{ marginTop: '1.5rem' }}>Sedang memuat daftar pengiriman gagal…</p>}

      {!memuat && daftar.length === 0 && (
        <Card style={{ marginTop: '1.5rem' }}>
          <CardContent>
            <p style={{ margin: 0 }}>Tidak ada pengiriman yang gagal berulang.</p>
          </CardContent>
        </Card>
      )}

      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
        {daftar.map((item) => (
          <Card key={item.id}>
            <CardHeader
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                  {LABEL_KANAL[item.kanal] || item.kanal} — {item.kategori}
                </h2>
                <small style={{ color: '#7a685d' }}>
                  {new Date(item.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                </small>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Badge variant="danger">
                  Gagal {item.attempts}/{item.maxAttempts} percobaan
                </Badge>
                <Badge variant={item.escalationNotified ? 'warning' : 'neutral'}>
                  {item.escalationNotified ? 'Sudah dieskalasi' : 'Belum dieskalasi'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p style={{ margin: '0 0 0.5rem' }}>{item.message}</p>
              <p style={{ margin: '0 0 0.75rem', color: '#8b3a3a', fontSize: '0.875rem' }}>
                Kesalahan terakhir: {item.lastError || 'Tidak ada detail'}
              </p>
              <small style={{ color: '#7a685d', display: 'block', marginBottom: '0.75rem' }}>
                Kunci pengiriman: {item.deliveryKey}
              </small>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Input
                  value={catatan[item.id] || ''}
                  onChange={(e) => setCatatan((s) => ({ ...s, [item.id]: e.target.value }))}
                  placeholder="Catatan tindak lanjut (wajib)"
                  aria-label="Catatan tindak lanjut"
                />
                <Button
                  variant="primary"
                  onClick={() => tindakLanjut(item.id)}
                  disabled={memproses === item.id}
                  isLoading={memproses === item.id}
                >
                  Tandai Ditindaklanjuti
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
