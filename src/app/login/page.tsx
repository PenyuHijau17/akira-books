// src/app/login/page.tsx
// Halaman Login — 100% Bahasa Indonesia, tema kertas klasik (krem & cokelat)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah, cekTenggatLewati, hitungSelisihMenit } from '@/lib/timezone';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Proses login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success && result.role && result.user && result.sessionId) {
        // Login berhasil - simpan info role ke cookie (sementara untuk demo)
        // Redirect ke halaman utama
        router.push('/');
      } else {
        // Gagal login - tampilkan error
        setError(result.error || 'Email atau kata sandi salah.');
        setLoading(false);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login. Coba lagi.');
      setLoading(false);
    }
  };

  // Jaldi sudah login, arahkan ke halaman utama
  useEffect(() => {
    // Cek session - dalam implementasi sebenarnya dicek via cookie
    // Untuk sekarang, jika sudah ada arahkan ke home
    const cekSession = () => {
      router.push('/');
    };
    // Delay sedikit untuk memastikan render selesai
    const timer = setTimeout(cekSession, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-center text-3xl font-bold mb-8">Masuk ke Akira Books</h2>

      {error && (
        <div className="mb-4 p-3 rounded border-red-100 bg-red-100 text-red-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleLogin}
        className="space-y-4"
        noValidate
      >
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Kata Sandi
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Masukkan kata sandi"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-6 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Masuk...' : 'Masuk ke Akun'}
        </button>

        <p className="text-center text-sm mt-4">
          Belum punya akun?
          <a href="/register" className="font-medium text-primary-600 hover:underline">
            Daftar sekarang
          </a>
        </p>

        <p className="text-center text-sm mt-6">
          Lupa kata sandi?
          <a href="/forgot-password" className="font-medium text-primary-600:hover:underline">
            Kirim tautan pemulihan
          </a>
        </p>
      </form>
    </div>
  );
}