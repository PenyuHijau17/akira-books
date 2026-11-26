// src/middleware.ts
// Middleware otorisasi server-side untuk Next.js App Router
// GR-02, BR-002: Semua hak akses divalidasi di server, bukan hanya menyembunyikan tombol UI
//
// Catatan: middleware ini hanya bertugas mengarahkan pengunjung yang belum login.
// Otorisasi sebenarnya (peran, isolasi data) tetap divalidasi di setiap API route.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fungsi helper cek butuh login
function butuhLogin(path: string): boolean {
  const halamanButuhLogin = ['/account', '/admin', '/order', '/checkout', '/keranjang', '/pesanan', '/profil'];
  return halamanButuhLogin.some(
    (awalan) => path === awalan || path.startsWith(`${awalan}/`)
  );
}

// Cek keberadaan cookie sesi (token diverifikasi di API/DB, bukan di sini)
function punyaSesi(request: NextRequest): boolean {
  const cookie = request.headers.get('cookie') || '';
  return /(?:^|;\s*)akira_session=/.test(cookie);
}

export function middleware(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;

  if (butuhLogin(path) && !punyaSesi(request)) {
    const loginBaru = new URL('/login', request.url);
    loginBaru.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginBaru);
  }

  return NextResponse.next();
}

// Konfigurasi matcher: jalankan middleware untuk halaman (bukan aset statis)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
