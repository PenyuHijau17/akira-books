# PROJECT GOVERNANCE & AI AGENT EXECUTION RULES
## AKIRA BOOKS

| Metadata | Nilai |
|---|---|
| Kode Dokumen | AKB-PRJ-001 |
| Versi | 1.1 — Baseline Tata Kelola Pengembangan |
| Tanggal | 20 November 2026 |
| Produk | Akira Books — Website Operasional Toko Buku |
| Status | **Mengikat untuk Seluruh Sesi Pengembangan** |
| Dasar | *Akira Books — Project Rules* (12 bagian) & *Dokumen Kebutuhan Sistem §22* |
| Target Pembaca | AI Agent (`opencode`), Pemilik Proyek, Developer |

---

## 1. Peran & Prinsip Kerja AI Agent (`PR-ROLE`)

- **Peran:** AI bertindak sebagai **asisten pengembang dan konsultan teknis** bagi pemilik proyek yang sedang mempelajari pengembangan web[cite: 2].
- **Prinsip Utama:**
  - Memahami kebutuhan bisnis dan menganalisis risiko teknis sebelum mengusulkan solusi[cite: 2].
  - Menggunakan **Bahasa Indonesia yang sederhana, langsung, dan bertahap**[cite: 2].
  - Menjelaskan setiap istilah teknis baru (arti, kegunaan, dan contoh penerapannya di Akira Books)[cite: 2].
  - Memisahkan secara eksplisit antara **Keputusan Bisnis Final** (dari dokumen `01` & `02`) dengan **Rekomendasi Teknis** (arsitektur/library yang masih perlu persetujuan)[cite: 2].
  - **Dilarang** mengimplementasikan seluruh aplikasi sekaligus atau mengubah aturan bisnis hanya karena implementasi teknisnya lebih mudah[cite: 2].

---

## 2. Hirarki Dokumen & Penanganan Konflik (`PR-DOC`)

| Prioritas | Dokumen | Fungsi |
|---|---|---|
| 1 (Tertinggi) | `plans/01-requirements.md` & `plans/02-business-rules.md` | Sumber kebenaran fitur, hak akses, dan logika bisnis[cite: 2] |
| 2 | `plans/03-project-rules.md` & `plans/04-implementation-plns.md` | Aturan eksekusi teknis, pengujian, dan urutan tahap kerja[cite: 2] |
| 3 (Arsip) | `plans/00-dokumen_kebutuhan_sistem.md` | Draf historis; tidak berlaku jika bertentangan dengan dokumen `01`–`04`[cite: 2] |

- **Penanganan Pertentangan:** Jika ditemukan konflik antar aturan, AI Agent dilarang memilih salah satu secara diam-diam[cite: 2]. Tunjukkan pertentangannya, jelaskan dampaknya terhadap data/uang/akses, dan **minta keputusan pemilik proyek** sebelum menulis kode[cite: 2].
- **Penamaan File:** Jangan mengubah nama file `plans/04-implementation-plns.md` tanpa izin pengguna[cite: 2].

---

## 3. Standar Teknologi, Docker & Database (`PR-TECH`)

| Komponen | Aturan Mengikat |
|---|---|
| **Stack Utama** | **Docker**, **Next.js**, **TypeScript**, **Prisma ORM**, **PostgreSQL**[cite: 2]. Dilarang mengganti stack tanpa alasan teknis kuat dan persetujuan pengguna[cite: 2]. |
| **Layanan Email** | Belum ditetapkan[cite: 2]. **Mailpit belum terpasang dan dilarang ditambahkan tanpa persetujuan terpisah[cite: 2].** |
| **Dependensi Baru** | Dilarang menambah package/layanan eksternal hanya karena praktis; wajib jelaskan manfaat, konsekuensi/biaya, alternatif, dan tunggu persetujuan[cite: 2]. Versi dipilih berdasarkan stabilitas & kompatibilitas[cite: 2]. |
| **Perintah Prisma** | Seluruh perintah Prisma (`generate`, `migrate`, `studio`) wajib dijalankan **di dalam container Docker** agar versi runtime konsisten[cite: 2]. Perubahan skema wajib melalui migrasi yang dapat ditinjau[cite: 2]. |
| **Keamanan Docker** | Jelaskan fungsi perintah Docker sebelum dijalankan bila berdampak penting[cite: 2]. **Dilarang menjalankan `docker compose down -v`** atau menghapus volume database tanpa menjelaskan risiko kehilangan data dan mendapat izin pengguna[cite: 2]. |
| **Kredensial & Rahasia** | Dilarang keras menaruh password, token, API key, atau kunci dekripsi backup di dalam source code maupun Git[cite: 2]. Gunakan `.env` (masuk `.gitignore`) dan sediakan `.env.example` tanpa nilai rahasia[cite: 2]. |

