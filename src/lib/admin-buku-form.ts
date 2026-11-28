// src/lib/admin-buku-form.ts
// Logika murni untuk panel formulir Pengelolaan Buku (/admin/buku).
// Dipisah dari komponen klien agar perilaku buka/tutup panel bisa diuji unit (GR-10).
// Tidak memuat data modal/laba (GR-03).

export type ModePanelFormBuku = 'TAMBAH' | 'UBAH' | 'TERTUTUP'

export type StatusPanelFormBuku = {
  tampil: boolean
  judul: string
  kode: string
  mode: ModePanelFormBuku
}

/**
 * Tentukan tampilan panel formulir.
 * - Mode Ubah menang jika ada buku yang sedang disunting.
 * - Mode Tambah hanya muncul jika tombol Tambah Buku Baru ditekan.
 * - Defaultnya panel tertutup agar daftar inventaris yang tampil lebih dulu.
 */
export function statusPanelFormBuku(
  bukaFormTambah: boolean,
  menyunting: string | null,
  kodeEdit: string = ''
): StatusPanelFormBuku {
  if (menyunting) {
    return { tampil: true, judul: 'Ubah Buku', kode: kodeEdit, mode: 'UBAH' }
  }
  if (bukaFormTambah) {
    return {
      tampil: true,
      judul: 'Tambah Buku Baru',
      kode: 'Kode dibuat otomatis',
      mode: 'TAMBAH',
    }
  }
  return { tampil: false, judul: '', kode: '', mode: 'TERTUTUP' }
}
