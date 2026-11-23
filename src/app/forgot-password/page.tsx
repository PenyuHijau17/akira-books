// src/app/forgot-password/page.tsx
// Halaman Lupa Sandi — 100% Bahasa Indonesia, tema kertas klasik (krem & cokelat)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { lupaPassword } from '@/lib/auth';

export default function LupaSandiPage() {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleKirim = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await lupaPassword(email);

      if (result.success) {
        setSuccess(true);
        setLoading(false);
        // Arahkan kembali ke login setelah beberapa detik
        const timer = setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }
      setError(result.error || 'Gagal mengirimkan permintaan pemulihan.');
      setLoading(false);
    } catch (err) {
      setError('Terjadi kesalahan sistem. Coba lagi nanti.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-center text-3xl font-bold mb-8">Lupa Kata Sandi?</h2>

      {error && (
        <div className="mb-4 p-3 rounded border-red-100 bg-red-100 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded border-green-100 bg-green-100 text-green-800">
          <p>Tautan pemulihan telah dikirim ke email Anda.</p>
        </div>
      )}

      <p className="text-center mb-6">
        Masukkan email terdaftar untuk menerima tautan pemulihan sandi.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="nama@email.com"
          />
        </div>

        <button
          onClick={handleKirim}
          className="w-full py-3 px-6 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Mengirim...' : 'Kirim Tautan Pemulihan'}
        </button>
      </div>

      <p className="text-center text-sm mt-6">
        Ingat kata sandi? <a href="/login" className="font-medium text-primary-600 hover:underline">
          Masuk ke akun
        </a>
      </p>
    </div>
  );
}