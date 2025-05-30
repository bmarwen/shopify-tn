// src/components/admin/discount-codes/searchable-product-select.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  variants: {
    id: string;
    name: string;
    price: number;
    sku?: string;
    barcode?: string;
  }[];
}

interface SearchableProductSelectProps {
  products: Product[];
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  currency: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableProductSelect({
  products,
  selectedProductIds,
  onSelectionChange,
  currency,
  placeholder = "Search products by name or barcode...",
  disabled = false,
}: SearchableProductSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Filter products based on search query (min 3 characters)
  const filteredProducts = useMemo(() => {
    if (searchQuery.length < 3) return [];
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query) ||
      product.variants.some(variant => 
        variant.name?.toLowerCase().includes(query) ||
        variant.sku?.toLowerCase().includes(query) ||
        variant.barcode?.toLowerCase().includes(query)
      )
    ).slice(0, 20); // Limit to 20 results
  }, [products, searchQuery]);

  // Show/hide results based on search query and focus
  useEffect(() => {
    setShowResults(searchQuery.length >= 3 && filteredProducts.length > 0);
  }, [searchQuery, filteredProducts]);

  // Get selected products for display
  const selectedProducts = useMemo(() => {
    return products.filter(product => selectedProductIds.includes(product.id));
  }, [products, selectedProductIds]);

  const handleSelect = (productId: string) => {
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    
    onSelectionChange(newSelection);
  };

  const handleRemove = (productId: string) => {
    onSelectionChange(selectedProductIds.filter(id => id !== productId));
  };

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.length >= 3) {
              setShowResults(true);
            } else {
              setShowResults(false);
            }
          }}
          onFocus={() => {
            if (searchQuery.length >= 3) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // Delay hiding to allow clicks on results
            setTimeout(() => setShowResults(false), 200);
          }}
          className="pl-10 border-gray-300 focus:border-blue-500"
          disabled={disabled}
        />
        {searchQuery.length >= 3 && (
          <div className="absolute right-3 top-3 text-xs text-gray-500">
            {filteredProducts.length} found
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && searchQuery.length >= 3 && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-lg max-h-80 overflow-y-auto z-10">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No products found matching "{searchQuery}"
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    handleSelect(product.id);
                    setShowResults(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors",
                    selectedProductIds.includes(product.id) && "bg-blue-50 border-l-4 border-l-blue-500"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      selectedProductIds.includes(product.id)
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    )}>
                      {selectedProductIds.includes(product.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        {product.variants[0] && (
                          <span className="font-medium text-green-600">
                            {formatCurrency(product.variants[0].price, currency)}
                          </span>
                        )}
                        {product.sku && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            SKU: {product.sku}
                          </span>
                        )}
                        {product.barcode && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {product.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Products Display */}
      {selectedProducts.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Selected Products ({selectedProducts.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {product.variants[0] && (
                      <span className="font-medium text-green-600">
                        {formatCurrency(product.variants[0].price, currency)}
                      </span>
                    )}
                    {product.sku && (
                      <span className="bg-white px-2 py-0.5 rounded text-xs">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                  onClick={() => handleRemove(product.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
