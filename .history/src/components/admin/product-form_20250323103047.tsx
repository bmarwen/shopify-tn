// src/components/admin/product-form.tsx
// src/components/admin/product-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ProductVariantsForm from "./product-variants-form";
import ProductImagesUpload from "./product-images-upload";
import ProductCategoriesSelect from "./product-categories-select";
import ProductCustomFields from "./product-custom-fields";
import { slugify } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Custom field value matching your database model
interface CustomFieldValue {
  id?: string;
  customFieldId: string;
  value: string;
}

// Form schema validation
const productSchema = z.object({
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

type ProductFormValues = z.infer<typeof productSchema>;

// Types
interface Category {
  id: string;
  name: string;
  level: number;
}

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface ProductFormProps {
  product?: any;
  categories: Category[];
  customFields?: CustomField[];
  shopId: string;
  isEditing?: boolean;
}

export default function ProductForm({
  product,
  categories,
  customFields = [],
  shopId,
  isEditing = false,
}: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState<any>(null);

  // Transform custom field values from the product data format to form format
  const transformCustomFieldsForForm = (): CustomFieldValue[] => {
    if (!product || !product.customFields) return [];

    return product.customFields.map((cf: any) => ({
      id: cf.id,
      customFieldId: cf.customFieldId,
      value: cf.value,
    }));
  };

  // Default values
  const defaultValues: ProductFormValues = product
    ? {
        name: product.name,
        description: product.description || "",
        price: product.price,
        compareAtPrice: product.compareAtPrice || null,
        cost: product.cost || null,
        barcode: product.barcode || "",
        inventory: product.inventory,
        tva: product.tva || 19,
        categoryIds: product.categories?.map((c: any) => c.id) || [],
        images: product.images || [],
        variants: product.variants?.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          inventory: v.inventory,
          barcode: v.barcode || "",
          options: v.options,
        })) || [],
        expiryDate: product.expiryDate
          ? new Date(product.expiryDate).toISOString().split("T")[0]
          : null,
        customFieldValues: transformCustomFieldsForForm(),
      }
    : {
        name: "",
        description: "",
        price: 0,
        compareAtPrice: null,
        cost: null,
        inventory: 0,
        tva: 19,
        categoryIds: [],
        images: [],
        variants: [],
        expiryDate: null,
        customFieldValues: [],
      };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  // Store form data when changing tabs to prevent loss of unsaved changes
  useEffect(() => {
    if (formData) {
      // Restore form data from state
      Object.keys(formData).forEach((key) => {
        form.setValue(key as any, formData[key]);
      });
    }
  }, [formData, form]);

  // Handle tab change - ensure changes are persisted
  const handleTabChange = (value: string) => {
    // Save current form state before switching tabs
    const currentValues = form.getValues();
    setFormData(currentValues);
    setActiveTab(value);
  };

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Auto-generate the slug
      const slug = slugify(values.name);

      const url = isEditing ? `/api/products/${product.id}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          slug,
          shopId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      router.push(`/admin/products`);
      router.refresh();
    } catch (error: any) {
      console.error("Error saving product:", error);
      setSubmitError(
        error.message || "An error occurred while saving the product"
      );
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

        {/* Global styles for input fields */}
        <style jsx global>{`
          input,
          textarea,
          select {
            color: #2c3e50 !important;
            background-color: white !important;
          }

          input::placeholder,
          textarea::placeholder {
            color: #bdc3c7 !important;
          }
        `}</style>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="mb-6 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger
              className="rounded-md"
              style={{
                backgroundColor:
                  activeTab === "basic" ? "#2c3e50" : "transparent",
                color: activeTab === "basic" ? "white" : "#2c3e50",
              }}
              value="basic"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md"
              style={{
                backgroundColor:
                  activeTab === "images" ? "#2c3e50" : "transparent",
                color: activeTab === "images" ? "white" : "#2c3e50",
              }}
              value="images"
            >
              Images
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md"
              style={{
                backgroundColor:
                  activeTab === "pricing" ? "#2c3e50" : "transparent",
                color: activeTab === "pricing" ? "white" : "#2c3e50",
              }}
              value="pricing"
            >
              Pricing & Inventory
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md"
              style={{
                backgroundColor:
                  activeTab === "categories" ? "#2c3e50" : "transparent",
                color: activeTab === "categories" ? "white" : "#2c3e50",
              }}
              value="categories"
            >
              Categories
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md"
              style={{
                backgroundColor:
                  activeTab === "variants" ? "#2c3e50" : "transparent",
                color: activeTab === "variants" ? "white" : "#2c3e50",
              }}
              value="variants"
            >
              Variants
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md"
              style={{
                backgroundColor:
                  activeTab === "custom-fields" ? "#2c3e50" : "transparent",
                color: activeTab === "custom-fields" ? "white" : "#2c3e50",
              }}
              value="custom-fields"
            >
              Custom Fields
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card className="border-0 shadow">
              <CardHeader
                style={{ backgroundColor: "#2c3e50" }}
                className="text-white rounded-t-lg"
              >
                <CardTitle className="text-xl font-medium">
                  Basic Information
                </CardTitle>
                <CardDescription
                  style={{ color: "#bdc3c7" }}
                  className="mt-1 text-base"
                >
                  Enter the basic details about your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 bg-white">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        style={{ color: "#2c3e50" }}
                        className="font-medium text-base"
                      >
                        Product Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          className="border-2"
                          style={{
                            borderColor: "#bdc3c7",
                            color: "#2c3e50",
                            backgroundColor: "white",
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription style={{ color: "#7f8c8d" }}>
                        A slug will be automatically generated from the name.
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
                      <FormLabel
                        style={{ color: "#2c3e50" }}
                        className="font-medium text-base"
                      >
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="min-h-[150px] border-2"
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <Card className="border-0 shadow">
              <CardHeader
                style={{ backgroundColor: "#2c3e50" }}
                className="text-white rounded-t-lg"
              >
                <CardTitle className="text-xl font-medium">
                  Product Images
                </CardTitle>
                <CardDescription
                  style={{ color: "#bdc3c7" }}
                  className="mt-1 text-base"
                >
                  Upload images for your product. The first image will be used
                  as the main image.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ProductImagesUpload
                          existingImages={field.value}
                          onImagesChange={(images) => {
                            field.onChange(images);
                            // Also update the form data state to preserve changes
                            setFormData({
                              ...formData,
                              images: images,
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <Card className="border-0 shadow">
              <CardHeader
                style={{ backgroundColor: "#2c3e50" }}
                className="text-white rounded-t-lg"
              >
                <CardTitle className="text-xl font-medium">
                  Pricing & Inventory
                </CardTitle>
                <CardDescription
                  style={{ color: "#bdc3c7" }}
                  className="mt-1 text-base"
                >
                  Set prices and manage inventory for this product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: "#2c3e50" }}
                          className="font-medium text-base"
                        >
                          Price *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: "#2c3e50" }}
                          className="font-medium text-base"
                        >
                          Original Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            className="border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                              backgroundColor: "white",
                            }}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription style={{ color: "#7f8c8d" }}>
                          Original price for showing discounts
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: "#2c3e50" }}
                          className="font-medium text-base"
                        >
                          Cost
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            className="border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                              backgroundColor: "white",
                            }}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription style={{ color: "#7f8c8d" }}>
                          Product cost (not visible to customers)
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="tva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: "#2c3e50" }}
                          className="font-medium text-base"
                        >
                          TVA (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                              backgroundColor: "white",
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription style={{ color: "#7f8c8d" }}>
                          Tax percentage (default: 19%)
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inventory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: "#2c3e50" }}
                          className="font-medium text-base"
                        >
                          Inventory Quantity
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: "#2c3e50" }}
                          className="font-medium text-base"
                        >
                          Barcode
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional"
                            className="border-2"
                            style={{
                              borderColor: "#bdc3c7",
                              color: "#2c3e50",
                              backgroundColor: "white",
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription style={{ color: "#7f8c8d" }}>
                          UPC, EAN, ISBN, etc.
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        style={{ color: "#2c3e50" }}
                        className="font-medium text-base"
                      >
                        Expiry Date
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
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription style={{ color: "#7f8c8d" }}>
                        Set if product has an expiration date
                      </FormDescription>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="border-0 shadow">
              <CardHeader
                style={{ backgroundColor: "#2c3e50" }}
                className="text-white rounded-t-lg"
              >
                <CardTitle className="text-xl font-medium">
                  Categories
                </CardTitle>
                <CardDescription
                  style={{ color: "#bdc3c7" }}
                  className="mt-1 text-base"
                >
                  Assign this product to categories to help customers find it.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <FormField
                  control={form.control}
                  name="categoryIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ProductCategoriesSelect
                          categories={categories}
                          selectedCategories={field.value}
                          onChange={(selected) => {
                            field.onChange(selected);
                            // Update form data state
                            setFormData({
                              ...formData,
                              categoryIds: selected,
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants">
            <Card className="border-0 shadow">
              <CardHeader
                style={{ backgroundColor: "#2c3e50" }}
                className="text-white rounded-t-lg"
              >
                <CardTitle className="text-xl font-medium">
                  Product Variants
                </CardTitle>
                <CardDescription
                  style={{ color: "#bdc3c7" }}
                  className="mt-1 text-base"
                >
                  Add variants for different options like size, color, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <FormField
                  control={form.control}
                  name="variants"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ProductVariantsForm
                          variants={field.value}
                          onChange={(variants) => {
                            field.onChange(variants);
                            // Update form data state
                            setFormData({
                              ...formData,
                              variants: variants,
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/products")}
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
              ? "Update Product"
              : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
