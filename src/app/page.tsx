'use client';

// src/app/page.tsx
// Halaman beranda awal — komponen utama untuk route /

import { useEffect, useState } from 'react';
import { formatRupiah, hitungSelisihMenit, cekTenggatLewati } from '@/lib/timezone';
import { can, boleLihatModalLaba } from '@/lib/rbac';

// Import komponen styling (CSS modules sudah konfigurasinya)
import styles from '@/app/globals.css';

// Type untuk fitur utama
type Fitur = {
  title: string;
  description: string;
};

// Data fitur (dapat di-extract ke file terpisah nanti)
const fiturUtama: Fitur[] = [
  {
    title: 'Katalog Buku',
    description: 'Cari dan filter buku berdasarkan judul, penulis, atau kategori',
  },
  {
    title: 'Pemesanan Online',
    description: 'Pesan buku dengan jadwal pengambilan Minggu di booth CFD',
  },
  {
    title: 'Pembayaran QRIS',
    description: 'Transfer QRIS toko, unggah bukti, verifikasi 2 tahap',
  },
  {
    title: 'Jadwal Pengambilan',
    description: 'Ambil buku setiap Minggu pagi di booth (tutup 09.00)',
  },
  {
    title: 'Laporan Keuangan',
    description: 'Lihat laporan penjualan, modal, dan laba (Admin Utama)',
  },
];

// Data untuk pengunjung
const dataPengunjung = {
  nama: 'Pengunjung Biasa',
  dapatAkses: [
    'Lihat katalog',
    'Daftar akun',
    'Login',
  ],
};

// Data untuk pelanggan
const dataPelanggan = {
  nama: 'Pelanggan Terlogin',
  dapatAkses: [
    'Kelola keranjang',
    'Buat pesanan',
    'Lihat pesanan saya',
    'Upload bukti pembayaran',
  ],
};

export default function Page() {
  const [role, setRole] = useState<'guest' | 'customer' | 'admin'>('guest');

  // Cek role dari localStorage atau cookie (simulasi)
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      setRole(savedRole as 'guest' | 'customer' | 'admin');
    }
  }, []);

  return (
    <main>
      // Bagian Hero
      <header className="hero-section">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="hero-title">
            Selamat Datang di <span className="accent-color">Akira Books</span>
          </h1>

          <p className="hero-desc">
            Website operasional toko buku bacaan original dan bekas
          </p>

          <div className="hero-buttons">
            <button
              className="btn btn-primary"
              onClick={() => setRole('customer')}
            >
              Masuk sebagai Pelanggan
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setRole('admin')}
            >
              Masuk sebagai Admin
            </button>
          </div>
        </div>
      </header>

      {/* Bagian Fitur Utama */}
      <section className="fitur-section py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="section-header mb-8">Fitur Utama</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fiturUtama.map(fitur => (
              <div
                key={fitur.title}
                className="fitur-card p-6 rounded border var(--warna-border)"
              >
                <h3 className="fitur-title mb-3">{fitur.title}</h3>
                <p className="fitur-desc">{fitur.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bagian Hak Akses berdasarkan Peran */}
      {role === 'guest' && (
        <section className="hak-akses-section py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="section-header mb-8">Halo Pengunjung!</h2>

            <p className="body mb-6">
              Anda sedang login sebagai pengunjung. Anda dapat mengakses fitur berikut:
            </p>

            <ul className="list-disc list-inside space-y-3 text-left">
              {dataPengunjung.dapatAkses.map(akses => (
                <li key={akses}>{akses}</li>
              ))}
            </ul>

            <p className="mt-4">
              Buat akun atau login untuk mengakses fitur lengkap.
            </p>
          </div>
        </section>
      )}

      {role === 'customer' && (
        <section className="hak-akses-section py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="section-header mb-8">Halo Pelanggan!</h2>

            <p className="body mb-6">
              Anda login sebagai pelanggan. Anda dapat mengakses fitur berikut:
            </p>

            <ul className="list-disc list-inside space-y-3 text-left">
              {dataPelanggan.dapatAkses.map(akses => (
                <li key={akses}>{akses}</li>
              ))}
            </ul>

            <p className="mt-4">
              Anda dapat membuat pesanan, mengelola keranjang, dan mengunggah bukti pembayaran.
            </p>
          </div>
        </section>
      )}

      {role === 'admin' && (
        <section className="hak-akses-section py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="section-header mb-8">Halo Admin!</h2>

            <p className="body mb-6">
              Anda login sebagai admin. Anda dapat mengakses fitur admin lengkap.
            </p>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3>Peran Admin Biasa</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  {['Kelola buku', 'Verifikasi pembayaran', 'Buka tutup toko libur'].map(
                    fitur => <li key={fitur}>{fitur}</li>
                  )}
                  <li style={{ color: 'red' }}>
                    Hanya Admin Utama yang boleh melihat modal & laba
                    <p className="text-xs">
                      GR-03: Isolasi modal & laba
                    </p>
                  </li>
                </ul>
              </div>

              <div>
                <h3>Peran Admin Utama</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  {['Semua fitur', 'Kelola admin', 'Lihat laba historis'].map(
                    fitur => <li key={fitur}>{fitur}</li>
                  )}
                  <li style={{ color: 'green' }}>
                    Bisa lihat modal, laba, koreksi nominal pembayaran
                    <p className="text-xs">
                      Hak lengkap sesuai BR-005
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-6">
              Silakan pilih peran di atas untuk melanjutkan.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}