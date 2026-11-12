import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { burnBcryptTime, clientIp, limit, normalizeEmail } from "@/lib/auth-guard";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.GOOGLE_AUTH_CLIENT_ID && process.env.GOOGLE_AUTH_CLIENT_SECRET
      ? [GoogleProvider({ clientId: process.env.GOOGLE_AUTH_CLIENT_ID, clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET })]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password ?? "";
        if (!email || !password || password.length > 200) return null;

        const ip = clientIp(req?.headers as Record<string, unknown> | undefined);
        const okEmail = await limit("login:" + email, 8, 15 * 60 * 1000);
        const okIp = await limit("login-ip:" + ip, 40, 15 * 60 * 1000);
        if (!okEmail || !okIp) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await burnBcryptTime(password); // same response time as a wrong password
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        const adminEmails = (process.env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isAdmin: user.isAdmin || adminEmails.includes(user.email.toLowerCase()),
          pwdAt: user.passwordChangedAt?.getTime() ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const p = profile as { email?: string; email_verified?: boolean; name?: string } | undefined;
      const email = normalizeEmail(p?.email);
      // Only accept emails Google has verified — otherwise someone could claim an address they don't own.
      if (!email || p?.email_verified !== true) return false;
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!existing) {
        // New Google user: random unusable password; they can set a real one later via "Forgot password".
        const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
        const name = (p?.name ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 80) || null;
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({ data: { email, name, passwordHash, passwordChangedAt: new Date(0) } });
          const ws = await tx.workspace.create({ data: { name: name ? `${name}'s Workspace` : "My Workspace" } });
          await tx.workspaceMember.create({ data: { userId: user.id, workspaceId: ws.id, role: "OWNER" } });
        });
      }
      return true;
    },
    async jwt({ token, user, trigger, account }) {
      if (user && account?.provider === "google") {
        const db = await prisma.user.findUnique({ where: { email: normalizeEmail(user.email) ?? "" } });
        if (!db) return {};
        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
        token.userId = db.id;
        token.email = db.email;
        token.isAdmin = db.isAdmin || adminEmails.includes(db.email);
        token.pwdAt = Date.now(); // this session was just created, so it's newer than any password change
        return token;
      }
      if (user) {
        token.userId = user.id;
        token.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
        token.pwdAt = (user as { pwdAt?: number }).pwdAt ?? 0;
        return token;
      }

      if (!token.userId) return token;

      // Every request: sessions die when the password changes, the account is deleted, or admin rights change.
      const fresh = await prisma.user.findUnique({
        where: { id: token.userId as string },
        select: { isAdmin: true, passwordChangedAt: true },
      });
      if (!fresh) return {};
      if ((fresh.passwordChangedAt?.getTime() ?? 0) > ((token.pwdAt as number | undefined) ?? 0)) return {};
      if (trigger === "update" || fresh.isAdmin !== token.isAdmin) {
        const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
        token.isAdmin = fresh.isAdmin || adminEmails.includes(String(token.email ?? "").toLowerCase());
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.userId) return { ...session, user: undefined } as typeof session;
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { isAdmin?: boolean }).isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Only ever redirect inside our own site (no open redirects through ?callbackUrl=).
      if (url.startsWith("/") && !url.startsWith("//")) return baseUrl + url;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return baseUrl + "/dashboard";
    },
  },
};
