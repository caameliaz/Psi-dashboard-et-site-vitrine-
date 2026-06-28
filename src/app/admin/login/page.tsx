'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // auth à implémenter plus tard
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#F5F8FC' }}
    >
      <div className="bg-white rounded-2xl shadow-lg px-10 py-10 w-full max-w-sm">
        {/* Logo */}
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
            <label className="block text-sm font-medium text-[#101828] mb-1.5">
              Email
            </label>
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
            <label className="block text-sm font-medium text-[#101828] mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4EBF5] text-sm text-[#101828] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: '#4CAF4F' }}
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
