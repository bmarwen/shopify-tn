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
        tva: product.tva || 19, // Default TVA 19%
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
        tva: 19, // Default TVA
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

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-4 bg-gray-100 p-1">
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900"
              value="basic"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900"
              value="images"
            >
              Images
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900"
              value="pricing"
            >
              Pricing & Inventory
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900"
              value="categories"
            >
              Categories
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900"
              value="variants"
            >
              Variants
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900"
              value="custom-fields"
            >
              Custom Fields
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader className="bg-gray-600 border-b ">
                <CardTitle className="text-gray-800">
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Enter the basic details about your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Product Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600">
                        A slug will be automatically generated from the name.
                      </FormDescription>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

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
                          placeholder="Enter product description"
                          className="min-h-[150px] border-gray-300 text-gray-800 placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-gray-800">Product Images</CardTitle>
                <CardDescription className="text-gray-600">
                  Upload images for your product. The first image will be used
                  as the main image.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ProductImagesUpload
                  existingImages={form.getValues("images")}
                  onImagesChange={(images) => form.setValue("images", images)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-gray-800">
                  Pricing & Inventory
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Set prices and manage inventory for this product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Price *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="border-gray-300 text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Original Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Original price for showing discounts
                        </FormDescription>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Cost
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Product cost (not visible to customers)
                        </FormDescription>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          TVA (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="border-gray-300 text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Tax percentage (default: 19%)
                        </FormDescription>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inventory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Inventory Quantity
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="border-gray-300 text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          Barcode
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional"
                            className="border-gray-300 text-gray-800 placeholder:text-gray-400"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          UPC, EAN, ISBN, etc.
                        </FormDescription>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Expiry Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="border-gray-300 text-gray-800"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600">
                        Set if product has an expiration date
                      </FormDescription>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-gray-800">Categories</CardTitle>
                <CardDescription className="text-gray-600">
                  Assign this product to categories to help customers find it.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
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

          <TabsContent value="variants">
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-gray-800">
                  Product Variants
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Add variants for different options like size, color, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ProductVariantsForm
                  variants={form.getValues("variants")}
                  onChange={(variants) => form.setValue("variants", variants)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom-fields">
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-gray-800">Custom Fields</CardTitle>
                <CardDescription className="text-gray-600">
                  Add additional information specific to this product.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
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
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
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
