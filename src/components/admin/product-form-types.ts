// src/components/admin/product-form-types.ts
import { z } from "zod";

// Custom field value for variants
export interface VariantCustomFieldValue {
  id?: string;
  customFieldId: string;
  value: string;
}

// Form schema validation
export const productSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Product name must be at least 2 characters" }),
  description: z.string().optional(),
  sku: z.string().optional(),        // Optional base SKU
  barcode: z.string().optional(),    // Optional base barcode
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.record(z.string(), z.coerce.number()).optional(),
  categoryIds: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, { message: "Variant name is required" }),
        price: z.coerce.number().min(0, { message: "Price must be positive" }),
        cost: z.coerce.number().optional().nullable(),
        tva: z.coerce.number().min(0).max(100).default(19),
        inventory: z.coerce.number().int().min(0).default(0),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        options: z.record(z.string(), z.string()),
        customFieldValues: z
          .array(
            z.object({
              id: z.string().optional(),
              customFieldId: z.string(),
              value: z.string(),
            })
          )
          .default([]), // Move custom fields to variant level
      })
    )
    .min(1, { message: "At least one variant is required" }), // Products must have variants
  expiryDate: z.string().optional().nullable(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// Types for other components
export interface Category {
  id: string;
  name: string;
  level: number;
}

export interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

export interface ProductFormProps {
  product?: any;
  categories: Category[];
  customFields?: CustomField[];
  shopId: string;
  isEditing?: boolean;
}

// New type for discounts
export interface Discount {
  id?: string;
  percentage: number;
  enabled: boolean;
  startDate: Date | string;
  endDate: Date | string;
  productId: string;
}

// New type for discount codes
export interface DiscountCode {
  id?: string;
  code: string;
  percentage: number;
  startDate: Date | string;
  endDate: Date | string;
  shopId: string;
  productId?: string | null;
  userId?: string | null;
  isActive: boolean;
}
