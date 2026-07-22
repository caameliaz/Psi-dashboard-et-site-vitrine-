import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { isBlocked, recordFail, recordSuccess } from './login-guard';
import type { Role } from '@/types';

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
        otp: { label: 'Code de vérification', type: 'text' },
        remember: { label: 'Remember', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.otp) return null;

        const email = String(credentials.email).toLowerCase();

        // ── Anti brute-force : max 5 tentatives ÉCHOUÉES / 15 min par email ──
        if (isBlocked('login', email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.active) { recordFail('login', email); return null; }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) { recordFail('login', email); return null; }

        // ── 2FA : le code (envoyé par email à l'étape précédente) doit correspondre,
        // ne pas avoir expiré, et ne pas avoir dépassé 5 tentatives échouées ──
        const otp = String(credentials.otp).trim();
        const codeValid =
          user.twoFactorCode &&
          user.twoFactorExpires &&
          user.twoFactorExpires.getTime() > Date.now() &&
          (user.twoFactorAttempts ?? 0) < 5 &&
          user.twoFactorCode === otp;

        if (!codeValid) {
          recordFail('login', email);
          // Incrémente le compteur de tentatives sur LE code en attente (protège contre le bruteforce du code à 6 chiffres)
          if (user.twoFactorCode && user.twoFactorExpires && user.twoFactorExpires.getTime() > Date.now()) {
            await prisma.user.update({ where: { id: user.id }, data: { twoFactorAttempts: { increment: 1 } } });
          }
          return null;
        }

        recordSuccess('login', email); // reset le compteur en cas de succès

        // Code à usage unique : on l'invalide immédiatement après validation
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorCode: null, twoFactorExpires: null, twoFactorAttempts: 0 },
        });

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

