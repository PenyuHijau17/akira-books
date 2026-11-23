// src/app/register/page.tsx
// Halaman Registrasi — 100% Bahasa Indonesia, tema kertas klasik (krem & cokelat)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/auth';

export default function RegisterPage() {
  const [nama, setNama] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validasi konfirmasi password
    if (password !== konfirmasiPassword) {
      setError('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      setLoading(false);
      return;
    }

    // Validasi panjang password
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        nama,
        email,
        whatsapp,
        password,
      });

      if (result.success) {
        // Registrasi berhasil, arahkan ke login
        router.push('/login');
      } else {
        setError(result.error || 'Gagal mendaftar. Coba lagi.');
        setLoading(false);
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem. Coba lagi nanti.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-center text-3xl font-bold mb-8">Daftar Akun Baru</h2>

      {error && (
        <div className="mb-4 p-3 rounded border-red-100 bg-red-100 text-red-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleRegister}
        className="space-y-4"
        noValidate
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Nama Lengkap
          </label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Nama lengkap"
          />
        </div>

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
            Nomor WhatsApp (opsional)
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="+628xxxxxxxxxx"
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
            placeholder="Minimum 6 karakter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Konfirmasi Kata Sandi
          </label>
          <input
            type="password"
            value={konfirmasiPassword}
            onChange={(e) => setKonfirmasiPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Ulangi kata sandi"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-6 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Mendaftar...' : 'Daftar Akun'}
        </button>

        <p className="text-center text-sm mt-4">
          Sudah punya akun?
          <a href="/login" className="font-medium text-primary-600 hover:underline">
            Masuk sekarang
          </a>
        </p>
      </form>
    </div>
  );
}