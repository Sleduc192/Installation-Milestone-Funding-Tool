import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { withBasePath } from "@/lib/base-path";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (!user) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          return { id: user.id, email: user.email, name: user.name ?? "", role: user.role };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const origin = new URL(baseUrl).origin;
      if (url.startsWith("/")) return `${origin}${withBasePath(url)}`;
      try {
        const target = new URL(url);
        if (target.origin === origin) return `${origin}${withBasePath(target.pathname)}${target.search}`;
      } catch {
        return `${origin}${withBasePath("/dashboard")}`;
      }
      return url;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    // Full public path. NextAuth redirects with this string as Location.
    // "/login" alone is resolved on the hub host and 404s.
    signIn: withBasePath("/login"),
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
