<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AKIRA BOOKS — PANDUAN UTAMA AGEN PENGEMBANGAN

Sebelum menulis, mengubah, atau menghapus kode apa pun, Anda WAJIB membaca dan mematuhi seluruh dokumen spesifikasi di dalam folder `plans/`:
- `plans/00-dokumen-kebutuhan-sistem.md` (atau sesuai nama file dokumen kebutuhan utama)
- `plans/01-requirements.md`
- `plans/02-business-rules.md`
- `plans/03-project-rules.md`
- `plans/04-implementation-plns.md`

## Aturan Wajib Proyek
1. **Model Stok & Buku:** Buku dikelola berdasarkan judul gabungan dengan kuantitas stok total numerik (`integer >= 0`) dan modal per unit buku. Sistem TIDAK mencatat kondisi fisik buku maupun identitas per eksemplar.
2. **Pemisahan Status:** Status pesanan (`Menunggu Pembayaran`, `Sudah Dibayar`, `Menunggu Diambil`, `Selesai`, `Dibatalkan`), status jadwal pengambilan, dan status bukti pembayaran dikelola secara terpisah.
3. **Keamanan & Hak Akses:** Penegakan hak akses (Pengunjung, Customer, Admin Biasa, Admin Utama) wajib divalidasi di sisi server. Admin Biasa dilarang keras mengakses laporan keuangan maupun melihat/mengubah modal buku.
4. **Konkurensi Stok:** Pembuatan pesanan dan pengurangan/penahanan stok wajib menggunakan transaksi atomik dan penguncian baris (*row-level locking*) di PostgreSQL agar stok tidak pernah minus atau ganda.
5. **Bahasa Antarmuka:** Seluruh teks antarmuka pengguna (menu, tombol, status, notifikasi, pesan error) wajib menggunakan Bahasa Indonesia.
6. **Alur Kerja:** Kerjakan secara bertahap sesuai urutan di rencana implementasi. Jangan lanjut ke tahap berikutnya sebelum tahap saat ini selesai dan terverifikasi.