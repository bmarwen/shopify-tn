// src/components/admin/product-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { slugify } from "@/lib/utils";

// Import form types
import {
  ProductFormProps,
  ProductFormValues,
  productSchema,
} from "./product-form-types";

// Import tab components
import BasicInfoTab from "./product-tabs/basic-info-tab";
import ImagesTab from "./product-tabs/images-tab";
import PricingTab from "./product-tabs/pricing-tab";
import CategoriesTab from "./product-tabs/categories-tab";
import VariantsTab from "./product-tabs/variants-tab";
import CustomFieldsTab from "./product-tabs/custom-fields-tab";

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
  const [formState, setFormState] = useState<ProductFormValues | null>(null);

  // Transform custom field values from the product data format to form format
  const transformCustomFieldsForForm = () => {
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
        variants:
          product.variants?.map((v: any) => ({
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

  // Create form with schema validation and default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  // Initialize and store the form state with defaults
  useEffect(() => {
    setFormState(defaultValues);
  }, []);

  // Sync form state when switching tabs
  useEffect(() => {
    if (formState) {
      Object.keys(formState).forEach((key) => {
        form.setValue(key as any, formState[key as keyof ProductFormValues]);
      });
    }
  }, [formState]);

  // Handle tab change - preserve form state between tabs
  const handleTabChange = (value: string) => {
    // Get current values
    const currentValues = form.getValues();

    // Merge with existing state to keep all fields
    setFormState((prev) => ({
      ...(prev || defaultValues),
      ...currentValues,
    }));

    // Update the active tab
    setActiveTab(value);
  };

  // Update form state for a specific field
  const updateFormState = (field: string, value: any) => {
    setFormState((prev) => ({
      ...(prev || defaultValues),
      [field]: value,
    }));
  };

  // Handle form submission
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
                color: activeTab === "basic" ? "white" : "#bdc3c7",
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
                color: activeTab === "images" ? "white" : "#bdc3c7",
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
                color: activeTab === "pricing" ? "white" : "#bdc3c7",
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
                color: activeTab === "categories" ? "white" : "#bdc3c7",
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
                color: activeTab === "variants" ? "white" : "#bdc3c7",
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
                color: activeTab === "custom-fields" ? "white" : "#bdc3c7",
              }}
              value="custom-fields"
            >
              Custom Fields
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="basic" className="space-y-4">
            <BasicInfoTab control={form.control} />
          </TabsContent>

          <TabsContent value="images">
            <ImagesTab
              control={form.control}
              onFormStateChange={updateFormState}
            />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <PricingTab control={form.control} />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab
              control={form.control}
              categories={categories}
              onFormStateChange={updateFormState}
            />
          </TabsContent>

          <TabsContent value="variants">
            <VariantsTab
              control={form.control}
              onFormStateChange={updateFormState}
            />
          </TabsContent>

          <TabsContent value="custom-fields">
            <CustomFieldsTab
              control={form.control}
              customFields={customFields}
              onFormStateChange={updateFormState}
            />
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
