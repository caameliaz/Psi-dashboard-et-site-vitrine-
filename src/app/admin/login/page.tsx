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
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Mode "mot de passe oublié"
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Entrez votre email.'); return; }
    setError(''); setForgotLoading(true);
    try {
      await fetch('/api/password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setForgotSent(true);
    } finally { setForgotLoading(false); }
  };

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

        {!forgot ? (
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full px-4 py-3.5 pr-12 rounded-xl border border-[#E4EBF5] text-[15px] text-[#101828] placeholder-[#ABBED1] focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/20 transition-all"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9BB5] hover:text-[#374151] transition-colors">
                {showPassword ? (
                  <svg width={18} height={18} fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                ) : (
                  <svg width={18} height={18} fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
                )}
              </button>
            </div>
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

          <button type="button" onClick={() => { setForgot(true); setError(''); setForgotSent(false); }}
            className="block w-full text-center text-[12px] font-semibold text-[#4CAF4F] hover:underline">
            Mot de passe oublié ?
          </button>
        </form>
        ) : forgotSent ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto">
              <svg width={24} height={24} fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-[14px] font-bold text-[#0F172A]">Email envoyé</p>
            <p className="text-[13px] text-[#8A9BB5] leading-relaxed">Si un compte existe avec cet email, vous venez de recevoir un <strong>nouveau mot de passe</strong>. Vérifiez votre boîte de réception (et vos spams).</p>
            <button onClick={() => { setForgot(false); setForgotSent(false); }} className="w-full py-3 rounded-xl text-[14px] font-bold text-white" style={{ background: '#4CAF4F' }}>Retour à la connexion</button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5">
            <p className="text-[13px] text-[#8A9BB5] leading-relaxed">Entrez votre email : un nouveau mot de passe vous sera envoyé immédiatement.</p>
            <div>
              <label className="block text-[13px] font-semibold text-[#101828] mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.dz" required
                className="w-full px-4 py-3 rounded-xl border border-[#E4EBF5] text-[14px] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all" />
            </div>
            {error && <p className="text-[13px] text-[#EF4444] bg-[#FEF2F2] rounded-xl px-4 py-3 border border-[#FECACA]">{error}</p>}
            <button type="submit" disabled={forgotLoading} className="w-full py-3 rounded-xl text-[15px] font-bold text-white transition-colors disabled:opacity-60 hover:bg-[#43A047]" style={{ background: '#4CAF4F' }}>
              {forgotLoading ? 'Envoi…' : 'Envoyer la demande'}
            </button>
            <button type="button" onClick={() => { setForgot(false); setError(''); }} className="block w-full text-center text-[12px] font-semibold text-[#8A9BB5] hover:underline">
              Retour à la connexion
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-[#ABBED1] mt-6">
          PSI — Paper Solutions Industry
        </p>
      </div>
    </div>
  );
}
