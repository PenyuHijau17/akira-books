// src/app/account/page.tsx
// Halaman Profil Customer — 100% Bahasa Indonesia, tema kertas klasik (krem & cokelat)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/timezone';

export default function AccountPage() {
  const [nama, setNama] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [simpan, setSimpan] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<boolean>(false);
  const router = useRouter();

  // Load data profil saat komponen mount
  useEffect(() => {
    // Dalam implementasi sebenarnya, data ini diambil dari session/user
    // Untuk demo, gunakan nilai default
    setNama('Pelanggan Terlogin');
    setEmail('pelanggan@akirabooks.id');
    setWhatsapp('+628xxxxxxxxxx');
  }, []);

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBerhasil(false);
    setSimpan(true);

    try {
      // Simpan perubahan profil (demo)
      setTimeout(() => {
        setSimpan(false);
        setBerhasil(true);
        // Reset form setelah beberapa detik
        const resetTimer = setTimeout(() => {
          setBerhasil(false);
        }, 3000);
        // Bersihkan timer
        // componentWillUnmount effect akan menangani
      }, 1000);
    } catch (err) {
      setError('Gagal menyimpan perubahan.');
      setSimpan(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-center text-3xl font-bold mb-8">Akun Saya</h2>

      {berhasil && (
        <div className="mb-4 p-3 rounded border-green-100 bg-green-100 text-green-800">
          <p className="font-medium">Perubahan berhasil disimpan.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded border-red-100 bg-red-100 text-red-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSimpan}
        className="space-y-4"
        noValidate
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Nama Lengkap
          </label>
          <p className="text-sm text-gray-600">{email}</p>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            readOnly
            className="w-full px-4 py-3 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
            placeholder="Nama lengkap (terlihat saja)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Nomor WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="+628xxxxxxxxxx"
          />
        </div>

        {/* Field email ditampilkan hanya untuk dibaca, tidak bisa diedit */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Email
          </label>
          <p className="text-sm text-gray-600 font-medium">email terkunci (tidak dapat diubah)</p>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full px-4 py-3 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
            placeholder="email@domain.com (tidak dapat diubah)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Alasan: Email digunakan sebagai identifikasi unik akun dan
            tidak dapat diubah untuk menjaga keamanan akun.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-6 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          disabled={simpan}
        >
          {simpan ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>

        <p className="text-center text-sm mt-6">
          <a href="/keranjang" className="font-medium text-primary-600 hover:underline">
            Kembali ke Katalog
          </a>
        </p>
      </form>
    </div>
  );
}