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
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    permissions?: string[];
    sessionVersion?: number;
    // "Se souvenir de moi" coché à la connexion (cf. auth.ts) — mémorisé sur le token pour que
    // chaque ré-émission glissante (updateAge) reconduise la bonne durée, pas seulement la
    // première fois.
    remember?: boolean;
  }
}