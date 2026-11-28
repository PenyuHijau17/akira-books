'use client'

// src/app/admin/buku/AdminBukuKlien.tsx
// Kelola buku untuk Admin Biasa/Utama. GR-02: peran diambil dari sesi server (/api/auth).
// GR-03: costPrice hanya dirender/diproses untuk Admin Utama.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusPanelFormBuku } from '@/lib/admin-buku-form'
import { daftarNamaUnik, rapikanNama, saranKoreksi } from '@/lib/namaBuku'
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  Textarea,
} from '@/components/ui'

type Peran = 'PENGUNGGUNG' | 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'

type Kategori = { id: string; name: string }

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
  const router = useRouter()
  const [peran, setPeran] = useState<Peran | null>(null)
  const [daftar, setDaftar] = useState<Buku[]>([])
  const [kategori, setKategori] = useState<Kategori[]>([])
  const [daftarPenulis, setDaftarPenulis] = useState<string[]>([])
  const [daftarPenerbit, setDaftarPenerbit] = useState<string[]>([])
  const [penulisBaru, setPenulisBaru] = useState('')
  const [penerbitBaru, setPenerbitBaru] = useState('')
  const [form, setForm] = useState<FormBuku>(formKosong)
  const [menyunting, setMenyunting] = useState<string | null>(null)
  // Panel formulir tertutup saat halaman dibuka: daftar inventaris tampil lebih dulu.
  const [bukaFormTambah, setBukaFormTambah] = useState(false)
  const panelFormRef = useRef<HTMLDivElement | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [mengunggah, setMengunggah] = useState(false)
  const [menambahKategori, setMenambahKategori] = useState(false)
  const [kategoriBaru, setKategoriBaru] = useState('')
  const [pesanUnggah, setPesanUnggah] = useState<{ teks: string; sukses: boolean } | null>(null)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const [resAuth, resBuku, resKategori] = await Promise.all([
        fetch('/api/auth', { cache: 'no-store' }),
        fetch('/api/admin/buku', { cache: 'no-store' }),
        fetch('/api/admin/kategori', { cache: 'no-store' }),
      ])
      const auth = await resAuth.json()
      setPeran((auth?.user?.role as Peran) ?? null)
      if (!resBuku.ok) throw new Error('Gagal memuat daftar buku')
      const hasil = await resBuku.json()
      setDaftar((hasil.books ?? []) as Buku[])
      setDaftarPenulis(daftarNamaUnik(hasil.penulis ?? []))
      setDaftarPenerbit(daftarNamaUnik(hasil.penerbit ?? []))
      if (resKategori.ok) {
        const dataKategori = await resKategori.json()
        setKategori((dataKategori?.categories ?? []) as Kategori[])
      }
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
  const panelForm = statusPanelFormBuku(bukaFormTambah, menyunting, form.code)

  /** Gulir halus ke panel formulir setelah React selesai merender perubahan state. */
  function gulirKePanelForm() {
    requestAnimationFrame(() => {
      panelFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  /** Buka formulir tambah dengan field kosong; replace mode Ubah jika sedang aktif. */
  function bukaTambah() {
    // Tombol header bersifat toggle: klik lagi saat panel tambah terbuka menutupnya.
    if (panelForm.mode === 'TAMBAH') {
      tutupPanelForm()
      return
    }
    setMenyunting(null)
    setForm(formKosong)
    setPenulisBaru('')
    setPenerbitBaru('')
    setKategoriBaru('')
    setPesanUnggah(null)
    setPesan(null)
    setBukaFormTambah(true)
    gulirKePanelForm()
  }

  /** Tutup panel dari sudut kanan kartu (tombol Tutup/Batal). */
  function tutupPanelForm() {
    setBukaFormTambah(false)
    setMenyunting(null)
    setForm(formKosong)
    setPenulisBaru('')
    setPenerbitBaru('')
    setKategoriBaru('')
    setPesanUnggah(null)
  }

  // Saran ejaan (lapis 3) muncul saat nama baru sangat mirip dengan nama tersimpan.
  const saranPenulis = saranKoreksi(penulisBaru, daftarPenulis)
  const saranPenerbit = saranKoreksi(penerbitBaru, daftarPenerbit)

  /** Tambah nama baru ke daftar dropdown sekaligus pilih sebagai nilai form. */
  function tambahNama(
    nilaiBaru: string,
    daftar: string[],
    setDaftar: (nilai: string[]) => void,
    setInput: (nilai: string) => void,
    kolom: 'author' | 'publisher'
  ) {
    const nama = rapikanNama(nilaiBaru)
    if (!nama) return
    if (!daftar.some((item) => item.toLocaleLowerCase('id-ID') === nama.toLocaleLowerCase('id-ID'))) {
      setDaftar(daftarNamaUnik([...daftar, nama]))
    }
    setForm((nilai) => ({ ...nilai, [kolom]: nama }))
    setInput('')
  }

  async function tambahKategori() {
    const nama = kategoriBaru.trim()
    if (!nama) return
    setMenambahKategori(true)
    try {
      const res = await fetch('/api/admin/kategori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nama }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menambah kategori')
      await muat()
      setForm((nilai) => ({ ...nilai, categoryId: hasil.category.id }))
      setKategoriBaru('')
      setPesan({ teks: hasil?.message || 'Kategori berhasil ditambahkan.', sukses: true })
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menambah kategori'), sukses: false })
    } finally {
      setMenambahKategori(false)
    }
  }

  async function unggahSampul(berkas: File) {
    setMengunggah(true)
    setPesanUnggah(null)
    try {
      const data = new FormData()
      data.append('file', berkas)
      const res = await fetch('/api/admin/buku/sampul', { method: 'POST', body: data })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal mengunggah sampul')
      setForm((nilai) => ({ ...nilai, imageUrl: hasil.imageUrl }))
      setPesanUnggah({ teks: 'Sampul berhasil diunggah.', sukses: true })
    } catch (error: any) {
      setPesanUnggah({ teks: String(error?.message || 'Gagal mengunggah sampul'), sukses: false })
    } finally {
      setMengunggah(false)
    }
  }

  async function simpan() {
    if (!form.title || !form.author) {
      setPesan({ teks: 'Judul dan penulis wajib diisi.', sukses: false })
      return
    }
    if (!form.categoryId) {
      setPesan({ teks: 'Pilih kategori buku terlebih dahulu.', sukses: false })
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

      // Buku baru langsung terlihat di etalase publik. Edit tetap di halaman ini
      // agar admin bisa menyunting beberapa judul berturut-turut.
      if (!menyunting) {
        router.push('/katalog')
        return
      }

      const teks = hasil?.message || 'Buku berhasil disimpan.'
      setForm(formKosong)
      setMenyunting(null)
      setBukaFormTambah(false)
      setPesanUnggah(null)
      await muat()
      setPesan({ teks, sukses: true })
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
      await muat()
      setPesan({ teks: 'Buku berhasil dinonaktifkan.', sukses: true })
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
      await muat()
      setPesan({ teks: 'Buku berhasil dihapus permanen.', sukses: true })
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menghapus buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  function pilih(buku: Buku) {
    setMenyunting(buku.id)
    setDaftarPenulis((nilai) => daftarNamaUnik([...nilai, buku.author]))
    setDaftarPenerbit((nilai) => daftarNamaUnik([...nilai, buku.publisher]))
    setPenulisBaru('')
    setPenerbitBaru('')
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
    setPesanUnggah(null)
    // Ubah dari tabel langsung membuka panel edit dan menggulir ke atas.
    setBukaFormTambah(false)
    gulirKePanelForm()
  }

  return (
    // Layout root sudah menyediakan <main>; pakai <div> agar tidak ada <main> bersarang.
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8D5B4C]">
            Panel Admin
          </p>
          <h1 className="mt-2 font-serif text-2xl text-[#3E2723] sm:text-3xl">
            Pengelolaan Buku
          </h1>
          <p className="mt-1 text-sm text-[#6B4F43]">
            Kelola judul, kategori, stok, dan sampul. Data modal hanya tersedia untuk Admin Utama.
          </p>
        </div>
        <Button onClick={bukaTambah} disabled={memproses}>
          + Tambah Buku Baru
        </Button>
      </div>

      {pesan && (
        <div className="mb-6">
          <AlertBanner type={pesan.sukses ? 'success' : 'error'}>{pesan.teks}</AlertBanner>
        </div>
      )}

      {panelForm.tampil && (
      <Card
        ref={panelFormRef}
        className="mb-6 scroll-mt-6 rounded-xl border border-[#E6DCD0] bg-[#FFFDF9] p-6 shadow-sm"
      >
        <CardHeader>
          <div className="flex w-full flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-lg text-[#3E2723]">
                  {panelForm.judul}
                </h2>
                <Badge variant="neutral">{panelForm.kode}</Badge>
              </div>
              <p className="mt-1 text-xs text-[#6B4F43]">
                Kode buku (BK-0001, BK-0002, …) dibuat sistem dan tidak dapat diubah.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={tutupPanelForm}
              disabled={memproses}
              aria-label="Tutup formulir buku"
            >
              Tutup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Tahun Terbit" type="number" value={form.publishYear} onChange={(e) => setForm({ ...form, publishYear: Number(e.target.value) })} />
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
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Select
                label="Penulis"
                options={[
                  { value: '', label: 'Pilih penulis…' },
                  ...daftarPenulis.map((nama) => ({ value: nama, label: nama })),
                ]}
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  <Input
                    label="Penulis baru (opsional)"
                    placeholder="Misal: Tere Liye"
                    value={penulisBaru}
                    onChange={(e) => setPenulisBaru(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  disabled={!penulisBaru.trim() || memproses}
                  onClick={() => tambahNama(
                    penulisBaru, daftarPenulis, setDaftarPenulis, setPenulisBaru, 'author'
                  )}
                >
                  Tambah
                </Button>
              </div>
              {saranPenulis && (
                <div className="rounded-lg border border-[#E8CFA5] bg-[#F7E9D2] px-3 py-2 text-xs text-[#8A5B22]">
                  Apakah maksud Anda <strong>{saranPenulis}</strong>?{' '}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2 hover:text-[#6B4216]"
                    onClick={() => {
                      setForm((nilai) => ({ ...nilai, author: saranPenulis }))
                      setPenulisBaru('')
                    }}
                  >
                    Gunakan saran
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Select
                label="Penerbit"
                options={[
                  { value: '', label: 'Pilih penerbit…' },
                  ...daftarPenerbit.map((nama) => ({ value: nama, label: nama })),
                ]}
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
              />
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  <Input
                    label="Penerbit baru (opsional)"
                    placeholder="Misal: Gramedia Pustaka Utama"
                    value={penerbitBaru}
                    onChange={(e) => setPenerbitBaru(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  disabled={!penerbitBaru.trim() || memproses}
                  onClick={() => tambahNama(
                    penerbitBaru, daftarPenerbit, setDaftarPenerbit, setPenerbitBaru, 'publisher'
                  )}
                >
                  Tambah
                </Button>
              </div>
              {saranPenerbit && (
                <div className="rounded-lg border border-[#E8CFA5] bg-[#F7E9D2] px-3 py-2 text-xs text-[#8A5B22]">
                  Apakah maksud Anda <strong>{saranPenerbit}</strong>?{' '}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2 hover:text-[#6B4216]"
                    onClick={() => {
                      setForm((nilai) => ({ ...nilai, publisher: saranPenerbit }))
                      setPenerbitBaru('')
                    }}
                  >
                    Gunakan saran
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Select
              label="Kategori"
              options={[
                { value: '', label: 'Pilih kategori…' },
                ...kategori.map((item) => ({ value: item.id, label: item.name })),
              ]}
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            />
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <Input
                  label="Kategori baru (opsional)"
                  placeholder="Misal: Sejarah"
                  value={kategoriBaru}
                  onChange={(e) => setKategoriBaru(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={tambahKategori}
                isLoading={menambahKategori}
                disabled={!kategoriBaru.trim() || memproses}
              >
                Tambah
              </Button>
            </div>
          </div>

          <div className="mt-5 border-t border-[#E6DCD0] pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B4F43]">
              Sampul Buku
            </p>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6B4F43]">
                    Unggah dari perangkat
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={mengunggah || memproses}
                    onChange={(e) => {
                      const berkas = e.target.files?.[0]
                      if (berkas) unggahSampul(berkas)
                    }}
                    className="block w-full cursor-pointer rounded-lg border border-[#D9C9BA] bg-[#FFFDF9] px-3 py-2 text-xs text-[#6B4F43] shadow-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#4A2C2A] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#FAF6F0] hover:file:bg-[#5E3935]"
                  />
                  <p className="mt-1 text-xs text-[#8D5B4C]">
                    JPEG, PNG, atau WebP · maksimal 5 MB.
                  </p>
                </div>
                <Input
                  label="Atau tempel URL sampul"
                  placeholder="/api/media/sampul/… atau https://…"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
                {mengunggah && (
                  <p className="text-xs text-[#8D5B4C]">Mengunggah sampul…</p>
                )}
                {pesanUnggah && (
                  <p className={`text-xs ${pesanUnggah.sukses ? 'text-[#3F6B45]' : 'text-[#9A4A34]'}`}>
                    {pesanUnggah.teks}
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[#6B4F43]">Pratinjau</p>
                <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-[#E6DCD0] bg-[#EFE4D2]">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="Pratinjau sampul buku"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-[#8D5B4C]">
                      Belum ada sampul
                    </div>
                  )}
                </div>
              </div>
            </div>
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
                onClick={tutupPanelForm}
                disabled={memproses}
              >
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

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
              Belum ada buku. Gunakan tombol + Tambah Buku Baru di atas untuk menambah judul pertama.
            </p>
          )}
          {!memuat && daftar.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E6DCD0] bg-[#F3ECE1]">
                    {['Kode', 'Judul', 'Kategori', 'Harga Jual', 'Stok', 'Status', 'Aksi'].map((header) => (
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
                      <td className="px-3 py-3">
                        <Badge variant="neutral">{buku.code}</Badge>
                      </td>
                      <td className="px-3 py-3 font-medium text-[#3E2723]">{buku.title}</td>
                      <td className="px-3 py-3 text-[#6B4F43]">
                        {kategori.find((item) => item.id === buku.categoryId)?.name ?? '—'}
                      </td>
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
