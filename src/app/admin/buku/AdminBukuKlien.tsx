'use client'

// src/app/admin/buku/AdminBukuKlien.tsx
// Kelola buku untuk Admin Biasa/Utama. GR-02: peran diambil dari sesi server (/api/auth),
// bukan dari query string. GR-03: costPrice hanya dirender untuk Admin Utama.

import { useCallback, useEffect, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Textarea,
} from '@/components/ui'

type Peran = 'PENGUNGGUNG' | 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'

type Buku = {
  id: string
  code: string
  title: string
  author: string
  publisher: string
  publishYear: number
  imageUrl: string | null
  description: string | null
  sellingPrice: number
  costPrice?: number
  stockTotal: number
  status: string
  categoryId: string
}

type FormBuku = {
  code: string
  title: string
  author: string
  publisher: string
  publishYear: number
  imageUrl: string
  description: string
  sellingPrice: number
  costPrice: number
  stockTotal: number
  categoryId: string
}

const formKosong: FormBuku = {
  code: '',
  title: '',
  author: '',
  publisher: '',
  publishYear: 2024,
  imageUrl: '',
  description: '',
  sellingPrice: 0,
  costPrice: 0,
  stockTotal: 0,
  categoryId: '',
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai || 0)

function varianStatus(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'TERSEDIA') return 'success'
  if (status === 'NONAKTIF') return 'danger'
  return 'neutral'
}

