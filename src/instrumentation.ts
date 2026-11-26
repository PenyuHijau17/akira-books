// src/instrumentation.ts
// Menjalankan pekerjaan terjadwal pembayaran sekali per proses server (BR-025).
// Status pekerjaan disimpan di database, sehingga aman saat container di-restart.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { mulaiPenjadwalPembayaran, jalankanTugasPembayaran } = await import('./lib/penjadwal')
    mulaiPenjadwalPembayaran()
    // BR-025: kejar pekerjaan yang jatuh tempo saat server/container sedang mati.
    // Dedup memakai kunci unik di database sehingga tidak mengirim dua kali.
    jalankanTugasPembayaran().catch((error) => {
      console.error('[PENJADWAL PEMBAYARAN] gagal mengejar tugas awal:', error)
    })
  }
}
