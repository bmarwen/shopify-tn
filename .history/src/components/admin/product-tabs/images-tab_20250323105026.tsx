// src/components/admin/product-tabs/images-tab.tsx
import { Control } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import ProductImagesUpload from "../product-images-upload";
import { ProductFormValues } from "../product-form-types";

interface ImagesTabProps {
  control: Control<ProductFormValues>;
  onFormStateChange: (field: string, value: any) => void;
}

export default function ImagesTab({
  control,
  onFormStateChange,
}: ImagesTabProps) {
  return (
    <Card className="border-0 shadow">
      <CardHeader
        style={{ backgroundColor: "#2c3e50" }}
        className="text-white rounded-t-lg"
      >
        <CardTitle className="text-xl font-medium">Product Images</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Upload images for your product. The first image will be used as the
          main image.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <FormField
          control={control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ProductImagesUpload
                  existingImages={field.value}
                  onImagesChange={(images) => {
                    field.onChange(images);
                    // Update the parent form state to preserve changes between tabs
                    onFormStateChange("images", images);
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
