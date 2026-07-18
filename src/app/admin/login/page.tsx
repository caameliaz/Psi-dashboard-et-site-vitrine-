'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useIsMobile } from '@/lib/use-is-mobile';

export default function LoginPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        remember: remember ? '1' : '0',
        redirect: false,
      });

      // NextAuth v5 : identifiants faux → res.error présent OU res.ok === false
      if (!res || res.error || res.ok === false) {
        setError('Identifiant ou mot de passe incorrect.');
        setLoading(false);
        return;
      }

      // Sur mobile → menu terrain ; sur desktop → dashboard
      router.push(isMobile ? '/admin/mobile' : '/admin/dashboard');
      router.refresh();
    } catch {
      setError('Identifiant ou mot de passe incorrect.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F7FAFC]">
      <div className="bg-white rounded-2xl border border-[#E4EBF5] shadow-sm w-full max-w-sm px-7 py-9 md:px-9 md:py-10">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/Logo PSI-new.jpeg"
            alt="PSI Logo"
            width={56}
            height={56}
            className="object-contain rounded-xl mb-3"
            style={{ height: 56, width: 56 }}
          />
          <h1 className="text-[20px] font-bold text-[#101828] tracking-tight">Paper Solutions</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-1">Espace administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="Votre mot de passe"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-[#E4EBF5] text-[15px] text-[#101828] placeholder-[#ABBED1] focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/20 transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-[#4CAF4F] cursor-pointer"
            />
            <span className="text-[13px] text-[#374151]">Rester connecté</span>
          </label>

          {error && (
            <p className="text-[13px] text-[#EF4444] bg-[#FEF2F2] rounded-xl px-4 py-3 border border-[#FECACA]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] font-bold text-white transition-colors disabled:opacity-60 hover:bg-[#43A047]"
            style={{ background: '#4CAF4F' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#ABBED1] mt-6">
          PSI — Paper Solutions Industry
        </p>
      </div>
    </div>
  );
}
