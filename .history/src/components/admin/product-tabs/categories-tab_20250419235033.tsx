// src/components/admin/product-tabs/categories-tab.tsx
import { Control } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import ProductCategoriesSelect from "../product-categories-select";
import { ProductFormValues } from "../product-form-types";

interface CategoriesTabProps {
  control: Control<ProductFormValues>;
  categories: {
    id: string;
    name: string;
    level: number;
    parentId?: string | null;
  }[];
  onFormStateChange: (field: string, value: any) => void;
}

export default function CategoriesTab({
  control,
  categories,
  onFormStateChange,
}: CategoriesTabProps) {
  return (
    <Card className="border-0 shadow">
      <CardHeader
        style={{ backgroundColor: "#2c3e50" }}
        className="text-white rounded-t-lg"
      >
        <CardTitle className="text-xl font-medium">Categories</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Assign this product to categories to help customers find it.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <FormField
          control={control}
          name="categoryIds"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ProductCategoriesSelect
                  categories={categories}
                  selectedCategories={field.value}
                  onChange={(selected) => {
                    field.onChange(selected);
                    // Update the parent form state
                    onFormStateChange("categoryIds", selected);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
