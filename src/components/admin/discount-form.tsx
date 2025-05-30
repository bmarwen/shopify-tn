// src/components/admin/discount-form.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Switch } from "@/components/ui/switch";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, X, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/currency";

// Form schema
const discountSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  title: z.string().optional(),
  description: z.string().optional(),
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
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface Product {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    price: number;
  }[];
}

interface ProductForForm {
  id: string;
  name: string;
  price: number;
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
  productId: string;
  availableOnline: boolean;
  availableInStore: boolean;
  product: {
    id: string;
    name: string;
    variants: {
      id: string;
      name: string;
      price: number;
    }[];
  };
}

interface DiscountFormProps {
  discount?: Discount;
  products: Product[];
  shopId: string;
  isEditing?: boolean;
}

export default function DiscountForm({
  discount,
  products,
  isEditing = false,
}: DiscountFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Transform products to match form interface (memoized to prevent infinite loops)
  const productsForForm: ProductForForm[] = useMemo(
    () => products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.variants[0]?.price || 0,
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

  // Default values for the form (memoized to prevent re-renders)
  const defaultValues: DiscountFormValues = useMemo(() => {
    if (discount) {
      return {
        productId: discount.productId,
        percentage: discount.percentage,
        enabled: discount.enabled,
        startDate: new Date(discount.startDate).toISOString().split("T")[0],
        endDate: new Date(discount.endDate).toISOString().split("T")[0],
      };
    }
    return {
      productId: "",
      percentage: 10,
      enabled: true,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // Default to 30 days from now
    };
  }, [discount]);

  // Create form
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues,
  });

  // Watch the product ID to update the selected product
  const productId = form.watch("productId");
  const percentage = form.watch("percentage");

  // Update selected product when productId changes
  useEffect(() => {
    if (productId) {
      const product = productsForForm.find((p) => p.id === productId);
      if (product) {
        setSelectedProduct(prevSelected => {
          // Only update if the product is different
          if (!prevSelected || prevSelected.id !== product.id) {
            return product;
          }
          return prevSelected;
        });
      }
    } else {
      setSelectedProduct(prevSelected => {
        // Only update if there was a selected product
        return prevSelected ? null : prevSelected;
      });
    }
  }, [productId, productsForForm]);

  // Calculate discounted price for preview
  const getDiscountedPrice = (price: number, discountPercentage: number) => {
    if (!price || !discountPercentage) return price;
    const discount = (price * discountPercentage) / 100;
    return price - discount;
  };

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow">
            <CardHeader
              style={{ backgroundColor: "#2c3e50" }}
              className="text-white rounded-t-lg"
            >
              <CardTitle className="text-xl font-medium">
                Discount Details
              </CardTitle>
              <CardDescription
                style={{ color: "#bdc3c7" }}
                className="mt-1 text-base"
              >
                Configure your product discount
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4 bg-white">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      style={{ color: "#2c3e50" }}
                      className="font-medium text-base"
                    >
                      Product *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isEditing} // Disable changing product in edit mode
                    >
                      <FormControl>
                        <SelectTrigger
                          className="border-2"
                          style={{
                            borderColor: "#bdc3c7",
                            color: "#2c3e50",
                            backgroundColor: "white",
                          }}
                        >
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productsForForm.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} {product.price > 0 ? `(${product.price.toFixed(2)})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription style={{ color: "#7f8c8d" }}>
                      Select the product this discount applies to
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
                    <FormLabel
                      style={{ color: "#2c3e50" }}
                      className="font-medium text-base"
                    >
                      Discount Percentage *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="border-2"
                        style={{
                          borderColor: "#bdc3c7",
                          color: "#2c3e50",
                          backgroundColor: "white",
                        }}
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription style={{ color: "#7f8c8d" }}>
                      Enter a discount percentage (0-100)
                    </FormDescription>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        style={{ color: "#2c3e50" }}
                        className="font-medium text-base"
                      >
                        Start Date *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="border-2"
                          style={{
                            borderColor: "#bdc3c7",
                            color: "#2c3e50",
                            backgroundColor: "white",
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        style={{ color: "#2c3e50" }}
                        className="font-medium text-base"
                      >
                        End Date *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="border-2"
                          style={{
                            borderColor: "#bdc3c7",
                            color: "#2c3e50",
                            backgroundColor: "white",
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel
                        style={{ color: "#2c3e50" }}
                        className="font-medium text-base"
                      >
                        Active
                      </FormLabel>
                      <FormDescription style={{ color: "#7f8c8d" }}>
                        Enable or disable this discount
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedProduct && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-lg text-gray-800">
                    Discount Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 bg-white">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Product
                      </h3>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedProduct.name}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Original Price
                      </h3>
                      <p className="text-lg font-medium text-gray-900">
                        ${selectedProduct.price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Discount
                      </h3>
                      <p className="text-lg font-medium text-orange-600">
                        {percentage}%
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Discounted Price
                      </h3>
                      <p className="text-xl font-bold text-green-600">
                        $
                        {getDiscountedPrice(
                          selectedProduct.price,
                          percentage
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Savings
                      </h3>
                      <p className="text-lg font-medium text-red-600">
                        $
                        {(
                          selectedProduct.price -
                          getDiscountedPrice(selectedProduct.price, percentage)
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help section */}
            <Card className="border border-blue-200 shadow-sm">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <CardTitle className="text-lg text-blue-800">
                  About Discounts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 bg-white">
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>• Discounts apply to specific products</li>
                  <li>• Set a percentage discount (e.g., 10% off)</li>
                  <li>• Define a date range for your promotion</li>
                  <li>• Enable/disable discounts without deleting them</li>
                  <li>• Create multiple discounts for different products</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/discounts")}
            className="border-2"
            style={{
              borderColor: "#bdc3c7",
              color: "#2c3e50",
              backgroundColor: "white",
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: "#16a085",
              color: "white",
            }}
            className="font-semibold hover:opacity-90"
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
