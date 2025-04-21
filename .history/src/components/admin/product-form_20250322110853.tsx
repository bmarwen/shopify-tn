// src/components/admin/product-form.tsx
"use client";

import { useState } from "react";
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
  customFields: z
    .array(
      z.object({
        id: z.string().optional(),
        key: z.string(),
        value: z.string(),
      })
    )
    .default([]),
});

type ProductFormValues = z.infer<typeof productSchema>;

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

  // Transform custom field values from the product data format to form format
  const transformCustomFieldsForForm = () => {
    if (!product || !product.customFields) return [];

    return product.customFields.map((cf: any) => ({
      id: cf.id,
      key: cf.customField.name,
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
        categoryIds: product.categories.map((c: any) => c.id),
        images: product.images || [],
        variants: product.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          inventory: v.inventory,
          barcode: v.barcode || "",
          options: v.options,
        })),
        expiryDate: product.expiryDate
          ? new Date(product.expiryDate).toISOString().split("T")[0]
          : null,
        customFields: transformCustomFieldsForForm(),
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
        customFields: [],
      };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

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
    } finally {
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

        {/* Tabs with designated colors */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-6 bg-bdc3c7 p-1 rounded-lg">
            <TabsTrigger
              className="rounded-md data-[state=active]:bg-2c3e50 data-[state=active]:text-white text-2c3e50"
              value="basic"
              style={{
                backgroundColor: "var(--state-active, transparent)",
                "--state-active": "var(--selected) ? #2c3e50 : transparent",
              }}
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md data-[state=active]:bg-2c3e50 data-[state=active]:text-white text-2c3e50"
              value="images"
            >
              Images
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md data-[state=active]:bg-2c3e50 data-[state=active]:text-white text-2c3e50"
              value="pricing"
            >
              Pricing & Inventory
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md data-[state=active]:bg-2c3e50 data-[state=active]:text-white text-2c3e50"
              value="categories"
            >
              Categories
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md data-[state=active]:bg-2c3e50 data-[state=active]:text-white text-2c3e50"
              value="variants"
            >
              Variants
            </TabsTrigger>
            <TabsTrigger
              className="rounded-md data-[state=active]:bg-2c3e50 data-[state=active]:text-white text-2c3e50"
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
                        className="font-semibold text-base"
                      >
                        Product Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          className="border-2 border-bdc3c7 text-2c3e50"
                          style={{
                            borderColor: "#bdc3c7",
                            color: "white",
                            "::placeholder": { color: "#bdc3c7" },
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription style={{ color: "#2c3e50" }}>
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
                        className="font-semibold text-base"
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
                            "::placeholder": { color: "#bdc3c7" },
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
                <ProductImagesUpload
                  existingImages={form.getValues("images")}
                  onImagesChange={(images) => form.setValue("images", images)}
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
                          className="font-semibold text-base"
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
                          className="font-semibold text-base"
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
                              "::placeholder": { color: "#bdc3c7" },
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
                        <FormDescription style={{ color: "#2c3e50" }}>
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
                          className="font-semibold text-base"
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
                              "::placeholder": { color: "#bdc3c7" },
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
                        <FormDescription style={{ color: "#2c3e50" }}>
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
                          className="font-semibold text-base"
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
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription style={{ color: "#2c3e50" }}>
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
                          className="font-semibold text-base"
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
                          className="font-semibold text-base"
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
                              "::placeholder": { color: "#bdc3c7" },
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription style={{ color: "#2c3e50" }}>
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
                        className="font-semibold text-base"
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
                          }}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription style={{ color: "#2c3e50" }}>
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
                <ProductCategoriesSelect
                  categories={categories}
                  selectedCategories={form.getValues("categoryIds")}
                  onChange={(selected) =>
                    form.setValue("categoryIds", selected)
                  }
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
                <style jsx global>{`
                  .variant-input-override {
                    color: #2c3e50 !important;
                    border-color: #bdc3c7 !important;
                  }
                  .variant-input-override::placeholder {
                    color: #bdc3c7 !important;
                  }
                `}</style>
                <ProductVariantsForm
                  variants={form.getValues("variants")}
                  onChange={(variants) => form.setValue("variants", variants)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="custom-fields">
            <Card className="border-0 shadow">
              <CardHeader
                style={{ backgroundColor: "#2c3e50" }}
                className="text-white rounded-t-lg"
              >
                <CardTitle className="text-xl font-medium">
                  Custom Fields
                </CardTitle>
                <CardDescription
                  style={{ color: "#bdc3c7" }}
                  className="mt-1 text-base"
                >
                  Add additional information specific to this product.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <style jsx global>{`
                  .custom-field-input-override {
                    color: #2c3e50 !important;
                    border-color: #bdc3c7 !important;
                  }
                  .custom-field-input-override::placeholder {
                    color: #bdc3c7 !important;
                  }
                `}</style>
                <ProductCustomFields
                  customFields={form.getValues("customFields")}
                  availableFields={customFields}
                  onChange={(fields) => form.setValue("customFields", fields)}
                />
              </CardContent>
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
