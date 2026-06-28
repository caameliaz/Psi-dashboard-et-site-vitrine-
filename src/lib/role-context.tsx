'use client';

import React, { createContext, useContext, useState } from 'react';

type Role = 'Admin' | 'Employe';

interface RoleContextType {
  role: Role;
  setRole: (r: Role) => void;
  isAdmin: boolean;
}

const RoleContext = createContext<RoleContextType>({ role: 'Admin', setRole: () => {}, isAdmin: true });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('Admin');
  return (
    <RoleContext.Provider value={{ role, setRole, isAdmin: role === 'Admin' }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
