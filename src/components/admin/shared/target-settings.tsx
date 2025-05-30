// src/components/admin/shared/target-settings.tsx
"use client";

import { useState } from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";

// Import enhanced selectors
import EnhancedProductVariantSelect from "./enhanced-product-variant-select";
import EnhancedCustomerSelect from "./enhanced-customer-select";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku?: string;
  barcode?: string;
  inventory: number;
  options: Record<string, string>;
}

interface Category {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  orders?: { id: string }[]; // For filtering
}

interface TargetSettingsProps {
  form: any; // React Hook Form instance
  products: Product[];
  categories: Category[];
  customers?: Customer[]; // Only for discount codes
  shopSettings: {
    currency: string;
  };
  isEditing?: boolean;
  type: "discount" | "discount-code"; // To determine available options
}

export default function TargetSettings({
  form,
  products,
  categories,
  customers = [],
  shopSettings,
  isEditing = false,
  type,
}: TargetSettingsProps) {
  // Watch target type to conditionally show fields
  const targetType = form.watch("targetType");

  // Get available target options based on type
  const getTargetOptions = () => {
    const baseOptions = [
      { value: "all", label: "All Products" },
      { value: "category", label: "Specific Category" },
      { value: "products", label: "Specific Products/Variants" },
    ];

    if (type === "discount") {
      // For discounts, don't include single product option anymore
      return baseOptions;
    } else {
      // For discount codes, add customer targeting
      baseOptions.push({ value: "customers", label: "Specific Customers" });
    }

    return baseOptions;
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Package className="mr-2 h-5 w-5" />
          Target Settings
        </CardTitle>
        <CardDescription className="text-blue-100">
          Choose what this {type === "discount" ? "discount" : "discount code"} applies to
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6 bg-white">
        <FormField
          control={form.control}
          name="targetType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium">
                Apply {type === "discount" ? "Discount" : "Discount Code"} To *
              </FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isEditing} // Disable changing target type in edit mode
              >
                <FormControl>
                  <SelectTrigger className="border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder="Select target type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getTargetOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-gray-600">
                Choose the scope of this {type === "discount" ? "discount" : "discount code"}
                {isEditing && (
                  <span className="text-orange-600 block mt-1">
                    ⚠️ Target type cannot be changed when editing
                  </span>
                )}
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />

        {/* Category Selection */}
        {targetType === "category" && (
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  Category *
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-gray-600">
                  All products in this category will be eligible
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
        )}

        {/* Product/Variant Selection */}
        {targetType === "products" && (
          <FormField
            control={form.control}
            name="productIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  Products & Variants *
                </FormLabel>
                <FormControl>
                  <EnhancedProductVariantSelect
                    products={products}
                    selectedProductIds={field.value || []}
                    selectedVariantIds={form.watch("variantIds") || []}
                    onProductSelectionChange={field.onChange}
                    onVariantSelectionChange={(variantIds) => form.setValue("variantIds", variantIds)}
                    currency={shopSettings.currency}
                    placeholder="Search products or variants by name, SKU, or barcode (min 3 chars)..."
                  />
                </FormControl>
                <FormDescription className="text-gray-600">
                  Choose to target entire products or specific variants. Products: {field.value?.length || 0} selected, Variants: {form.watch("variantIds")?.length || 0} selected
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
        )}

        {/* Single Product Selection - Removed (Legacy cleanup) */}

        {/* Customer Selection (for discount codes only) */}
        {targetType === "customers" && type === "discount-code" && (
          <FormField
            control={form.control}
            name="userIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">
                  Customers *
                </FormLabel>
                <FormControl>
                  <EnhancedCustomerSelect
                    customers={customers}
                    selectedCustomerIds={field.value || []}
                    onSelectionChange={field.onChange}
                    placeholder="Search customers by name or email (min 3 chars)..."
                  />
                </FormControl>
                <FormDescription className="text-gray-600">
                  This code will only work for the selected customers. Selected: {field.value?.length || 0} customers
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
