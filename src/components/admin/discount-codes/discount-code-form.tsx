// src/components/admin/discount-codes/discount-code-form.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Percent, Tag, Calendar, Users, Package, Shuffle, Image as ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Import validation schema
import { createDiscountCodeSchema, type DiscountCodeFormValues } from "@/lib/validations/discount-code";
import { formatCurrency } from "@/lib/utils/currency";

// Import shared components
import TargetSettings from "../shared/target-settings";
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

interface User {
  id: string;
  name: string;
  email: string;
}

interface DiscountCode {
  id: string;
  code: string;
  title?: string;
  description?: string;
  image?: string;
  percentage: number;
  isActive: boolean;
  startDate: string | Date;
  endDate: string | Date;
  categoryId?: string;
  userId?: string;
  usageLimit?: number;
  usedCount: number;
  availableOnline?: boolean;
  availableInStore?: boolean;
  products: Product[];
  variants: ProductVariant[];
  category?: Category;
  user?: User;
}

interface DiscountCodeFormProps {
  discountCode?: DiscountCode;
  products: Product[];
  categories: Category[];
  users: User[];
  shopId: string;
  shopSettings?: {
    currency: string;
  };
  isEditing?: boolean;
}

export default function DiscountCodeForm({
  discountCode,
  products,
  categories,
  users,
  shopId,
  shopSettings = { currency: 'DT' },
  isEditing = false,
}: DiscountCodeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(
    discountCode?.image || null
  );
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];

  // Determine target type from existing data
  const getTargetType = () => {
    if (!discountCode) return "all";
    if (discountCode.user) return "customers";
    if (discountCode.category) return "category";
    if (discountCode.products && discountCode.products.length > 0) return "products";
    return "all";
  };

  // Default values for the form
  const defaultValues: DiscountCodeFormValues = useMemo(() => {
    if (discountCode) {
      return {
        code: discountCode.code,
        title: discountCode.title || "",
        description: discountCode.description || "",
        image: discountCode.image || "",
        percentage: discountCode.percentage,
        isActive: discountCode.isActive,
        startDate: new Date(discountCode.startDate).toISOString().split("T")[0],
        endDate: new Date(discountCode.endDate).toISOString().split("T")[0],
        targetType: getTargetType(),
        categoryId: discountCode.category?.id || "",
        productIds: discountCode.products?.map(p => p.id) || [],
        variantIds: discountCode.variants?.map(v => v.id) || [],
        userIds: discountCode.user ? [discountCode.user.id] : [],
        usageLimit: discountCode.usageLimit ?? undefined,
        usedCount: discountCode.usedCount,
        availableOnline: discountCode.availableOnline ?? true,
        availableInStore: discountCode.availableInStore ?? true,
      };
    }
    return {
      code: "",
      title: "",
      description: "",
      image: "",
      percentage: 10,
      isActive: true,
      startDate: today,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      targetType: "all",
      categoryId: "",
      productIds: [],
      variantIds: [],
      userIds: [],
      usageLimit: undefined,
      usedCount: 0,
      availableOnline: true,
      availableInStore: true,
    };
  }, [discountCode, today]);

  // Create form with context for validation
  const form = useForm<DiscountCodeFormValues>({
    resolver: zodResolver(createDiscountCodeSchema(isEditing)),
    defaultValues,
  });

  // Watch target type to conditionally show fields
  const targetType = form.watch("targetType");

  // Generate random code
  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("code", result);
  };

  // Handle active status toggle with confirmation in edit mode
  const handleActiveToggle = (newValue: boolean) => {
    // If editing and trying to deactivate (from true to false), show confirmation
    if (isEditing && form.getValues("isActive") === true && newValue === false) {
      setShowDeactivateDialog(true);
    } else {
      form.setValue("isActive", newValue);
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
    form.setValue("isActive", false);
    setShowDeactivateDialog(false);
  };

  // Cancel deactivation
  const cancelDeactivation = () => {
    setShowDeactivateDialog(false);
  };

  // Form submission handler
  const onSubmit = async (values: DiscountCodeFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = isEditing
        ? `/api/discount-codes/${discountCode?.id}`
        : "/api/discount-codes";
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
        throw new Error(errorData.error || "Failed to save discount code");
      }

      router.push("/admin/discount-codes");
      router.refresh();
    } catch (error: any) {
      console.error("Error saving discount code:", error);
      setSubmitError(error.message || "An error occurred while saving");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
                  <CardTitle className="text-xl font-semibold flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    Discount Code Details
                  </CardTitle>
                  <CardDescription className="text-purple-100">
                    Configure your discount code settings
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-4 bg-white">
                  {/* Code and Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">
                            Discount Code *
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                placeholder="e.g., SAVE20"
                                className="border-gray-300 focus:border-purple-500 font-mono uppercase"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={generateCode}
                              className="px-3"
                            >
                              <Shuffle className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormDescription className="text-gray-600">
                            Unique code customers will enter. Letters, numbers, hyphens, and underscores only.
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
                                className="border-gray-300 focus:border-purple-500 pr-8"
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
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Title (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Summer Sale 2024"
                            className="border-gray-300 focus:border-purple-500"
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Description (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe this discount code..."
                            className="border-gray-300 focus:border-purple-500 min-h-[80px]"
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
                          Discount Code Image (Optional)
                        </FormLabel>
                        <FormControl>
                          <S3ImageUpload
                            value={uploadedImageUrl || field.value}
                            onChange={(url) => {
                              setUploadedImageUrl(url);
                              field.onChange(url);
                            }}
                            folder="discount-codes"
                            shopId={shopId}
                            maxWidth={800}
                            maxHeight={600}
                            className="border-gray-300 focus:border-purple-500"
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Upload an image to represent this discount code (recommended: 400x300px)
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
                              className="border-gray-300 focus:border-purple-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-600">
                            When the code becomes active
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
                              className="border-gray-300 focus:border-purple-500"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-600">
                            When the code expires
                          </FormDescription>
                          <FormMessage className="text-red-600" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Usage Limit */}
                  <FormField
                    control={form.control}
                    name="usageLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Usage Limit (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Leave empty for unlimited"
                            className="border-gray-300 focus:border-purple-500"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                              field.onChange(value);
                            }}
                            value={field.value === null || field.value === undefined ? "" : field.value}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Maximum number of times this code can be used
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

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
                              Show this code in online store
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
                              Show this code in POS system
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
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            Active Status
                          </FormLabel>
                          <FormDescription>
                            Enable or disable this discount code
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={handleActiveToggle}
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
                customers={users}
                shopSettings={shopSettings}
                isEditing={isEditing}
                type="discount-code"
              />
            </div>

            {/* Preview Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                  <CardTitle className="text-lg font-semibold">
                    Code Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 bg-white">
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="font-mono text-2xl font-bold text-purple-600">
                        {form.watch("code") || "YOUR-CODE"}
                      </div>
                      <div className="text-lg font-semibold text-green-600 mt-2">
                        {form.watch("percentage") || 10}% OFF
                      </div>
                    </div>
                    
                    {form.watch("title") && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Title</h4>
                        <p className="text-gray-900">{form.watch("title")}</p>
                      </div>
                    )}

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
                        {targetType === "customers" && "Specific Customers"}
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
                          form.watch("isActive")
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {form.watch("isActive") ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {form.watch("usageLimit") && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Usage</h4>
                        <p className="text-gray-900">
                          {isEditing ? `${discountCode?.usedCount || 0}/` : "0/"}
                          {form.watch("usageLimit")} uses
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-blue-900">
                      💡 Tips for Discount Codes
                    </h3>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Keep codes short and memorable</li>
                      <li>• Use descriptive names for campaigns</li>
                      <li>• Set appropriate usage limits</li>
                      <li>• Search products with min 3 characters</li>
                      <li>• Test codes before sharing</li>
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

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/discount-codes")}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 px-6"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Update Code"
                : "Create Code"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Deactivation Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Discount Code?</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this discount code? This will prevent customers from using it until you activate it again.
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