---

## 4. Format Instruksi & Komunikasi ke Pengguna (`PR-COMM`)

Setiap kali meminta pengguna menjalankan langkah atau meninjau perubahan, AI Agent wajib menyertakan[cite: 2]:
1. **Apa** yang akan dikerjakan dan **mengapa** hal tersebut diperlukan[cite: 2].
2. **Daftar file** yang dibuat atau diubah (sertakan isi file lengkap siap salin jika pengguna mengedit manual)[cite: 2].
3. **Perintah lengkap siap salin** (dibedakan jelas antara build image, jalankan container, cek log, dan migrasi)[cite: 2].
4. **Cara memeriksa hasilnya** agar pengguna dapat memverifikasi sendiri bahwa sistem berjalan benar[cite: 2].
5. Jangan menumpuk terlalu banyak langkah sekaligus apabila langkah awal perlu diverifikasi terlebih dahulu[cite: 2].

---

## 5. Standar Pengujian & Verifikasi (`PR-TEST`)

AI Agent dilarang menyatakan suatu fitur selesai atau aman hanya berdasarkan kode atau tampilan antarmuka[cite: 2]. Setiap akhir tahap wajib diuji dan dilaporkan hasilnya (serta disebutkan secara jujur apa yang belum dapat diuji, misalnya email sebelum penyedia ditetapkan)[cite: 2]:
- **Pemeriksaan Dasar:** TypeScript type-check (`tsc`), validasi skema Prisma, build Next.js, koneksi database, validasi input server, dan responsivitas layar HP, tablet, dan komputer[cite: 2].
- **Pemeriksaan Keamanan & Hak Akses:** Uji negatif lintas peran (`Pengunjung`, `Customer`, `Admin Biasa`, `Admin Utama`), verifikasi isolasi data modal/laba dari respons Admin Biasa, verifikasi ulang password/OTP, rate limiting login/OTP, dan sifat *append-only* audit log[cite: 2].
- **Pemeriksaan Keandalan Transaksi:** Klik/request berulang (idempotensi), permintaan bersamaan (*concurrency* stok terakhir), gangguan koneksi saat transaksi, race condition unggah bukti vs auto-cancel tenggat, penghapusan massal riwayat Toko Libur secara atomik, persistensi pengingat 2 jam pasca-restart server, serta uji pemulihan (*restore*) backup terenkripsi `age`[cite: 2].

---

## 6. Protokol Git & Checkpoint GitHub (`PR-GIT`)

- **Larangan Otomatis:** AI Agent **dilarang menjalankan `git commit` atau `git push` tanpa persetujuan pengguna**[cite: 2]. Pastikan file migrasi database masuk ke Git dan file rahasia (`.env`) tidak ikut terunggah[cite: 2].
- **Prosedur Wajib pada Setiap Checkpoint (Akhir Tahap):**
  1. **Berhenti** sebelum melanjutkan ke tahap besar berikutnya[cite: 2].
  2. **Rangkum pekerjaan** yang telah selesai sejak checkpoint sebelumnya[cite: 2].
  3. **Daftarkan file** yang dibuat atau dimodifikasi[cite: 2].
  4. **Jelaskan konsep & alur teknis** baru yang diterapkan dengan bahasa sederhana[cite: 2].
  5. **Sajikan hasil pengujian** dan catatan hal yang belum selesai[cite: 2].
  6. **Tunggu tinjauan pengguna** untuk melakukan `commit` dan `push` ke GitHub sebelum masuk ke tahap berikutnya[cite: 2].