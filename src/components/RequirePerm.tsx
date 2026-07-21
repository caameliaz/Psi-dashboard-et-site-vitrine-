'use client';

import { useRole } from '@/lib/role-context';
import type { PermKey } from '@/lib/permissions';

/**
 * Garde de page : n'affiche le contenu que si l'utilisateur a la permission.
 * Sinon → message "Accès refusé" propre (au lieu d'une page vide/cassée).
 *
 * ⚠️ C'est une garde d'INTERFACE (confort). La vraie sécurité reste côté API :
 * chaque route est protégée par requirePermission().
 *
 * Usage :
 *   <RequirePerm perm="voir_historique">
 *     ...contenu de la page...
 *   </RequirePerm>
 */
export function RequirePerm({ perm, children }: { perm: PermKey; children: React.ReactNode }) {
  const { can, loading } = useRole();

  // Tant que la session charge, on n'affiche rien (évite un flash "Accès refusé").
  if (loading) return null;

  if (!can(perm)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-4">
          <svg width={26} height={26} fill="none" viewBox="0 0 24 24">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="#EF4444" strokeWidth="1.7" />
            <path d="M8 10V7a4 4 0 118 0v3" stroke="#EF4444" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-[#0F172A]">Accès refusé</p>
        <p className="text-[13px] text-[#8A9BB5] mt-1.5 max-w-xs leading-relaxed">
          Vous n&apos;avez pas l&apos;autorisation de consulter cette page.
          Contactez un administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
