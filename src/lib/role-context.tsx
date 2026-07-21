'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import type { Role } from '@/types';
import { ALL_PERM_KEYS, type PermKey } from '@/lib/permissions';

interface RoleContextType {
  role: Role;
  isAdmin: boolean;
  permissions: PermKey[];
  /** Vrai tant que la session n'est pas encore chargée (évite le flash de la sidebar). */
  loading: boolean;
  /** Vrai si l'utilisateur a la permission (ADMIN = toujours vrai). */
  can: (perm: PermKey) => boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: 'ADMIN', isAdmin: true, permissions: [...ALL_PERM_KEYS], loading: true, can: () => true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  // Pendant le chargement on ne suppose PAS ADMIN (sinon la sidebar montre tout
  // puis se filtre = flash). On expose `loading` pour que la sidebar attende.
  const role: Role = (session?.user?.role as Role) ?? 'EMPLOYEE';
  const isAdmin = role === 'ADMIN';

  // Permissions effectives : ADMIN = toutes ; sinon EXACTEMENT celles stockées.
  // Pas de fallback "défaut employé" ici : un tableau vide = l'admin a tout retiré
  // volontairement → l'employé n'a aucune permission (sinon décocher ne servirait à rien).
  const rawPerms = (session?.user as { permissions?: string[] } | undefined)?.permissions;
  const permissions: PermKey[] = isAdmin
    ? [...ALL_PERM_KEYS]
    : ((rawPerms ?? []) as PermKey[]);

  const can = (perm: PermKey) => isAdmin || permissions.includes(perm);

  return (
    <RoleContext.Provider value={{ role, isAdmin, permissions, loading, can }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
