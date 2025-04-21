// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcrypt";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
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
        shopSubdomain: { label: "Shop Subdomain", type: "text" }, // Hidden field for subdomain
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Determine which shop to check based on subdomain (if provided)
        const shopQuery = credentials.shopSubdomain
          ? { subdomain: credentials.shopSubdomain }
          : undefined;

        // Find the user with optional shop filtering
        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                subdomain: true,
                planType: true,
                active: true,
              },
            },
          },
        });

        if (!user) {
          return null;
        }

        // If a specific shop subdomain was requested, verify the user belongs to that shop
        if (
          credentials.shopSubdomain &&
          user.shop?.subdomain !== credentials.shopSubdomain
        ) {
          return null;
        }

        // Verify password
        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Check if the shop is active
        if (user.shop && !user.shop.active) {
          return null; // Shop is inactive, don't allow login
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          shopId: user.shopId,
          shopName: user.shop?.name || null,
          shopSubdomain: user.shop?.subdomain || null,
          planType: user.shop?.planType || null,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.shopId = token.shopId as string | null;
        session.user.shopName = token.shopName as string | null;
        session.user.shopSubdomain = token.shopSubdomain as string | null;
        session.user.planType = token.planType as string | null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId;
        token.shopName = user.shopName;
        token.shopSubdomain = user.shopSubdomain;
        token.planType = user.planType;
      }

      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      shopId: string | null;
      shopName: string | null;
      shopSubdomain: string | null;
      planType: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    shopId: string | null;
    shopName: string | null;
    shopSubdomain: string | null;
    planType: string | null;
  }
}
