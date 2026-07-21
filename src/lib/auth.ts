import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { Role } from '@/types';

// ── Anti brute-force login (en mémoire, par email) ───────────────────────────
// 5 tentatives échouées → blocage 15 min. Réinitialisé à la 1ère connexion réussie.
const LOGIN_MAX = 5;
const LOGIN_WINDOW = 15 * 60 * 1000;
const loginFails = new Map<string, number[]>();
function loginBlocked(email: string): boolean {
  const now = Date.now();
  const arr = (loginFails.get(email) ?? []).filter((t) => now - t < LOGIN_WINDOW);
  loginFails.set(email, arr);
  return arr.length >= LOGIN_MAX;
}
function recordLoginFail(email: string) {
  const now = Date.now();
  const arr = (loginFails.get(email) ?? []).filter((t) => now - t < LOGIN_WINDOW);
  arr.push(now);
  loginFails.set(email, arr);
}
function loginSuccess(email: string) { loginFails.delete(email); }

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Fait confiance à l'hôte de la requête (localhost OU IP réseau du tel)
  // → indispensable pour se connecter depuis un mobile sur le même WiFi.
  trustHost: true,
  // Cookies Secure automatiquement en PROD (HTTPS) et non-secure en DEV (HTTP mobile/WiFi).
  // → en prod les cookies de session sont protégés ; en dev on peut se connecter en HTTP.
  useSecureCookies: process.env.NODE_ENV === 'production',
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

        const email = String(credentials.email).toLowerCase();

        // ── Anti brute-force : max 5 tentatives ÉCHOUÉES / 15 min par email ──
        if (loginBlocked(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.active) { recordLoginFail(email); return null; }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) { recordLoginFail(email); return null; }

        loginSuccess(email); // reset le compteur en cas de succès

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
        // À chaque requête : vérifier que sessionVersion n'a pas changé
        // + rafraîchir rôle ET permissions depuis la base.
        // ⚠️ Le rôle DOIT être rafraîchi : sinon un admin rétrogradé en employé
        // garderait tous les droits (ADMIN = toutes permissions) jusqu'à sa reconnexion.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { sessionVersion: true, active: true, permissions: true, role: true },
        });
        if (!dbUser || !dbUser.active || dbUser.sessionVersion !== token.sessionVersion) {
          return null;
        }
        token.role = dbUser.role as Role;
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

