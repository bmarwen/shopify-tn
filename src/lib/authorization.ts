// src/lib/authorization.ts
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { PlanType } from "@prisma/client";
import { authOptions } from "./auth";
import { hasFeature } from "./plan-features";
import { db } from "./prisma";

export async function requireAuth(redirectTo = "/login") {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(
      `${redirectTo}?callbackUrl=${encodeURIComponent(
        window.location.pathname
      )}`
    );
  }

  return session;
}

export async function requireShopAdmin(redirectTo = "/login") {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(
      `${redirectTo}?callbackUrl=${encodeURIComponent(
        window.location.pathname
      )}`
    );
  }

  if (
    !session.user.shopId ||
    (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
  ) {
    redirect("/");
  }

  return session;
}

export async function requireFeature(feature: string, redirectTo = "/admin") {
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login");
  }

  // Get shop to check plan type
  const shop = await db.shop.findUnique({
    where: { id: session.user.shopId },
  });

  if (!shop) {
    redirect("/login");
  }

  // Check if the plan includes this feature
  if (!hasFeature(shop.planType as PlanType, feature as any)) {
    redirect(redirectTo);
  }

  return session;
}
