import { PlanType, Role } from "@prisma/client";

interface User {
  id: string;
  role: string;
  planType?: string | null;
}

export function canViewSubscription(user: User | null | undefined): boolean {
  // Only SHOP_ADMIN can view subscription details
  return user?.role === "SHOP_ADMIN";
}

export function canViewAdvancedStats(user: User | null | undefined): boolean {
  // Advanced stats are available to SHOP_ADMIN and SHOP_STAFF with ADVANCED or PREMIUM plans
  if (!user) return false;

  const hasPremiumPlan =
    user.planType === "ADVANCED" || user.planType === "PREMIUM";
  return (
    (user.role === "SHOP_ADMIN" || user.role === "SHOP_STAFF") && hasPremiumPlan
  );
}

export function formatPlanName(planType: string): string {
  // Format plan type for display
  switch (planType) {
    case "STANDARD":
      return "Standard Plan";
    case "ADVANCED":
      return "Advanced Plan";
    case "PREMIUM":
      return "Premium Plan";
    default:
      return planType;
  }
}

export function formatSubscriptionPeriod(period: string): string {
  // Format subscription period for display
  switch (period) {
    case "SIX_MONTHS":
      return "6 Months";
    case "ONE_YEAR":
      return "1 Year";
    case "THREE_YEARS":
      return "3 Years";
    default:
      return period;
  }
}

export function getDiscountByPeriod(period: string): number {
  // Return discount percentage based on period
  switch (period) {
    case "SIX_MONTHS":
      return 0;
    case "ONE_YEAR":
      return 12;
    case "THREE_YEARS":
      return 20;
    default:
      return 0;
  }
}
