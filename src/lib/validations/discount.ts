// src/lib/validations/discount.ts
import * as z from "zod";

// Create validation schema function that accepts isEditing parameter
export const createDiscountSchema = (isEditing = false) => z.object({
  // New multi-targeting support
  targetType: z.enum(["all", "category", "products"]).default("all"), // Remove single product option
  categoryId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  variantIds: z.array(z.string()).optional(),
  
  title: z.string().max(64, "Title cannot exceed 64 characters").optional(),
  description: z.string().max(512, "Description cannot exceed 512 characters").optional(),
  image: z.string().optional(),
  percentage: z
    .number()
    .min(1, "Discount must be at least 1%")
    .max(100, "Discount cannot exceed 100%"),
  enabled: z.boolean().default(true),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
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
  // Only validate start date for new discounts (when isEditing is false)
  // This allows editing of discounts that have already started
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
  // Validate targeting requirements
  if (data.targetType === "category") {
    return data.categoryId && data.categoryId.length > 0;
  }
  if (data.targetType === "products") {
    const hasProducts = data.productIds && data.productIds.length > 0;
    const hasVariants = data.variantIds && data.variantIds.length > 0;
    return hasProducts || hasVariants;
  }
  return true; // "all" requires no additional validation
}, {
  message: "Invalid targeting configuration",
  path: ["targetType"],
});

// Default schema for backwards compatibility
export const discountSchema = createDiscountSchema(false);

export type DiscountFormValues = z.infer<ReturnType<typeof createDiscountSchema>>;
