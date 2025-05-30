// src/components/admin/product-tabs/variants-tab.tsx
import { Control } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import ProductVariantsForm from "../product-variants-form";
import { ProductFormValues } from "../product-form-types";

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface VariantsTabProps {
  control: Control<ProductFormValues>;
  onFormStateChange: (field: string, value: any) => void;
  customFields?: CustomField[];
  onRefreshCustomFields?: () => Promise<void>;
}

export default function VariantsTab({
  control,
  onFormStateChange,
  customFields = [],
  onRefreshCustomFields,
}: VariantsTabProps) {
  console.log("VariantsTab - customFields received:", customFields);
  
  return (
    <Card className="border-0 shadow">
      <CardHeader
        style={{ backgroundColor: "#2c3e50" }}
        className="text-white rounded-t-lg"
      >
        <CardTitle className="text-xl font-medium">Product Variants</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Add variants for different options like size, color, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <FormField
          control={control}
          name="variants"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ProductVariantsForm
                  variants={field.value}
                  customFields={customFields}
                  onChange={(variants) => {
                    field.onChange(variants);
                    // Update the parent form state
                    onFormStateChange("variants", variants);
                  }}
                  onRefreshCustomFields={onRefreshCustomFields}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
