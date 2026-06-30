'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError('Email ou mot de passe incorrect.');
    } else {
      router.push('/admin/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F8FC' }}>
      <div className="bg-white rounded-2xl shadow-lg px-10 py-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/Logo PSI-new.jpeg"
            alt="PSI Logo"
            width={64}
            height={64}
            className="h-16 w-16 object-contain rounded-xl mb-3"
          />
          <h1 className="text-xl font-bold text-[#101828]">Paper Solutions</h1>
          <p className="text-sm text-[#8A9BB5] mt-1">Espace administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@psi.dz"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4EBF5] text-sm text-[#101828] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4EBF5] text-sm text-[#101828] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#EF4444] bg-[#FEF2F2] rounded-lg px-3 py-2 border border-[#FECACA]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: '#4CAF4F' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
