'use client';

// src/app/forgot-password/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LupaSandiPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleKirim = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth?action=lupa-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setLoading(false);
        const timer = setTimeout(() => router.push('/login'), 3000);
        return;
      }
      setError(result.error || 'Gagal');
      setLoading(false);
    } catch (err) {
      setError('Sistem error');
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
          <p>Tautan telah dikirim</p>
        </div>
      )}
      <p className="text-center mb-6">Masukkan email terdaftar</p>
      <form>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="w-full py-3 px-6 bg-primary-600 text-white" disabled={loading}>
          {loading ? 'Mengirim...' : 'Kirim'}
        </button>
      </form>
      <p className="text-center text-sm mt-6">
        <a href="/login">Masuk ke akun</a>
      </p>
    </div>
  );
}