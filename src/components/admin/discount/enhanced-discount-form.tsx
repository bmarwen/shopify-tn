// src/components/admin/discount/enhanced-discount-form.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Import our modular components
import EnhancedProductSearchSelect from "./enhanced-product-search-select";
import DiscountPreview from "./discount-preview";
import S3ImageUpload from "./s3-image-upload";
import AvailabilitySwitches from "./availability-switches";
import DiscountHelpCard from "./discount-help-card";

// Import validation schema
import { discountSchema, type DiscountFormValues } from "@/lib/validations/discount";
import { formatCurrency } from "@/lib/utils/currency";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  variants: {
    id: string;
    name: string;
    price: number;
    sku?: string;
    barcode?: string;
    inventory: number;
    options: Record<string, string>;
  }[];
}

interface ProductForForm {
  id: string;
  name: string;
  price: number;
  sku?: string;
  barcode?: string;
}

interface Discount {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  percentage: number;
  enabled: boolean;
  startDate: string | Date;
  endDate: string | Date;
  productId?: string;
  variantId?: string; // Add variant ID support
  availableOnline: boolean;
  availableInStore: boolean;
  product?: {
    id: string;
    name: string;
    variants: {
      id: string;
      name: string;
      price: number;
    }[];
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    product: {
      id: string;
      name: string;
    };
  };
}

interface EnhancedDiscountFormProps {
  discount?: Discount;
  products: Product[];
  shopId: string;
  shopSettings?: {
    currency: string;
  };
  isEditing?: boolean;
}

export default function EnhancedDiscountForm({
  discount,
  products,
  shopId,
  shopSettings = { currency: 'DT' },
  isEditing = false,
}: EnhancedDiscountFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Add a ref to track if form was successfully submitted
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Transform products to match form interface (memoized to prevent infinite loops)
  const productsForForm: Product[] = useMemo(
    () => products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      variants: product.variants.map(variant => ({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory: variant.inventory || 0,
        options: variant.options || {},
      })),
    })),
    [products]
  );

  // Initial selected product (memoized to prevent re-renders)
  const initialSelectedProduct = useMemo(() => {
    if (discount?.product) {
      return {
        id: discount.product.id,
        name: discount.product.name,
        price: discount.product.variants[0]?.price || 0,
      };
    }
    return null;
  }, [discount]);

  const [selectedProduct, setSelectedProduct] = useState<ProductForForm | null>(initialSelectedProduct);

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];
  
  // Default values for the form (memoized to prevent re-renders)
  const defaultValues: DiscountFormValues = useMemo(() => {
    if (discount) {
      return {
        productId: discount.productId || "",
        variantId: discount.variantId || "",
        title: discount.title || "",
        description: discount.description || "",
        image: discount.image || "",
        percentage: discount.percentage,
        enabled: discount.enabled,
        startDate: new Date(discount.startDate).toISOString().split("T")[0],
        endDate: new Date(discount.endDate).toISOString().split("T")[0],
        availableOnline: discount.availableOnline,
        availableInStore: discount.availableInStore,
      };
    }
    return {
      productId: "",
      variantId: "",
      title: "",
      description: "",
      image: "",
      percentage: 10,
      enabled: true,
      startDate: today,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // Default to 30 days from now
      availableOnline: true,
      availableInStore: true,
    };
  }, [discount, today]);

  // Create form
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues,
  });

  // Watch the product ID to update the selected product
  const productId = form.watch("productId");
  const percentage = form.watch("percentage");
  const discountImage = form.watch("image");

  // Update selected product when productId changes
  useEffect(() => {
    if (productId) {
      const product = productsForForm.find((p) => p.id === productId);
      if (product) {
        setSelectedProduct(prevSelected => {
          if (!prevSelected || prevSelected.id !== product.id) {
            return product;
          }
          return prevSelected;
        });
      }
    } else {
      setSelectedProduct(prevSelected => {
        return prevSelected ? null : prevSelected;
      });
    }
  }, [productId, productsForForm]);

  // Form submission handler
  const onSubmit = async (values: DiscountFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = isEditing
        ? `/api/discounts/${discount?.id}`
        : "/api/discounts";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save discount");
      }

      // Mark form as successfully submitted
      setFormSubmitted(true);

      // Redirect to the discounts list page
      router.push("/admin/discounts");
      router.refresh();
    } catch (error: any) {
      console.error("Error saving discount:", error);
      setSubmitError(error.message || "An error occurred while saving");
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
                <CardTitle className="text-xl font-semibold">
                  Discount Details
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Configure your product discount offer
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-4 bg-white">
                {/* Product/Variant Selection with Search - Only show in create mode */}
                {!isEditing && (
                  <EnhancedProductSearchSelect
                    products={productsForForm}
                    currency={shopSettings.currency}
                    disabled={isEditing}
                    control={form.control}
                    productName="productId"
                    variantName="variantId"
                  />
                )}

                {/* Show selected product in edit mode */}
                {isEditing && selectedProduct && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Product</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(selectedProduct.price, shopSettings.currency)}
                          {selectedProduct.sku && ` • SKU: ${selectedProduct.sku}`}
                          {selectedProduct.barcode && ` • Barcode: ${selectedProduct.barcode}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">Cannot be changed</span>
                    </div>
                  </div>
                )}

                {/* Title and Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Discount Title
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Summer Sale 2024"
                            className="border-gray-300 focus:border-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Optional title for marketing purposes
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Discount Percentage *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            className="border-gray-300 focus:border-blue-500"
                            {...field}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Enter percentage (1-100%)
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your discount offer..."
                          className="border-gray-300 focus:border-blue-500 min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600">
                        Optional description for customers
                      </FormDescription>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />

                {/* Image Upload with S3 */}
                <S3ImageUpload
                  control={form.control}
                  name="image"
                  currentImage={discount?.image}
                  onError={setSubmitError}
                  formSubmitted={formSubmitted}
                />

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Start Date *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={today}
                            className="border-gray-300 focus:border-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          When the discount starts
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          End Date *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={form.watch("startDate") || today}
                            className="border-gray-300 focus:border-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          When the discount ends
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Availability Options */}
                <AvailabilitySwitches control={form.control} />
              </CardContent>
            </Card>
          </div>

          {/* Preview Sidebar */}
          <div className="space-y-6">
            <DiscountPreview
              selectedProduct={selectedProduct}
              percentage={percentage}
              currency={shopSettings.currency}
              discountImage={discountImage}
            />
            
            <DiscountHelpCard />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/discounts")}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 px-6"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Update Discount"
              : "Create Discount"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
