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
import CategoriesTab from "./product-tabs/categories-tab";
import VariantsTab from "./product-tabs/variants-tab";

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
  const [localCustomFields, setLocalCustomFields] = useState(customFields);

  // Transform custom field values from variants for API
  const transformCustomFieldsFromVariants = (variants: any[]) => {
    const allCustomFieldValues: any[] = [];
    variants.forEach((variant, variantIndex) => {
      if (variant.customFieldValues) {
        variant.customFieldValues.forEach((cfv: any) => {
          allCustomFieldValues.push({
            ...cfv,
            variantId: variant.id || `temp-${variantIndex}`, // Use temp ID for new variants
          });
        });
      }
    });
    return allCustomFieldValues;
  };

  // Default values
  const defaultValues: ProductFormValues = product
    ? {
        name: product.name,
        description: product.description || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        weight: product.weight || null,
        dimensions: product.dimensions || undefined,
        categoryIds: product.categories?.map((c: any) => c.id) || [],
        images: product.images || [],
        variants:
          product.variants?.map((v: any) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            cost: v.cost,
            tva: v.tva || 19,
            inventory: v.inventory,
            sku: v.sku || "",
            barcode: v.barcode || "",
            options: v.options,
            customFieldValues: v.customFields?.map((cf: any) => ({
              id: cf.id,
              customFieldId: cf.customFieldId,
              value: cf.value,
            })) || [],
          })) || [
            {
              name: "Default",
              price: 0,
              cost: null,
              tva: 19,
              inventory: 0,
              sku: "",
              barcode: "",
              options: {},
              customFieldValues: [],
            },
          ],
        expiryDate: product.expiryDate
          ? new Date(product.expiryDate).toISOString().split("T")[0]
          : null,
      }
    : {
        name: "",
        description: "",
        sku: "",
        barcode: "",
        weight: null,
        dimensions: undefined,
        categoryIds: [],
        images: [],
        variants: [
          {
            name: "Default",
            price: 0,
            cost: null,
            tva: 19,
            inventory: 0,
            sku: "",
            barcode: "",
            options: {},
            customFieldValues: [],
          },
        ],
        expiryDate: null,
      };

  // Create form with schema validation and default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
    mode: "onChange", // Enable real-time validation
  });

  // Initialize and store the form state with defaults
  useEffect(() => {
    setFormState(defaultValues);
  }, [product]);

  // Sync form state when switching tabs
  useEffect(() => {
    if (formState) {
      Object.keys(formState).forEach((key) => {
        const value = formState[key as keyof ProductFormValues];
        // Only set the value if it's different from current form value
        const currentValue = form.getValues(key as any);
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          form.setValue(key as any, value);
        }
      });
    }
  }, [formState, form]);

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

  // Function to get all form errors for summary
  const getFormErrors = () => {
    const errors = form.formState.errors;
    const errorMessages: string[] = [];
    
    if (errors.name) {
      errorMessages.push(`Name: ${errors.name.message}`);
    }
    if (errors.variants) {
      if (typeof errors.variants.message === 'string') {
        errorMessages.push(`Variants: ${errors.variants.message}`);
      } else if (Array.isArray(errors.variants)) {
        errors.variants.forEach((variantError, index) => {
          if (variantError?.name) {
            errorMessages.push(`Variant ${index + 1} Name: ${variantError.name.message}`);
          }
          if (variantError?.price) {
            errorMessages.push(`Variant ${index + 1} Price: ${variantError.price.message}`);
          }
        });
      }
    }
    
    return errorMessages;
  };

  const formErrors = getFormErrors();

  // Refresh custom fields function
  const refreshCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields');
      if (response.ok) {
        const data = await response.json();
        console.log("ProductForm - refreshed customFields:", data);
        setLocalCustomFields(data);
      } else {
        throw new Error('Failed to fetch custom fields');
      }
    } catch (error) {
      console.error('Error refreshing custom fields:', error);
      throw error;
    }
  };

  console.log("ProductForm - localCustomFields:", localCustomFields);

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
              Variants & Custom Fields
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
              customFields={localCustomFields}
              onRefreshCustomFields={refreshCustomFields}
            />
          </TabsContent>
        </Tabs>
        
        {/* Form Error Summary */}
        {formErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Please fix the following errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {formErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
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
