// src/components/admin/product-tabs/pricing-tab.tsx
import { Control, useWatch } from "react-hook-form";
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
import { useMemo } from "react";

interface PricingTabProps {
  control: Control<ProductFormValues>;
}

export default function PricingTab({ control }: PricingTabProps) {
  // Watch values to calculate profit in real-time
  const price = useWatch({ control, name: "price" }) || 0;
  const cost = useWatch({ control, name: "cost" }) || 0;
  const tva = useWatch({ control, name: "tva" }) || 19;

  // Calculate profit and profit percentage
  const profitDetails = useMemo(() => {
    if (!cost || cost <= 0) {
      return { profit: price, profitPercentage: 0 };
    }

    // Calculate cost with TVA
    const costWithTVA = cost * (1 + tva / 100);

    // Calculate profit (price - (cost + TVA))
    const profit = price - costWithTVA;

    // Calculate profit percentage
    const profitPercentage = (profit / costWithTVA) * 100;

    return {
      profit: profit.toFixed(2),
      profitPercentage: profitPercentage.toFixed(2),
    };
  }, [price, cost, tva]);

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
                  Selling Price *
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
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  style={{ color: "#2c3e50" }}
                  className="font-medium text-base"
                >
                  Cost Price
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Product cost price"
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
        </div>

        {/* Profit Information */}
        {cost > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3
              className="text-md font-medium mb-2"
              style={{ color: "#2c3e50" }}
            >
              Profit Calculation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Profit per unit:</p>
                <p
                  className="text-lg font-semibold"
                  style={{
                    color:
                      Number(profitDetails.profit) > 0 ? "#16a085" : "#e74c3c",
                  }}
                >
                  ${profitDetails.profit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Profit margin:</p>
                <p
                  className="text-lg font-semibold"
                  style={{
                    color:
                      Number(profitDetails.profitPercentage) > 0
                        ? "#16a085"
                        : "#e74c3c",
                  }}
                >
                  {profitDetails.profitPercentage}%
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
