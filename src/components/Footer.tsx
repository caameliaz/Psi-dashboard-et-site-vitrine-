import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#263238]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">

        {/* Brand */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <img src="/Logo PSI-new.jpeg" alt="PSI" className="h-[72px] w-[72px] object-contain rounded-xl" />
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
            {[
              <path key="fb" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
              <><rect key="ig1" x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.5"/><circle key="ig2" cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5"/><circle key="ig3" cx="17.5" cy="6.5" r="1" fill="white"/></>,
              <path key="li" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 4a2 2 0 100 4 2 2 0 000-4z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
            ].map((icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">{icon}</svg>
              </a>
            ))}
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
              <span className="text-[13px] text-[#89939E] leading-relaxed">Centre El Qods, Niveau M1<br/>Chéraga, Alger — Wilaya 16</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#4CAF4F" strokeWidth="1.8"/>
                  <path d="M22 6l-10 7L2 6" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <a href="mailto:contact@psi-algerie.com" className="text-[13px] text-[#89939E] hover:text-white transition-colors">
                contact@psi-algerie.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z" stroke="#4CAF4F" strokeWidth="1.8"/>
                  <circle cx="12" cy="9" r="2.5" stroke="#4CAF4F" strokeWidth="1.8"/>
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
