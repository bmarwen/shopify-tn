// src/types/product.ts

export interface Category {
  id: string;
  name: string;
  slug: string;
  level?: number;
  parentId?: string | null;
}

export interface ProductVariant {
  id?: string;
  name: string;
  price: number;    // Required - each variant must have a price
  cost?: number;    // Optional cost for this variant
  tva: number;      // TVA for this variant, default 19%
  inventory: number; // Stock for this specific variant
  sku?: string;     // Optional SKU for this variant
  barcode?: string; // Optional barcode for this variant
  images?: string[]; // Variant-specific images
  options: Record<string, any>; // Required variant options {color: "Red", size: "XL", etc}
}

export interface CustomField {
  id?: string;
  customFieldId: string;
  value: string;
  customField?: {
    id: string;
    name: string;
    type: string;
    required?: boolean;
  };
}

export interface Discount {
  id?: string;
  percentage: number;
  enabled?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
  productId?: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  sku?: string;            // Optional base SKU
  barcode?: string;        // Optional base barcode
  weight?: number | null;
  dimensions?: Record<string, any> | null;
  images: string[];        // Common product images
  expiryDate?: string | Date | null;
  categories: Category[];
  variants: ProductVariant[]; // All pricing/inventory is in variants
  customFields: CustomField[];
  _count: {
    variants: number;
    orderItems: number;
  };
  discounts: Discount[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ProductResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  stats: {
    totalInventory: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  filter: {
    lowStockThreshold: number;
  };
  viewMode: string;
}

export interface ProductFormValues {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  weight?: number | null;
  dimensions?: Record<string, any>;
  categoryIds: string[];
  images: string[];
  variants: ProductVariant[]; // Required - at least one variant
  expiryDate?: string | null;
  customFieldValues: CustomField[];
}

export interface ProductFiltersType {
  search?: string;
  category?: string;
  inStock?: string;
  lowStock?: string;
  page?: string;
  perPage?: string;
  sort?: string;
  order?: string;
}
