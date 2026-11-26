// src/app/admin/buku/page.tsx
// Halaman administrasi buku. Prerender aman: komponen interaktif dipisah ke
// AdminBukuKlien.tsx dan dibungkus Suspense (Next.js 16 Cache Components).

import { Suspense } from 'react'
import AdminBukuKlien from './AdminBukuKlien'

// Next.js 16 Cache Components: blokir prerender instan; nilai klien masuk setelah runtime.
export const instant = false

export default function AdminBukuPage() {
  return (
    <Suspense
      fallback={
        <main className="container" style={{ padding: '2rem 1rem' }}>
          <p>Sedang menyiapkan halaman pengelolaan buku…</p>
        </main>
      }
    >
      <AdminBukuKlien />
    </Suspense>
  )
}
