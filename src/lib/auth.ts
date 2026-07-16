import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { Role } from '@/types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Fait confiance à l'hôte de la requête (localhost OU IP réseau du tel)
  // → indispensable pour se connecter depuis un mobile sur le même WiFi.
  trustHost: true,
  // Cookies non-secure : sur mobile on est en HTTP (pas HTTPS), sinon le cookie
  // de session serait marqué Secure et rejeté → boucle sur login.
  useSecureCookies: false,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        remember: { label: 'Remember', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.active) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions ?? [],
          remember: credentials.remember === '1',
        };
      }
    })
  ],
  // Session valable 24h (glissante) : tant que l'utilisateur revient dans les 24h,
  // il reste connecté. "Rester connecté" garde le cookie même après fermeture du navigateur.
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        // Stocker sessionVersion initial pour pouvoir détecter une invalidation
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
      } else {
        // À chaque requête : vérifier que sessionVersion n'a pas changé + rafraîchir permissions
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { sessionVersion: true, active: true, permissions: true },
        });
        if (!dbUser || !dbUser.active || dbUser.sessionVersion !== token.sessionVersion) {
          return null;
        }
        token.permissions = dbUser.permissions ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as Role;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login'
  }
});

