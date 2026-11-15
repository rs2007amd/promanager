import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  clearLoginFailures,
  clientIp,
  isLoginBlocked,
  recordLoginFailure,
} from "@/lib/login-limit";

// Too many failed sign-ins recently. The code reaches the login form.
export class LoginRateLimited extends CredentialsSignin {
  code = "rate_limited";
}

// Compared against when the email has no account, so a wrong email takes as
// long as a wrong password and doesn't reveal which emails exist
const DUMMY_HASH = "$2b$12$z4DOLPxaIXLAciMNhxt6b.E/itGliUkU.16w9i5rgITRMAKVn08eq";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const ip = clientIp(request.headers);

        if (await isLoginBlocked(prisma, email, ip)) throw new LoginRateLimited();

        const user = await prisma.user.findUnique({ where: { email } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user || !ok) {
          await recordLoginFailure(prisma, email, ip);
          return null;
        }

        await clearLoginFailures(prisma, email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        return token;
      }

      // Every later request: the session only stays valid while the account
      // exists and hasn't been signed out everywhere (for example by a
      // password reset). Role changes also take effect right away.
      if (!token.id) return null;
      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, sessionVersion: true },
      });
      if (!current || current.sessionVersion !== token.sessionVersion) return null;
      token.role = current.role;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "MANAGER" | "TENANT";
      return session;
    },
  },
});
