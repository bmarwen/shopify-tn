// src/components/admin/product-form.tsx (simplified)
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
import { slugify } from "@/lib/utils";

// Form schema validation
const productSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Product name must be at least 2 characters" }),
  description: z.string().optional(),
  price: z.coerce
    .number()
    .min(0, { message: "Price must be a positive number" }),
  compareAtPrice: z.coerce.number().optional(),
  barcode: z.string().optional(),
  inventory: z.coerce.number().int().default(0),
  tva: z.coerce.number().min(0).max(100).default(19), // Added TVA field with default 19%
  categoryIds: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        price: z.coerce.number().min(0),
        inventory: z.coerce.number().int().default(0),
        barcode: z.string().optional(),
        options: z.record(z.string(), z.string()),
      })
    )
    .default([]),
  expiryDate: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
  level: number;
}

interface ProductFormProps {
  product?: any;
  categories: Category[];
  shopId: string;
  isEditing?: boolean;
}

export default function ProductForm({
  product,
  categories,
  shopId,
  isEditing = false,
}: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default values
  const defaultValues: ProductFormValues = product
    ? {
        name: product.name,
        description: product.description || "",
        price: product.price,
        compareAtPrice: product.compareAtPrice || undefined,
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
          : undefined,
      }
    : {
        name: "",
        description: "",
        price: 0,
        inventory: 0,
        tva: 19, // Default TVA
        categoryIds: [],
        images: [],
        variants: [],
      };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);

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
        throw new Error("Failed to save product");
      }

      router.push(`/admin/products`);
      router.refresh();
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-800">
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Enter the basic details about your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Product Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          className="text-gray-800"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600">
                        A slug will be automatically generated from the name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="min-h-[150px] text-gray-800"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-800">Product Images</CardTitle>
                <CardDescription className="text-gray-600">
                  Upload images for your product. The first image will be used
                  as the main image.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductImagesUpload
                  existingImages={form.getValues("images")}
                  onImagesChange={(images) => form.setValue("images", images)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-800">
                  Pricing & Inventory
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Set prices and manage inventory for this product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Original Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            className="text-gray-800"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Original price for showing discounts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tva"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">TVA (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          Tax percentage (default: 19%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inventory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Inventory Quantity
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Barcode</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional"
                            className="text-gray-800"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-600">
                          UPC, EAN, ISBN, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Expiry Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="text-gray-800"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600">
                        Set if product has an expiration date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-800">Categories</CardTitle>
                <CardDescription className="text-gray-600">
                  Assign this product to categories to help customers find it.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-800">
                  Product Variants
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Add variants for different options like size, color, etc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductVariantsForm
                  variants={form.getValues("variants")}
                  onChange={(variants) => form.setValue("variants", variants)}
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
            className="text-gray-700"
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
