import Link from 'next/link';

async function getContent(): Promise<Record<string, string>> {
  try {
    const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/content`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export async function Footer() {
  const content = await getContent();

  const adresse   = content['contact_adresse']   ?? 'Centre El Qods, Niveau M1, Chéraga, Alger';
  const email     = content['contact_email']     ?? 'contact@psi-algerie.com';
  const facebook  = content['contact_facebook']  ?? 'https://www.facebook.com/PSI';
  const instagram = content['contact_instagram'] ?? 'https://www.instagram.com/psi04_2026';

  return (
    <footer className="bg-[#263238]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">

        {/* Brand */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <img src="/Logo PSI-new.jpeg" alt="PSI" className="h-[72px] w-[72px] object-contain" style={{ maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 55%, transparent 100%)' }} />
            <div className="flex flex-col">
              <span className="text-white text-[20px] font-bold tracking-tight leading-none">PSI</span>
              <span className="text-[#89939E] text-[12px] mt-0.5">psi-algerie.com</span>
            </div>
          </div>
          <p className="text-[14px] text-[#89939E] leading-relaxed">
            Spécialiste du papier thermique professionnel en Algérie
          </p>
          {/* Réseaux */}
          <div className="flex items-center gap-3">
            <a href={facebook} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#1877F2]/30 flex items-center justify-center transition-colors group"
              title="PSI sur Facebook · 82K abonnés">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href={instagram} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#E1306C]/30 flex items-center justify-center transition-colors group"
              title="@psi04_2026 sur Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5"/>
                <circle cx="17.5" cy="6.5" r="1" fill="white"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Liens */}
        <div className="flex flex-col gap-4">
          <p className="text-white text-[16px] font-bold">Liens rapides</p>
          <ul className="flex flex-col gap-3">
            {[
              { l: 'Accueil', h: '/#' },
              { l: 'Produits', h: '/#products' },
              { l: 'À propos', h: '/#about' },
              { l: 'Contact', h: '/#contact' },
            ].map((item) => (
              <li key={item.l}>
                <Link href={item.h} className="text-[14px] text-[#89939E] hover:text-white transition-colors flex items-center gap-1.5 group">
                  <span className="w-0 h-px bg-[#4CAF4F] group-hover:w-3 transition-all" />
                  {item.l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-4">
          <p className="text-white text-[16px] font-bold">Contact</p>
          <ul className="flex flex-col gap-4">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#4CAF4F" strokeWidth="1.8"/>
                  <circle cx="12" cy="10" r="3" stroke="#4CAF4F" strokeWidth="1.8"/>
                </svg>
              </div>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(adresse)}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#89939E] leading-relaxed hover:text-white transition-colors">{adresse}</a>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#4CAF4F" strokeWidth="1.8"/>
                  <path d="M22 6l-10 7L2 6" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <a href={`mailto:${email}`} className="text-[13px] text-[#89939E] hover:text-white transition-colors">
                {email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#4CAF4F" strokeWidth="1.8"/>
                  <path d="M12 7v5l3 2" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[13px] text-[#89939E]">Dim – Jeu : 8h00 – 17h00</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[13px] text-[#89939E]/60">
            © 2026 PSI — Paper Solutions Industry. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#89939E]/40">RC Alger · NIF · Registre du commerce</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
