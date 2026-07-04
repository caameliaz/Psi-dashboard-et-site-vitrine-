'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import type { Role } from '@/types';

interface RoleContextType {
  role: Role;
  isAdmin: boolean;
}

const RoleContext = createContext<RoleContextType>({ role: 'ADMIN', isAdmin: true });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const role: Role = status === 'loading' ? 'ADMIN' : ((session?.user?.role as Role) ?? 'EMPLOYEE');
  return (
    <RoleContext.Provider value={{ role, isAdmin: role === 'ADMIN' }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