export default function AdminBukuKlien() {
  const [peran, setPeran] = useState<Peran | null>(null)
  const [daftar, setDaftar] = useState<Buku[]>([])
  const [form, setForm] = useState<FormBuku>(formKosong)
  const [menyunting, setMenyunting] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const [resAuth, resBuku] = await Promise.all([
        fetch('/api/auth', { cache: 'no-store' }),
        fetch('/api/admin/buku', { cache: 'no-store' }),
      ])
      const auth = await resAuth.json()
      setPeran((auth?.user?.role as Peran) ?? null)
      if (!resBuku.ok) throw new Error('Gagal memuat daftar buku')
      const hasil = await resBuku.json()
      setDaftar((hasil.books ?? []) as Buku[])
      setPesan(null)
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal memuat buku'), sukses: false })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const adalahAdminUtama = peran === 'ADMIN_UTAMA'

  async function simpan() {
    if (!form.code || !form.title || !form.author) {
      setPesan({ teks: 'Kode, judul, dan penulis wajib diisi.', sukses: false })
      return
    }
    setMemproses(true)
    try {
      const payload = { ...form }
      // GR-03: Admin Biasa tidak pernah mengirim atau melihat data modal.
      if (!adalahAdminUtama) delete (payload as Partial<FormBuku>).costPrice
      const res = await fetch(menyunting ? `/api/admin/buku/${menyunting}` : '/api/admin/buku', {
        method: menyunting ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menyimpan buku')
      setPesan({ teks: 'Buku berhasil disimpan.', sukses: true })
      setForm(formKosong)
      setMenyunting(null)
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menyimpan buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  async function nonaktifkan(buku: Buku) {
    setMemproses(true)
    try {
      const res = await fetch(`/api/admin/buku/${buku.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanyaNonaktifkan: true, alasan: 'Dinonaktifkan dari panel admin' }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menonaktifkan buku')
      setPesan({ teks: 'Buku berhasil dinonaktifkan.', sukses: true })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menonaktifkan buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  async function hapusPermanen(buku: Buku) {
    if (!window.confirm(`Yakin menghapus permanen buku "${buku.title}"?`)) return
    setMemproses(true)
    try {
      const res = await fetch(`/api/admin/buku/${buku.id}`, { method: 'DELETE' })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menghapus buku')
      setPesan({ teks: 'Buku berhasil dihapus permanen.', sukses: true })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menghapus buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  function pilih(buku: Buku) {
    setMenyunting(buku.id)
    setForm({
      code: buku.code,
      title: buku.title,
      author: buku.author,
      publisher: buku.publisher || '',
      publishYear: buku.publishYear,
      imageUrl: buku.imageUrl || '',
      description: buku.description || '',
      sellingPrice: buku.sellingPrice,
      costPrice: buku.costPrice ?? 0,
      stockTotal: buku.stockTotal,
      categoryId: buku.categoryId || '',
    })
  }

  return (
    // Layout root sudah menyediakan <main>; pakai <div> agar tidak ada
    // <main> bersarang yang memicu peringatan DOM nesting di dev overlay.
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8D5B4C]">
          Panel Admin
        </p>
        <h1 className="mt-2 font-serif text-2xl text-[#3E2723] sm:text-3xl">
          Pengelolaan Buku
        </h1>
        <p className="mt-1 text-sm text-[#6B4F43]">
          Kelola judul, stok, dan harga jual. Data modal hanya tersedia untuk Admin Utama.
        </p>
      </div>

      {pesan && (
        <div className="mb-6">
          <AlertBanner type={pesan.sukses ? 'success' : 'error'}>
            {pesan.teks}
          </AlertBanner>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div>
            <h2 className="font-serif text-lg text-[#3E2723]">
              {menyunting ? 'Ubah Buku' : 'Tambah Buku Baru'}
            </h2>
            <p className="mt-1 text-xs text-[#6B4F43]">
              Isi data buku lalu simpan. Kolom dengan tanda wajib diisi.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Kode Buku" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Penulis" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <Input label="Penerbit" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            <Input label="Tahun Terbit" type="number" value={form.publishYear} onChange={(e) => setForm({ ...form, publishYear: Number(e.target.value) })} />
            <Input label="Kategori ID" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
            <Input label="Harga Jual" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            {adalahAdminUtama && (
              <Input
                label="Harga Modal (khusus Admin Utama)"
                type="number"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
              />
            )}
            <Input label="Stok Total" type="number" value={form.stockTotal} onChange={(e) => setForm({ ...form, stockTotal: Number(e.target.value) })} />
            <Input label="URL Sampul" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>

          <div className="mt-4">
            <Textarea
              label="Deskripsi"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#E6DCD0] pt-5">
            <Button onClick={simpan} isLoading={memproses}>Simpan Buku</Button>
            {menyunting && (
              <Button
                variant="secondary"
                onClick={() => { setMenyunting(null); setForm(formKosong) }}
                disabled={memproses}
              >
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-[#3E2723]">Daftar Buku</h2>
              <p className="mt-1 text-xs text-[#6B4F43]">
                {memuat ? 'Memuat judul…' : `${daftar.length} judul tercatat`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {memuat && (
            <p className="rounded-xl border border-dashed border-[#D9C9BA] bg-[#F3ECE1] p-6 text-center text-sm text-[#6B4F43]">
              Sedang memuat daftar buku…
            </p>
          )}
          {!memuat && daftar.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#D9C9BA] bg-[#F3ECE1] p-6 text-center text-sm text-[#6B4F43]">
              Belum ada buku. Tambahkan judul pertama memakai formulir di atas.
            </p>
          )}
          {!memuat && daftar.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E6DCD0] bg-[#F3ECE1]">
                    {['Kode', 'Judul', 'Harga Jual', 'Stok', 'Status', 'Aksi'].map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B4F43]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((buku) => (
                    <tr
                      key={buku.id}
                      className="border-b border-[#E6DCD0] transition-colors last:border-0 hover:bg-[#FAF6F0]"
                    >
                      <td className="px-3 py-3 font-medium text-[#3E2723]">{buku.code}</td>
                      <td className="px-3 py-3 text-[#3E2723]">{buku.title}</td>
                      <td className="px-3 py-3 text-[#6B4F43]">{rupiah(buku.sellingPrice)}</td>
                      <td className="px-3 py-3 text-[#6B4F43]">{buku.stockTotal}</td>
                      <td className="px-3 py-3">
                        <Badge variant={varianStatus(buku.status)}>{buku.status}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => pilih(buku)} disabled={memproses}>
                            Ubah
                          </Button>
                          {buku.status !== 'NONAKTIF' && (
                            <Button variant="secondary" onClick={() => nonaktifkan(buku)} disabled={memproses}>
                              Nonaktifkan
                            </Button>
                          )}
                          {adalahAdminUtama && (
                            <Button variant="danger" onClick={() => hapusPermanen(buku)} disabled={memproses}>
                              Hapus
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
