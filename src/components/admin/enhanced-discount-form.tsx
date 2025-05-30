// src/components/admin/enhanced-discount-form.tsx
"use client";

import { useState, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Package, Tag, Calendar, Percent, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Import validation schema
import { createDiscountSchema, type DiscountFormValues } from "@/lib/validations/discount";

// Import new shared component
import TargetSettings from "./shared/target-settings";
import S3ImageUpload from "@/components/ui/image-upload/s3-image-upload";

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

interface Discount {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  percentage: number;
  enabled: boolean;
  startDate: string | Date;
  endDate: string | Date;
  availableOnline: boolean;
  availableInStore: boolean;
  // Legacy fields
  productId?: string;
  variantId?: string;
  product?: Product;
  variant?: ProductVariant;
  // Multi-targeting fields
  products?: Product[];
  variants?: ProductVariant[];
  categoryId?: string;
  category?: Category;
}

interface EnhancedDiscountFormProps {
  discount?: Discount;
  products: Product[];
  categories: Category[];
  shopId: string;
  shopSettings?: {
    currency: string;
  };
  isEditing?: boolean;
}

export default function EnhancedDiscountForm({
  discount,
  products,
  categories,
  shopId,
  shopSettings = { currency: 'DT' },
  isEditing = false,
}: EnhancedDiscountFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
    discount?.image || null
  );
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];

  // Determine target type from existing data
  const getTargetType = () => {
    if (!discount) return "all";
    if (discount.category) return "category";
    if (discount.products && discount.products.length > 0) return "products";
    if (discount.variants && discount.variants.length > 0) return "products";
    if (discount.productId) return "products"; // Map legacy single product to products
    return "all";
  };

  // Default values for the form
  const defaultValues: DiscountFormValues = useMemo(() => {
    if (discount) {
      return {
        targetType: getTargetType(),
        // Legacy single product fields - map to new structure
        productIds: discount.productId ? [discount.productId] : (discount.products?.map(p => p.id) || []),
        variantIds: discount.variantId ? [discount.variantId] : (discount.variants?.map(v => v.id) || []),
        categoryId: discount.category?.id || "",
        // Other fields
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
      targetType: "all",
      categoryId: "",
      productIds: [],
      variantIds: [],
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

  // Create form with context for validation
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(createDiscountSchema(isEditing)),
    defaultValues,
  });

  // Watch target type to conditionally show fields
  const targetType = form.watch("targetType");

  // Handle enabled status toggle with confirmation in edit mode
  const handleEnabledToggle = (newValue: boolean) => {
    // If editing and trying to deactivate (from true to false), show confirmation
    if (isEditing && form.getValues("enabled") === true && newValue === false) {
      setShowDeactivateDialog(true);
    } else {
      form.setValue("enabled", newValue);
    }
  };

  // Handle availability toggles with validation
  const handleAvailabilityToggle = (field: "availableOnline" | "availableInStore", newValue: boolean) => {
    form.setValue(field, newValue);
    // Trigger validation for both availability fields
    setTimeout(() => {
      form.trigger(["availableOnline", "availableInStore"]);
    }, 0);
  };

  // Confirm deactivation
  const confirmDeactivation = () => {
    form.setValue("enabled", false);
    setShowDeactivateDialog(false);
  };

  // Cancel deactivation
  const cancelDeactivation = () => {
    setShowDeactivateDialog(false);
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
        body: JSON.stringify({
          ...values,
          image: uploadedImageUrl || values.image,
          shopId,
        }),
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
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                  <CardTitle className="text-xl font-semibold flex items-center">
                    <Percent className="mr-2 h-5 w-5" />
                    Discount Details
                  </CardTitle>
                  <CardDescription className="text-green-100">
                    Configure your discount settings
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-6 bg-white">
                  {/* Title and Percentage */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">
                            Title (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Summer Sale"
                              className="border-gray-300 focus:border-green-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-600">
                            Optional title for internal organization
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
                            <div className="relative">
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                className="border-gray-300 focus:border-green-500 pr-8"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  field.onChange(value);
                                }}
                              />
                              <Percent className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                            </div>
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
                          Description (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe this discount..."
                            className="border-gray-300 focus:border-green-500 min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Optional description for internal reference
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  {/* Image Upload */}
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium flex items-center">
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Discount Image (Optional)
                        </FormLabel>
                        <FormControl>
                          <S3ImageUpload
                            value={uploadedImageUrl || field.value}
                            onChange={(url) => {
                              setUploadedImageUrl(url);
                              field.onChange(url);
                            }}
                            folder="discounts"
                            shopId={shopId}
                            maxWidth={800}
                            maxHeight={600}
                            className="border-gray-300 focus:border-green-500"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Upload an image to represent this discount (recommended: 400x300px)
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
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
                              min={isEditing ? undefined : today}
                              className="border-gray-300 focus:border-green-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-600">
                            When the discount becomes active
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
                              className="border-gray-300 focus:border-green-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-600">
                            When the discount expires
                          </FormDescription>
                          <FormMessage className="text-red-600" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Availability Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="availableOnline"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              Available Online
                            </FormLabel>
                            <FormDescription>
                              Show this discount in online store
                            </FormDescription>
                            <FormMessage className="text-red-600" />
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(newValue) => handleAvailabilityToggle("availableOnline", newValue)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="availableInStore"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              Available In-Store
                            </FormLabel>
                            <FormDescription>
                              Show this discount in POS system
                            </FormDescription>
                            <FormMessage className="text-red-600" />
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(newValue) => handleAvailabilityToggle("availableInStore", newValue)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Active Status */}
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            Active Status
                          </FormLabel>
                          <FormDescription>
                            Enable or disable this discount
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={handleEnabledToggle}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Targeting Options */}
              <TargetSettings
                form={form}
                products={products}
                categories={categories}
                shopSettings={shopSettings}
                isEditing={isEditing}
                type="discount"
              />
            </div>

            {/* Preview Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-lg">
                  <CardTitle className="text-lg font-semibold">
                    Discount Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 bg-white">
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="font-bold text-3xl text-orange-600">
                        {form.watch("percentage") || 10}% OFF
                      </div>
                      {form.watch("title") && (
                        <div className="text-lg font-semibold text-gray-800 mt-2">
                          {form.watch("title")}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Target</h4>
                      <p className="text-gray-900 capitalize">
                        {targetType === "all" && "All Products"}
                        {targetType === "category" && "Category"}
                        {targetType === "products" && (
                          <span>
                            {form.watch("productIds")?.length || 0} Product{(form.watch("productIds")?.length || 0) !== 1 ? 's' : ''}
                            {(form.watch("variantIds")?.length || 0) > 0 && (
                              <span className="text-purple-600 ml-1">
                                + {form.watch("variantIds")?.length || 0} Variant{(form.watch("variantIds")?.length || 0) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Availability</h4>
                      <div className="flex gap-2 mt-1">
                        {form.watch("availableOnline") && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Online
                          </span>
                        )}
                        {form.watch("availableInStore") && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            In-Store
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Status</h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.watch("enabled")
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {form.watch("enabled") ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-blue-900">
                      💡 Tips for Discounts
                    </h3>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Set appropriate date ranges for promotions</li>
                      <li>• Use category targeting for broad campaigns</li>
                      <li>• Target specific variants for clearance sales</li>
                      <li>• Search products with min 3 characters</li>
                      <li>• Consider online vs in-store availability</li>
                      <li>• Test discounts before activating</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Alert - Left side above buttons */}
          {submitError && (
            <div className="flex justify-start pt-4">
              <div className="w-1/2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t">
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
              className="bg-green-600 hover:bg-green-700 px-6"
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

      {/* Deactivation Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Discount?</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this discount? Make sure people wont be able to use it in this case.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeactivation}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeactivation}>
              Yes, Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
