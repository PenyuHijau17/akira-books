'use client';

// src/app/register/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== konfirmasi) {
      setError('Kata sandi tidak cocok');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password }),
      });
      const result = await response.json();

      if (result.success) {
        router.push('/login');
      } else {
        setError(result.error || 'Gagal daftar');
      }
    } catch (err) {
      setError('Sistem error');
    } finally {
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
      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        <div>
          <label>Nama</label>
          <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Kata Sandi</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Konfirmasi Kata Sandi</label>
          <input type="password" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} required />
        </div>
        <button type="submit" className="w-full py-3 px-6 bg-primary-600 text-white" disabled={loading}>
          {loading ? 'Daftar...' : 'Daftar Akun'}
        </button>
        <p className="text-center text-sm mt-4">
          Sudah punya akun? <a href="/login">Masuk sekarang</a>
        </p>
      </form>
    </div>
  );
}