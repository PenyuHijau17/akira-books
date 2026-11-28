// src/app/admin/penjualan/page.tsx
// Hub operasional Penjualan. Pengaman halaman dilakukan di server (GR-02):
// tanpa sesi → /login; peran bukan admin → /katalog.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import PenjualanHubKlien from './PenjualanHubKlien'

// Next.js 16 Cache Components: halaman ini bergantung pada cookie sesi saat runtime.
export const instant = false

export default async function HalamanHubPenjualan() {
  const cookieStore = await cookies()
  const cookie = cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join('; ')
  const permintaan = new Request('http://localhost/admin/penjualan', {
    headers: cookie ? { cookie } : {},
  })
  const pengguna = await getSessionUser(permintaan)

  if (!pengguna) redirect('/login?redirect=/admin/penjualan')
  if (pengguna.role !== 'ADMIN_BIASA' && pengguna.role !== 'ADMIN_UTAMA') {
    redirect('/katalog')
  }

  return <PenjualanHubKlien role={pengguna.role} />
}
