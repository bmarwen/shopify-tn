// src/components/admin/product-tabs/pricing-tab.tsx
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
import { ProductFormValues } from "../product-form-types";

interface PricingTabProps {
  control: Control<ProductFormValues>;
}

export default function PricingTab({ control }: PricingTabProps) {
  return (
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
            control={control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
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
                      backgroundColor: "white",
                    }}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="compareAtPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
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
                      backgroundColor: "white",
                    }}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </FormControl>
                <FormDescription style={{ color: "#7f8c8d" }}>
                  Original price for showing discounts
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
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
                      backgroundColor: "white",
                    }}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </FormControl>
                <FormDescription style={{ color: "#7f8c8d" }}>
                  Product cost (not visible to customers)
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={control}
            name="tva"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
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
                      backgroundColor: "white",
                    }}
                    {...field}
                  />
                </FormControl>
                <FormDescription style={{ color: "#7f8c8d" }}>
                  Tax percentage (default: 19%)
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="inventory"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
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
                      backgroundColor: "white",
                    }}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
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
                      backgroundColor: "white",
                    }}
                    {...field}
                  />
                </FormControl>
                <FormDescription style={{ color: "#7f8c8d" }}>
                  UPC, EAN, ISBN, etc.
                </FormDescription>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                style={{ color: "#2c3e50" }}
                className="font-medium text-base"
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
                    backgroundColor: "white",
                  }}
                  value={field.value || ""}
                  {...field}
                />
              </FormControl>
              <FormDescription style={{ color: "#7f8c8d" }}>
                Set if product has an expiration date
              </FormDescription>
              <FormMessage className="text-red-600" />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
