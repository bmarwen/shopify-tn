// src/components/admin/product-tabs/basic-info-tab.tsx
import { Control } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductFormValues } from "../product-form-types";

interface BasicInfoTabProps {
  control: Control<ProductFormValues>;
}

export default function BasicInfoTab({ control }: BasicInfoTabProps) {
  return (
    <Card className="border-0 shadow">
      <CardHeader
        style={{ backgroundColor: "#2c3e50" }}
        className="text-white rounded-t-lg"
      >
        <CardTitle className="text-xl font-medium">Basic Information</CardTitle>
        <CardDescription
          style={{ color: "#bdc3c7" }}
          className="mt-1 text-base"
        >
          Enter the basic details about your product.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 bg-white">
        <FormField
          control={control}
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
          control={control}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={control}
                name="barcode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel
                            style={{ color: "#2c3e50" }}
                            className="font-medium text-base"
                        >
                            Barcode (Optional)
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Base barcode"
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
                            Base barcode for the product.
                        </FormDescription>
                        <FormMessage className="text-red-600" />
                    </FormItem>
                )}
            />
          <FormField
            control={control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
                >
                  SKU (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Base SKU for variants"
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
                  Base SKU that variants can extend.
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />


        </div>
      </CardContent>
    </Card>
  );
}
