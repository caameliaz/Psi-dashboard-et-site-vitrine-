'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import type { Role } from '@/types';
import { EMPLOYE_DEFAULT_PERMS, ALL_PERM_KEYS, type PermKey } from '@/lib/permissions';

interface RoleContextType {
  role: Role;
  isAdmin: boolean;
  permissions: PermKey[];
  /** Vrai si l'utilisateur a la permission (ADMIN = toujours vrai). */
  can: (perm: PermKey) => boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: 'ADMIN', isAdmin: true, permissions: [...ALL_PERM_KEYS], can: () => true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const role: Role = loading ? 'ADMIN' : ((session?.user?.role as Role) ?? 'EMPLOYEE');
  const isAdmin = role === 'ADMIN';

  // Permissions effectives : ADMIN = toutes ; sinon celles de la session (ou défaut employé)
  const rawPerms = (session?.user as { permissions?: string[] } | undefined)?.permissions;
  const permissions: PermKey[] = isAdmin
    ? [...ALL_PERM_KEYS]
    : (rawPerms && rawPerms.length > 0 ? (rawPerms as PermKey[]) : [...EMPLOYE_DEFAULT_PERMS]);

  const can = (perm: PermKey) => isAdmin || permissions.includes(perm);

  return (
    <RoleContext.Provider value={{ role, isAdmin, permissions, can }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
