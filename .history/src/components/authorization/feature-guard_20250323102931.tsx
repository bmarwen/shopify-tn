// src/components/authorization/feature-guard.tsx
"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Feature, hasFeatureAccess } from "@/lib/feature-authorization";

interface FeatureGuardProps {
  /**
   * The feature(s) to check - can be a single feature or an array of features
   * - If array, requires access to ALL features (AND logic)
   */
  feature: Feature | Feature[];

  /**
   * The content to render if the user has access to the feature
   */
  children: ReactNode;

  /**
   * Optional fallback component to render if user doesn't have access
   * - If not provided, renders nothing when access is denied
   */
  fallback?: ReactNode;
}

/**
 * A component that conditionally renders content based on feature access
 */
export function FeatureGuard({
  feature,
  children,
  fallback,
}: FeatureGuardProps) {
  const { data: session } = useSession();

  // Check if user has access to the required feature(s)
  const hasAccess = Array.isArray(feature)
    ? feature.every((f) => hasFeatureAccess(session?.user, f))
    : hasFeatureAccess(session?.user, feature);

  // Render children if user has access, otherwise render fallback or nothing
  return hasAccess ? <>{children}</> : fallback ? <>{fallback}</> : null;
}

/**
 * A component that conditionally renders based on the user's plan type
 */
export function PlanGuard({
  plan,
  children,
  fallback,
}: {
  plan:
    | "STANDARD"
    | "ADVANCED"
    | "PREMIUM"
    | ("STANDARD" | "ADVANCED" | "PREMIUM")[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: session } = useSession();
  const userPlan = session?.user?.planType || "STANDARD";

  const hasAccess = Array.isArray(plan)
    ? plan.includes(userPlan as any)
    : userPlan === plan;

  return hasAccess ? <>{children}</> : fallback ? <>{fallback}</> : null;
}

/**
 * A component that only renders for specific user roles
 */
export function RoleGuard({
  role,
  children,
  fallback,
}: {
  role:
    | "SUPER_ADMIN"
    | "SHOP_ADMIN"
    | "SHOP_STAFF"
    | "CUSTOMER"
    | ("SUPER_ADMIN" | "SHOP_ADMIN" | "SHOP_STAFF" | "CUSTOMER")[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  if (!userRole) return fallback ? <>{fallback}</> : null;

  const hasAccess = Array.isArray(role)
    ? role.includes(userRole as any)
    : userRole === role;

  return hasAccess ? <>{children}</> : fallback ? <>{fallback}</> : null;
}

/**
 * Example usage:
 *
 * <FeatureGuard feature={Feature.INVOICE_GENERATION}>
 *   <InvoiceGenerationButton />
 * </FeatureGuard>
 *
 * <PlanGuard plan="PREMIUM">
 *   <PremiumFeature />
 * </PlanGuard>
 *
 * <RoleGuard role={["SHOP_ADMIN", "SUPER_ADMIN"]}>
 *   <AdminControls />
 * </RoleGuard>
 */
