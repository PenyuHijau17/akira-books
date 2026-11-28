// src/lib/slugBuku.ts
// Slug publik untuk halaman detail buku (/katalog/[slug]).
// Model Book tidak memiliki kolom slug tersendiri, jadi slug dirumuskan
// secara deterministik dari judul + kode buku. Kode disertakan agar slug
// tetap unik walau ada dua judul yang sama.

function bersihkan(teks: string): string {
  return String(teks ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function slugBuku(judul: string, kode: string): string {
  const dasar = bersihkan(judul)
  const kodeBersih = bersihkan(kode)

  if (!dasar) return kodeBersih || 'buku'
  if (!kodeBersih) return dasar
  return `${dasar}-${kodeBersih}`
}
