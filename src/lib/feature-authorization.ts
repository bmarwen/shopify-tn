import { PlanType, Role } from "@prisma/client";

// Define all available features
export enum Feature {
  // Standard features - available to all plans
  PRODUCTS_MANAGEMENT = "products_management",
  CATEGORIES_MANAGEMENT = "categories_management",
  ORDERS_VIEW = "orders_view",
  CUSTOMERS_VIEW = "customers_view",
  SHOP_SETTINGS = "shop_settings",

  // Advanced features - available to ADVANCED and PREMIUM plans
  INVOICE_GENERATION = "invoice_generation",
  ADVANCED_ANALYTICS = "advanced_analytics",
  INVENTORY_ALERTS = "inventory_alerts",
  NOTIFICATIONS = "notifications",
  CUSTOM_DOMAIN = "custom_domain",

  // Premium features - available only to PREMIUM plan
  AI_PREDICTIONS = "ai_predictions",
  API_ACCESS = "api_access",
  CUSTOM_BRANDING = "custom_branding",
  PRIORITY_SUPPORT = "priority_support",
  BULK_OPERATIONS = "bulk_operations",
}

// Define feature availability by plan
const PLAN_FEATURES: Record<string, Set<Feature>> = {
  STANDARD: new Set([
    Feature.PRODUCTS_MANAGEMENT,
    Feature.CATEGORIES_MANAGEMENT,
    Feature.ORDERS_VIEW,
    Feature.CUSTOMERS_VIEW,
    Feature.SHOP_SETTINGS,
  ]),

  ADVANCED: new Set([
    // Include all STANDARD features
    Feature.PRODUCTS_MANAGEMENT,
    Feature.CATEGORIES_MANAGEMENT,
    Feature.ORDERS_VIEW,
    Feature.CUSTOMERS_VIEW,
    Feature.SHOP_SETTINGS,

    // Add ADVANCED features
    Feature.INVOICE_GENERATION,
    Feature.ADVANCED_ANALYTICS,
    Feature.INVENTORY_ALERTS,
    Feature.NOTIFICATIONS,
    Feature.CUSTOM_DOMAIN,
  ]),

  PREMIUM: new Set([
    // Include all STANDARD and ADVANCED features
    Feature.PRODUCTS_MANAGEMENT,
    Feature.CATEGORIES_MANAGEMENT,
    Feature.ORDERS_VIEW,
    Feature.CUSTOMERS_VIEW,
    Feature.SHOP_SETTINGS,
    Feature.INVOICE_GENERATION,
    Feature.ADVANCED_ANALYTICS,
    Feature.INVENTORY_ALERTS,
    Feature.NOTIFICATIONS,
    Feature.CUSTOM_DOMAIN,

    // Add PREMIUM features
    Feature.AI_PREDICTIONS,
    Feature.API_ACCESS,
    Feature.CUSTOM_BRANDING,
    Feature.PRIORITY_SUPPORT,
    Feature.BULK_OPERATIONS,
  ]),
};

// Define feature limits by plan
export const PLAN_LIMITS = {
  STANDARD: {
    maxProducts: 100,
    maxCategories: 20,
    maxVariantsPerProduct: 10,
  },
  ADVANCED: {
    maxProducts: 1000,
    maxCategories: 100,
    maxVariantsPerProduct: 30,
  },
  PREMIUM: {
    maxProducts: -1, // Unlimited
    maxCategories: -1, // Unlimited
    maxVariantsPerProduct: -1, // Unlimited
  },
};

