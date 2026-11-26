// src/app/layout.tsx
// Layout dasar tema kertas klasik (krem & cokelat)
// 100% Bahasa Indonesia, responsif HP/tablet/desktop
// Menggunakan CSS globals yang sudah didefinisikan

import './globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';

import Header from '@/components/Header';

// Komponen Footer
const Footer = () => {
  return (
    <footer className="border-t border-[#5A3D36] bg-[#2C1E1A] text-[#F3ECE1]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-serif text-lg tracking-wide">
              Akira <span className="text-[#D9A679]">Books</span>
            </p>
            <p className="mt-3 max-w-xs text-xs leading-6 text-[#EFE0CE]/80">
              Toko buku independen dengan koleksi original dan bekas yang
              terkurasi. Dipesan online, diambil langsung di booth CFD.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D9A679]">
              Jelajahi
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-[#EFE0CE]/85">
              <li><a href="/katalog" className="hover:text-[#E8C98A]">Katalog Buku</a></li>
              <li><a href="/keranjang" className="hover:text-[#E8C98A]">Keranjang</a></li>
              <li><a href="/pesanan" className="hover:text-[#E8C98A]">Pesanan Saya</a></li>
              <li><a href="/notifikasi" className="hover:text-[#E8C98A]">Notifikasi</a></li>
              <li><a href="/account" className="hover:text-[#E8C98A]">Akun Saya</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D9A679]">
              Informasi Toko
            </h4>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#EFE0CE]/85">
              <li>Pengambilan: Minggu pagi di booth CFD</li>
              <li>Buka sampai pukul 09.00 WIB</li>
              <li>Pembayaran QRIS toko dan bayar langsung di booth</li>
              <li><a href="/login" className="hover:text-[#E8C98A]">Masuk</a> · <a href="/register" className="hover:text-[#E8C98A]">Daftar</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-9 border-t border-white/10 pt-5 text-[11px] text-[#EFE0CE]/60">
          © 2026 Akira Books. Seluruh hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
};

export const metadata: Metadata = {
  title: 'Akira Books',
  description: 'Toko buku bacaan original dan bekas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className="min-h-full"
    >
      <body className="min-h-full flex flex-col bg-[#FAF6F0] text-[#3E2723]">
        {/*
          Header memakai usePathname() untuk menyinkronkan sesi saat rute berubah.
          Pada Cache Components, hook URL perlu Suspense agar halaman dengan
          parameter dinamis tetap bisa diprerender.
        */}
        <Suspense
          fallback={
            <div
              className="h-14 w-full border-b border-[#8D5B4C]/50 bg-[#3E2723]"
              aria-hidden="true"
            />
          }
        >
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
};