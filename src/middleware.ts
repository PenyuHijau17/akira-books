// src/middleware.ts
// Middleware otorisasi server-side untuk Next.js App Router
// GR-02, BR-002: Semua hak akses divalidasi di server, bukan hanya menyembunyikan tombol UI

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fungsi helper cek butuh login
function butuhLogin(path: string): boolean {
  const halamanButuhLogin = ['/account', '/admin', '/order', '/checkout', '/keranjang', '/profil'];
  return halamanButuhLogin.includes(path);
}

/// <summary>
/// Ekstrak role dari cookie header request
/// </summary>
function dapatkanRole(request: NextRequest): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/userRole=([^;]+)/);
  return match ? match[1] : null;
}

// Fungsi middleware yang akan dieksekusi oleh Next.js
export function middleware(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const role = dapatkanRole(request);

  // Jika halaman butuh login dan user blm login
  if (butuhLogin(path) && !role) {
    const loginBaru = new URL('/login', request.url);
    loginBaru.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginBaru);
  }

  // Jika butuh login tapi role tidak valid
  if (butuhLogin(path) && role && !['PENGUNGGUNG', 'CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA'].includes(role)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Lanjutkan request
  return NextResponse.next();
}

// Konfigurasi matcher: jalankan middleware untuk semua path
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|json|js(?:on)?|css|image|svg|png|jpg|woff|woff2|ttf|eot$).*)?.*\\?.[^s]+)',
  ],
};