// Define role features
const ROLE_ACCESS: Record<string, Record<Feature, boolean>> = {
  SHOP_ADMIN: {
    // Shop admins can access all features available to their plan
    [Feature.PRODUCTS_MANAGEMENT]: true,
    [Feature.CATEGORIES_MANAGEMENT]: true,
    [Feature.ORDERS_VIEW]: true,
    [Feature.CUSTOMERS_VIEW]: true,
    [Feature.SHOP_SETTINGS]: true,
    [Feature.INVOICE_GENERATION]: true,
    [Feature.ADVANCED_ANALYTICS]: true,
    [Feature.INVENTORY_ALERTS]: true,
    [Feature.NOTIFICATIONS]: true,
    [Feature.CUSTOM_DOMAIN]: true,
    [Feature.AI_PREDICTIONS]: true,
    [Feature.API_ACCESS]: true,
    [Feature.CUSTOM_BRANDING]: true,
    [Feature.PRIORITY_SUPPORT]: true,
    [Feature.BULK_OPERATIONS]: true,
  },

  SHOP_STAFF: {
    // Staff have limited access
    [Feature.PRODUCTS_MANAGEMENT]: true,
    [Feature.CATEGORIES_MANAGEMENT]: true,
    [Feature.ORDERS_VIEW]: true,
    [Feature.CUSTOMERS_VIEW]: true,
    [Feature.SHOP_SETTINGS]: false, // Cannot modify shop settings
    [Feature.INVOICE_GENERATION]: true,
    [Feature.ADVANCED_ANALYTICS]: true,
    [Feature.INVENTORY_ALERTS]: true,
    [Feature.NOTIFICATIONS]: true,
    [Feature.CUSTOM_DOMAIN]: false, // Cannot modify domain settings
    [Feature.AI_PREDICTIONS]: true,
    [Feature.API_ACCESS]: false, // Cannot access API
    [Feature.CUSTOM_BRANDING]: false, // Cannot modify branding
    [Feature.PRIORITY_SUPPORT]: true,
    [Feature.BULK_OPERATIONS]: true,
  },

  CUSTOMER: {
    // Customers have no access to these features
    [Feature.PRODUCTS_MANAGEMENT]: false,
    [Feature.CATEGORIES_MANAGEMENT]: false,
    [Feature.ORDERS_VIEW]: false,
    [Feature.CUSTOMERS_VIEW]: false,
    [Feature.SHOP_SETTINGS]: false,
    [Feature.INVOICE_GENERATION]: false,
    [Feature.ADVANCED_ANALYTICS]: false,
    [Feature.INVENTORY_ALERTS]: false,
    [Feature.NOTIFICATIONS]: false,
    [Feature.CUSTOM_DOMAIN]: false,
    [Feature.AI_PREDICTIONS]: false,
    [Feature.API_ACCESS]: false,
    [Feature.CUSTOM_BRANDING]: false,
    [Feature.PRIORITY_SUPPORT]: false,
    [Feature.BULK_OPERATIONS]: false,
  },

  SUPER_ADMIN: {
    // Super admins have access to everything
    [Feature.PRODUCTS_MANAGEMENT]: true,
    [Feature.CATEGORIES_MANAGEMENT]: true,
    [Feature.ORDERS_VIEW]: true,
    [Feature.CUSTOMERS_VIEW]: true,
    [Feature.SHOP_SETTINGS]: true,
    [Feature.INVOICE_GENERATION]: true,
    [Feature.ADVANCED_ANALYTICS]: true,
    [Feature.INVENTORY_ALERTS]: true,
    [Feature.NOTIFICATIONS]: true,
    [Feature.CUSTOM_DOMAIN]: true,
    [Feature.AI_PREDICTIONS]: true,
    [Feature.API_ACCESS]: true,
    [Feature.CUSTOM_BRANDING]: true,
    [Feature.PRIORITY_SUPPORT]: true,
    [Feature.BULK_OPERATIONS]: true,
  },
};

interface User {
  role: string;
  planType?: string | null;
  shopId?: string | null;
}

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  user: User | null | undefined,
  feature: Feature
): boolean {
  if (!user) return false;

  // Super admins always have access to every feature
  if (user.role === "SUPER_ADMIN") {
    return true;
  }

  // Check if user has a shop, except for SUPER_ADMIN
  if (!user.shopId && user.role !== "SUPER_ADMIN") {
    return false;
  }

  // Check if the user's role has access to the feature
  const roleAccess = ROLE_ACCESS[user.role]?.[feature] || false;

  // If role doesn't have access, deny immediately
  if (!roleAccess) {
    return false;
  }

  // Check if the feature is included in the user's plan
  const planType = user.planType || "STANDARD"; // Default to STANDARD if not specified
  const planFeatures = PLAN_FEATURES[planType];

  // Return whether the feature is available in the user's plan
  return planFeatures?.has(feature) || false;
}

/**
 * Check if user is within plan limits
 */
export function isWithinPlanLimits(
  user: User | null | undefined,
  limit: keyof typeof PLAN_LIMITS.STANDARD,
  currentCount: number
): boolean {
  if (!user || !user.planType) return false;

  const planLimits =
    PLAN_LIMITS[user.planType as keyof typeof PLAN_LIMITS] ||
    PLAN_LIMITS.STANDARD;
  const maxLimit = planLimits[limit];

  // -1 means unlimited
  if (maxLimit === -1) return true;

  return currentCount < maxLimit;
}

/**
 * Get features available to a user
 */
export function getAvailableFeatures(user: User | null | undefined): Feature[] {
  if (!user) return [];

  // Super admins have access to all features
  if (user.role === "SUPER_ADMIN") {
    return Object.values(Feature);
  }

  // Get features based on plan and filter by role access
  const planType = user.planType || "STANDARD";
  const planFeatures = Array.from(
    PLAN_FEATURES[planType] || PLAN_FEATURES.STANDARD
  );

  // Filter by role access
  return planFeatures.filter(
    (feature) => ROLE_ACCESS[user.role]?.[feature] || false
  );
}

/**
 * Get plan limit for a specific limit type
 */
export function getPlanLimit(
  user: User | null | undefined,
  limit: keyof typeof PLAN_LIMITS.STANDARD
): number {
  if (!user || !user.planType) return PLAN_LIMITS.STANDARD[limit];

  const planLimits =
    PLAN_LIMITS[user.planType as keyof typeof PLAN_LIMITS] ||
    PLAN_LIMITS.STANDARD;

  return planLimits[limit];
}
