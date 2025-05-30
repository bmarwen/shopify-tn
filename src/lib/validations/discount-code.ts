// src/lib/validations/discount-code.ts
import * as z from "zod";

// Create validation schema function that accepts isEditing parameter
export const createDiscountCodeSchema = (isEditing = false) => z.object({
  code: z
    .string()
    .min(6, "Code must be between 6 and 16 characters")
    .max(16, "Code must be between 6 and 16 characters")
    .regex(/^[A-Z0-9-_]+$/, "Code can only contain uppercase letters, numbers, hyphens, and underscores"),
  title: z.string().max(64, "Title cannot exceed 64 characters").optional(),
  description: z.string().max(512, "Description cannot exceed 512 characters").optional(),
  image: z.string().optional(),
  percentage: z
    .number()
    .min(1, "Discount must be at least 1%")
    .max(100, "Discount cannot exceed 100%"),
  isActive: z.boolean().default(true),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  targetType: z.enum(["all", "category", "products", "customers"]),
  categoryId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  variantIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(), // Changed from single userId to array
  usageLimit: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(1, "Usage limit must be between 1 and 100,000").max(100000, "Usage limit must be between 1 and 100,000").optional()
  ),
  usedCount: z.number().min(0).default(0),
  availableOnline: z.boolean().default(true),
  availableInStore: z.boolean().default(true),
}).refine((data) => {
  // At least one availability option must be selected
  return data.availableOnline || data.availableInStore;
}, {
  message: "At least one availability option (Online or In-Store) must be selected",
  path: ["availableOnline"],
}).refine((data) => {
  // Duplicate check for availableInStore path
  return data.availableOnline || data.availableInStore;
}, {
  message: "At least one availability option (Online or In-Store) must be selected",
  path: ["availableInStore"],
}).refine((data) => {
  // Only validate start date for new discount codes (when isEditing is false)
  // This allows editing of discount codes that have already started
  if (isEditing) return true;
  
  const startDate = new Date(data.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return startDate >= today;
}, {
  message: "Start date must be today or later",
  path: ["startDate"],
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => {
  if (data.targetType === "category") {
    return data.categoryId && data.categoryId.length > 0;
  }
  return true;
}, {
  message: "Category is required when targeting by category",
  path: ["categoryId"],
}).refine((data) => {
  if (data.targetType === "products") {
    // Require at least one product OR at least one variant
    const hasProducts = data.productIds && data.productIds.length > 0;
    const hasVariants = data.variantIds && data.variantIds.length > 0;
    return hasProducts || hasVariants;
  }
  return true;
}, {
  message: "At least one product or variant is required when targeting specific products",
  path: ["productIds"],
}).refine((data) => {
  if (data.targetType === "customers") {
    return data.userIds && data.userIds.length > 0;
  }
  return true;
}, {
  message: "At least one customer is required when targeting specific customers",
  path: ["userIds"],
});

// Default schema for backwards compatibility
export const discountCodeSchema = createDiscountCodeSchema(false);

export type DiscountCodeFormValues = z.infer<ReturnType<typeof createDiscountCodeSchema>>;
