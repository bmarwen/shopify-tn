// src/components/admin/product-tabs/custom-fields-tab.tsx
import { Control } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import ProductCustomFields from "../product-custom-fields";
import { ProductFormValues } from "../product-form-types";

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface CustomFieldsTabProps {
  control: Control<ProductFormValues>;
  customFields: CustomField[];
  onFormStateChange: (field: string, value: any) => void;
}

export default function CustomFieldsTab({
  control,
  customFields,
  onFormStateChange,
}: CustomFieldsTabProps) {
  return (
    <Card className="border-0 shadow">
      <CardHeader
        style={{ backgroundColor: "#2c3e50" }}
        className="text-white rounded-t-lg"
      >
        <CardTitle className="text-xl font-medium">Custom Fields</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Add additional information specific to this product.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <FormField
          control={control}
          name="customFieldValues"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ProductCustomFields
                  customFieldValues={field.value}
                  availableCustomFields={customFields}
                  onChange={(fields) => {
                    field.onChange(fields);
                    // Update the parent form state
                    onFormStateChange("customFieldValues", fields);
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
