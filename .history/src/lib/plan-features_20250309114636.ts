// src/lib/plan-features.ts
import { PlanType } from "@prisma/client";

export interface PlanFeatures {
  maxProducts: number;
  maxCategories: number;
  analytics: boolean;
  advancedReporting: boolean;
  invoiceGeneration: boolean;
  inventoryAlerts: boolean;
  aiPredictions: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  STANDARD: {
    maxProducts: 100,
    maxCategories: 20,
    analytics: false,
    advancedReporting: false,
    invoiceGeneration: false,
    inventoryAlerts: false,
    aiPredictions: false,
    customDomain: false,
    apiAccess: false,
    customBranding: false,
    prioritySupport: false,
  },
  ADVANCED: {
    maxProducts: 1000,
    maxCategories: 100,
    analytics: true,
    advancedReporting: true,
    invoiceGeneration: true,
    inventoryAlerts: true,
    aiPredictions: false,
    customDomain: true,
    apiAccess: false,
    customBranding: false,
    prioritySupport: false,
  },
  PREMIUM: {
    maxProducts: -1, // Unlimited
    maxCategories: -1, // Unlimited
    analytics: true,
    advancedReporting: true,
    invoiceGeneration: true,
    inventoryAlerts: true,
    aiPredictions: true,
    customDomain: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
  },
};

export function hasFeature(
  planType: PlanType,
  feature: keyof PlanFeatures
): boolean {
  return PLAN_FEATURES[planType][feature];
}

export function getMaxLimit(
  planType: PlanType,
  limit: "maxProducts" | "maxCategories"
): number {
  return PLAN_FEATURES[planType][limit];
}

export function isWithinLimits(
  planType: PlanType,
  feature: "maxProducts" | "maxCategories",
  currentCount: number
): boolean {
  const limit = getMaxLimit(planType, feature);

  // -1 means unlimited
  if (limit === -1) return true;

  return currentCount < limit;
}
