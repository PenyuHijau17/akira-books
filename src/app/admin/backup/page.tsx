// src/app/admin/backup/page.tsx
// Tahap 13 — pengaman halaman backup dilakukan di server (GR-02).
// Panel klien hanya dirender setelah sesi & peran Admin Utama terverifikasi.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { bolehKelolaBackup } from '@/lib/backup'
import PanelBackup from './PanelBackup'

// Next.js 16 Cache Components: halaman ini bergantung pada cookie sesi saat runtime.
export const instant = false

export default async function HalamanBackup() {
  const cookieStore = await cookies()
  const cookie = cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join('; ')
  const permintaan = new Request('http://localhost/admin/backup', {
    headers: cookie ? { cookie } : {},
  })
  const pengguna = await getSessionUser(permintaan)

  if (!pengguna) redirect('/login?redirect=/admin/backup')

  if (!bolehKelolaBackup(pengguna.role)) {
    return (
      <main className="container" style={{ padding: '2rem 1rem' }}>
        <h1>Akses Ditolak</h1>
        <p>Halaman backup dan pemulihan hanya tersedia untuk Admin Utama.</p>
      </main>
    )
  }

  return <PanelBackup />
}
