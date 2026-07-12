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
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #F5F8FC 0%, #E8F5E9 100%)' }}>
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(76,175,79,0.25)] w-full max-w-md px-10 py-12 md:px-12 md:py-14">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/Logo PSI-new.jpeg"
            alt="PSI Logo"
            width={88}
            height={88}
            className="h-22 w-22 object-contain rounded-2xl mb-5"
            style={{ height: 88, width: 88 }}
          />
          <h1 className="text-[26px] font-extrabold text-[#101828] tracking-tight">Paper Solutions</h1>
          <p className="text-[14px] text-[#8A9BB5] mt-1.5">Espace administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[13px] font-semibold text-[#101828] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@psi.dz"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-[#E4EBF5] text-[15px] text-[#101828] placeholder-[#ABBED1] focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#101828] mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-[#E4EBF5] text-[15px] text-[#101828] placeholder-[#ABBED1] focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/20 transition-all"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#EF4444] bg-[#FEF2F2] rounded-xl px-4 py-3 border border-[#FECACA]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-all disabled:opacity-60 shadow-[0_8px_20px_-6px_rgba(76,175,79,0.5)] hover:shadow-[0_10px_28px_-6px_rgba(76,175,79,0.6)]"
            style={{ background: '#4CAF4F' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-[12px] text-[#ABBED1] mt-8">
          PSI — Paper Solutions Industry · psi-algerie.com
        </p>
      </div>
    </div>
  );
}
