import type { Role } from '@/types';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      permissions: string[];
    };
  }

  interface User {
    role: Role;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    permissions?: string[];
    sessionVersion?: number;
  }
}