import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { isBlocked, recordFail, recordSuccess } from './login-guard';
import type { Role } from '@/types';

// Durée de session selon la case "Se souvenir de moi" à la connexion (cf. jwt callback) —
// contrôle directement l'expiration EMBARQUÉE dans le token (`exp`), vérifiée à chaque requête
// indépendamment du cookie lui-même : décochée, la session reste volontairement courte plutôt
// que de suivre les 15 jours glissants habituels.
const REMEMBERED_MAX_AGE = 15 * 24 * 60 * 60; // 15 jours, glissant (cf. session.maxAge/updateAge)
const UNREMEMBERED_MAX_AGE = 24 * 60 * 60; // 1 jour

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
        if (!credentials?.email || !credentials?.password) return null;

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

        // ── 2FA : code à 6 chiffres envoyé par email (cf. /api/auth/2fa/send) ──
        const otp = String(credentials.otp).trim();
        const codeValid =
          user.twoFactorCode &&
          user.twoFactorExpires &&
          user.twoFactorExpires.getTime() > Date.now() &&
          (user.twoFactorAttempts ?? 0) < 5 &&
          user.twoFactorCode === otp;

        if (!codeValid) {
          recordFail('login', email);
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
  // Session GLISSANTE, jusqu'à 15 jours si "Se souvenir de moi" est coché (1 jour sinon, cf.
  // REMEMBERED_MAX_AGE/UNREMEMBERED_MAX_AGE + jwt callback) : tant que l'utilisateur revient
  // dans cette fenêtre, il reste connecté (évite de repasser par le 2FA à chaque fois). Le
  // glissement est géré par NextAuth lui-même en JWT — pas besoin d'un refresh token séparé :
  // `maxAge` ici n'est que l'enveloppe MAXIMALE du cookie (le plafond pour "mémorisé") ;
  // l'expiration réellement vérifiée à chaque requête est `token.exp`, positionnée nous-mêmes
  // dans le jwt callback selon le choix fait à la connexion. NextAuth RÉ-ÉMET le cookie
  // (nouvelle signature, `token.exp` repoussé) dès que l'utilisateur revient après `updateAge`
  // écoulé depuis la dernière émission — au plus une fois par jour d'activité ici, ce qui
  // repousse la fenêtre à chaque jour où l'utilisateur revient. "Rester connecté" garde le
  // cookie même après fermeture du navigateur (cookie persistant, pas de session).
  session: { strategy: 'jwt', maxAge: 15 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        // Stocker sessionVersion initial pour pouvoir détecter une invalidation
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
        // "Se souvenir de moi" — mémorisé sur le token lui-même (pas seulement lu une fois à la
        // connexion) pour que chaque ré-émission glissante (updateAge, branche else ci-dessous)
        // sache quelle durée reconduire, pas seulement la toute première émission.
        token.remember = (user as { remember?: boolean }).remember ?? true;
        token.exp = Math.floor(Date.now() / 1000) + (token.remember ? REMEMBERED_MAX_AGE : UNREMEMBERED_MAX_AGE);
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
        // Reconduit l'expiration selon le choix fait à LA CONNEXION (glissant, comme le reste
        // de la session) — jamais l'inverse : un token émis "non mémorisé" ne doit jamais se
        // remettre à durer 15 jours juste parce qu'il a été ré-émis une fois.
        token.exp = Math.floor(Date.now() / 1000) + (token.remember ?? true ? REMEMBERED_MAX_AGE : UNREMEMBERED_MAX_AGE);
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

