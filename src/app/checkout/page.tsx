// src/app/checkout/page.tsx
// Tahap 13 — prerender produksi aman: halaman Server Component membungkus
// komponen klien yang memakai waktu/crypto saat runtime.

import { Suspense } from 'react'
import CheckoutKlien from './CheckoutKlien'

// Next.js 16 Cache Components: blokir prerender instan; waktu & crypto dipakai saat runtime.
export const instant = false

export default function HalamanCheckout() {
  return (
    <Suspense
      fallback={
        <main className="container" style={{ padding: '2rem 1rem' }}>
          <p>Sedang menyiapkan checkout…</p>
        </main>
      }
    >
      <CheckoutKlien />
    </Suspense>
  )
}
