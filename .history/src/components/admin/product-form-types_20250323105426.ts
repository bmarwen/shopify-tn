// src/components/admin/product-form-types.ts
import { z } from "zod";

// Custom field value matching your database model
export interface CustomFieldValue {
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
  price: z.coerce
    .number()
    .min(0, { message: "Price must be a positive number" }),
  compareAtPrice: z.coerce.number().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  barcode: z.string().optional(),
  inventory: z.coerce.number().int().default(0),
  tva: z.coerce.number().min(0).max(100).default(19), // TVA field with default 19%
  categoryIds: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        price: z.coerce.number().min(0),
        inventory: z.coerce.number().int().default(0),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        options: z.record(z.string(), z.string()),
      })
    )
    .default([]),
  expiryDate: z.string().optional().nullable(),
  customFieldValues: z
    .array(
      z.object({
        id: z.string().optional(),
        customFieldId: z.string(),
        value: z.string(),
      })
    )
    .default([]),
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
