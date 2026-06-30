import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { Role } from '@/types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
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
          role: user.role
        };
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        // Stocker sessionVersion initial pour pouvoir détecter une invalidation
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
      } else {
        // À chaque requête : vérifier que sessionVersion n'a pas changé
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { sessionVersion: true, active: true },
        });
        if (!dbUser || !dbUser.active || dbUser.sessionVersion !== token.sessionVersion) {
          return null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as Role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login'
  }
});

