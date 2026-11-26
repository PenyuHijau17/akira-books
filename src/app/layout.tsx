// src/app/layout.tsx
// Layout dasar tema kertas klasik (krem & cokelat)
// 100% Bahasa Indonesia, responsif HP/tablet/desktop
// Menggunakan CSS globals yang sudah didefinisikan

import './globals.css';
import type { Metadata } from 'next';

import Header from '@/components/Header';

// Komponen Footer
const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid">
          <div>
            <h4>Akira Books</h4>
            <p>
              Toko buku bacaan original dan bekas yang mend
            </p>
          </div>
          <div>
            <h4>Navigasi</h4>
            <ul className="list-disc list-inside">
              <li><a href="/katalog">Katalog</a></li>
              <li><a href="/keranjang">Keranjang</a></li>
              <li><a href="/pesanan">Pesanan</a></li>
              <li><a href="/login">Masuk</a></li>
              <li><a href="/register">Daftar</a></li>
            </ul>
          </div>
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
      <body className="min-h-full flex flex-col bg-white text-[--warna-teks-utama]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
};