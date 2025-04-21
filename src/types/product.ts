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
  price: number;
  inventory: number;
  sku?: string;
  barcode?: string;
  options: Record<string, any>;
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
  price: number;
  cost?: number | null;
  tva?: number;
  sku?: string;
  barcode?: string;
  inventory: number;
  lowStockAlert?: boolean;
  weight?: number | null;
  dimensions?: Record<string, any> | null;
  images: string[];
  expiryDate?: string | Date | null;
  categories: Category[];
  variants: ProductVariant[];
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
  price: number;
  cost?: number | null;
  barcode?: string;
  inventory: number;
  tva?: number;
  categoryIds: string[];
  images: string[];
  variants: ProductVariant[];
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
