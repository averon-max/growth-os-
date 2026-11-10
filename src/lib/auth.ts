import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { rateLimit, ipFrom } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const ip = ipFrom((req?.headers as Record<string, unknown> | undefined)?.["x-forwarded-for"]);
        const em = credentials.email.toLowerCase().trim();
        if (rateLimit("login:" + em, 10, 15 * 60 * 1000) === false || rateLimit("login-ip:" + ip, 30, 15 * 60 * 1000) === false) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        const adminEmails = (process.env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isAdmin: user.isAdmin || adminEmails.includes(user.email.toLowerCase()),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
      }

      // Права админа могли измениться — перечитываем при явном обновлении сессии.
      if (trigger === "update" && token.userId) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { isAdmin: true },
        });
        if (fresh) token.isAdmin = fresh.isAdmin;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.userId) {
          (session.user as { id?: string }).id = token.userId as string;
        }
        (session.user as { isAdmin?: boolean }).isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
