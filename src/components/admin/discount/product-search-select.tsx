// src/components/admin/discount/product-search-select.tsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";

interface Product {
  id: string;
  name: string;
  price: number;
  sku?: string;
  barcode?: string;
}

interface ProductSearchSelectProps {
  products: Product[];
  currency: string;
  disabled?: boolean;
  control: any;
  name: string;
}

export default function ProductSearchSelect({
  products,
  currency,
  disabled = false,
  control,
  name,
}: ProductSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered products based on search term
  const filteredProducts = useMemo(() => {
    if (searchTerm.length < 3) return products;
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 font-medium">
            Product *
          </FormLabel>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500"
              />
            </div>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-60">
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(product.price, currency)}
                        {product.sku && ` • SKU: ${product.sku}`}
                        {product.barcode && ` • Barcode: ${product.barcode}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormDescription className="text-gray-600">
            Search and select the product this discount applies to
          </FormDescription>
          <FormMessage className="text-red-600" />
        </FormItem>
      )}
    />
  );
}
