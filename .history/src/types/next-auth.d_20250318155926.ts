// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      shopId: string | null;
      shopName: string | null;
      planType: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    shopId: string | null;
    shopName: string | null;
    planType: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    shopId: string | null;
    shopName: string | null;
    planType: string | null;
  }
}
