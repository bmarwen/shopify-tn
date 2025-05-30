// src/components/admin/discount/enhanced-product-search-select.tsx
"use client";

import { useMemo, useState } from "react";
import { Search, Package, Layers } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku?: string;
  barcode?: string;
  inventory: number;
  options: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  variants: ProductVariant[];
}

interface EnhancedProductSearchSelectProps {
  products: Product[];
  currency: string;
  disabled?: boolean;
  control: any;
  productName: string;
  variantName: string;
}

export default function EnhancedProductSearchSelect({
  products,
  currency,
  disabled = false,
  control,
  productName,
  variantName,
}: EnhancedProductSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Search results for products and variants
  const searchResults = useMemo(() => {
    if (searchTerm.length < 3) return { products: [], variants: [] };
    
    const query = searchTerm.toLowerCase();
    const matchingProducts: Product[] = [];
    const matchingVariants: { product: Product; variant: ProductVariant }[] = [];
    
    products.forEach(product => {
      const productMatches = 
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query);
      
      const variantMatches = product.variants.filter(variant =>
        variant.name?.toLowerCase().includes(query) ||
        variant.sku?.toLowerCase().includes(query) ||
        variant.barcode?.toLowerCase().includes(query) ||
        Object.values(variant.options).some(option => 
          option.toLowerCase().includes(query)
        )
      );
      
      if (productMatches) {
        matchingProducts.push(product);
      }
      
      variantMatches.forEach(variant => {
        matchingVariants.push({ product, variant });
      });
    });
    
    return {
      products: matchingProducts.slice(0, 10),
      variants: matchingVariants.slice(0, 15)
    };
  }, [products, searchTerm]);

  const totalResults = searchResults.products.length + searchResults.variants.length;

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name={productName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700 font-medium">
              Product *
            </FormLabel>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products or variants by name, SKU, or barcode (min 3 chars)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value.length >= 3) {
                      setShowResults(true);
                    } else {
                      setShowResults(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchTerm.length >= 3) {
                      setShowResults(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowResults(false), 200);
                  }}
                  className="pl-10 border-gray-300 focus:border-blue-500"
                  disabled={disabled}
                />
                {searchTerm.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    {totalResults} found
                  </div>
                )}
              </div>

              {/* Search Results - Direct display */}
              {showResults && searchTerm.length >= 3 && (
                <div className="border border-gray-200 rounded-lg bg-white shadow-lg max-h-96 overflow-y-auto">
                  {totalResults === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      No products or variants found matching "{searchTerm}"
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {/* Products Section */}
                      {searchResults.products.length > 0 && (
                        <div>
                          <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Products ({searchResults.products.length})
                          </div>
                          {searchResults.products.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => {
                                field.onChange(product.id);
                                control._formValues[variantName] = ""; // Clear variant selection
                                setShowResults(false);
                                setSearchTerm(product.name);
                              }}
                              className={cn(
                                "flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors",
                                field.value === product.id && "bg-blue-50 border-l-4 border-l-blue-500"
                              )}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    All {product.variants.length} variants
                                  </Badge>
                                  {product.variants[0] && (
                                    <span className="font-medium text-green-600">
                                      from {formatCurrency(Math.min(...product.variants.map(v => v.price)), currency)}
                                    </span>
                                  )}
                                  {product.sku && (
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                      SKU: {product.sku}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Variants Section */}
                      {searchResults.variants.length > 0 && (
                        <div>
                          <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 flex items-center">
                            <Layers className="h-4 w-4 mr-2" />
                            Variants ({searchResults.variants.length})
                          </div>
                          {searchResults.variants.map(({ product, variant }) => (
                            <div
                              key={variant.id}
                              onClick={() => {
                                field.onChange(product.id);
                                control._formValues[variantName] = variant.id; // Set variant selection
                                setShowResults(false);
                                setSearchTerm(`${product.name} - ${variant.name}`);
                              }}
                              className={cn(
                                "flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors",
                                control._formValues[variantName] === variant.id && "bg-purple-50 border-l-4 border-l-purple-500"
                              )}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {product.name} - {variant.name}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                    Specific variant
                                  </Badge>
                                  <span className="font-medium text-purple-600">
                                    {formatCurrency(variant.price, currency)}
                                  </span>
                                  <span className="text-gray-400">
                                    Stock: {variant.inventory}
                                  </span>
                                  {variant.sku && (
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                      SKU: {variant.sku}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {Object.entries(variant.options).map(([key, value]) => (
                                    <span key={key} className="mr-2">
                                      {key}: {value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <FormDescription className="text-gray-600">
              Search and select a product (all variants) or specific variant for this discount
            </FormDescription>
            <FormMessage className="text-red-600" />
          </FormItem>
        )}
      />

      {/* Hidden variant field */}
      <FormField
        control={control}
        name={variantName}
        render={({ field }) => (
          <input type="hidden" {...field} />
        )}
      />
    </div>
  );
}
