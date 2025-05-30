// src/components/admin/discount-codes/searchable-product-variant-select.tsx
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Search, 
  Package, 
  Tag, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  ShoppingCart
} from "lucide-react";
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

interface SearchableProductVariantSelectProps {
  products: Product[];
  selectedProductIds: string[];
  selectedVariantIds: string[];
  onProductSelectionChange: (productIds: string[]) => void;
  onVariantSelectionChange: (variantIds: string[]) => void;
  currency: string;
  placeholder?: string;
}

export default function SearchableProductVariantSelect({
  products,
  selectedProductIds,
  selectedVariantIds,
  onProductSelectionChange,
  onVariantSelectionChange,
  currency,
  placeholder = "Search products or variants...",
}: SearchableProductVariantSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Search function
  const searchResults = useMemo(() => {
    if (searchQuery.length < 3) return [];

    const query = searchQuery.toLowerCase();
    const results: Array<{
      type: 'product' | 'variant';
      product: Product;
      variant?: ProductVariant;
      score: number;
    }> = [];

    products.forEach(product => {
      // Search in product
      const productMatches = [
        product.name.toLowerCase().includes(query),
        product.sku?.toLowerCase().includes(query),
        product.barcode?.toLowerCase().includes(query),
      ].filter(Boolean).length;

      if (productMatches > 0) {
        results.push({
          type: 'product',
          product,
          score: productMatches * 10,
        });
      }

      // Search in variants
      product.variants.forEach(variant => {
        const variantMatches = [
          variant.name.toLowerCase().includes(query),
          variant.sku?.toLowerCase().includes(query),
          variant.barcode?.toLowerCase().includes(query),
          Object.values(variant.options).some(value => 
            value.toLowerCase().includes(query)
          ),
        ].filter(Boolean).length;

        if (variantMatches > 0) {
          results.push({
            type: 'variant',
            product,
            variant,
            score: variantMatches * 5,
          });
        }
      });
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [searchQuery, products]);

  const handleProductToggle = (productId: string) => {
    const newSelected = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    
    onProductSelectionChange(newSelected);
  };

  const handleVariantToggle = (variantId: string) => {
    const newSelected = selectedVariantIds.includes(variantId)
      ? selectedVariantIds.filter(id => id !== variantId)
      : [...selectedVariantIds, variantId];
    
    onVariantSelectionChange(newSelected);
  };

  const toggleProductExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const removeProduct = (productId: string) => {
    onProductSelectionChange(selectedProductIds.filter(id => id !== productId));
  };

  const removeVariant = (variantId: string) => {
    onVariantSelectionChange(selectedVariantIds.filter(id => id !== variantId));
  };

  const clearAll = () => {
    onProductSelectionChange([]);
    onVariantSelectionChange([]);
  };

  // Get selected items for display
  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
  const selectedVariants = products.flatMap(p => 
    p.variants.filter(v => selectedVariantIds.includes(v.id))
      .map(v => ({ ...v, productName: p.name }))
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {searchQuery.length >= 3 && (
        <Card className="max-h-96 overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Search Results ({searchResults.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Select entire products or specific variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No products or variants found matching "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div key={`${result.type}-${result.product.id}-${result.variant?.id || 'product'}-${index}`} className="border rounded-lg p-3">
                    {result.type === 'product' ? (
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`product-${result.product.id}`}
                          checked={selectedProductIds.includes(result.product.id)}
                          onCheckedChange={() => handleProductToggle(result.product.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{result.product.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              All Variants ({result.product.variants.length})
                            </Badge>
                          </div>
                          {(result.product.sku || result.product.barcode) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {result.product.sku && <span>SKU: {result.product.sku}</span>}
                              {result.product.sku && result.product.barcode && <span> • </span>}
                              {result.product.barcode && <span>Barcode: {result.product.barcode}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`variant-${result.variant!.id}`}
                          checked={selectedVariantIds.includes(result.variant!.id)}
                          onCheckedChange={() => handleVariantToggle(result.variant!.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">
                              {result.product.name} - {result.variant!.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {formatCurrency(result.variant!.price, currency)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex items-center space-x-2">
                              <span>Stock: {result.variant!.inventory}</span>
                              {(result.variant!.sku || result.variant!.barcode) && (
                                <>
                                  <span>•</span>
                                  {result.variant!.sku && <span>SKU: {result.variant!.sku}</span>}
                                  {result.variant!.sku && result.variant!.barcode && <span> • </span>}
                                  {result.variant!.barcode && <span>Barcode: {result.variant!.barcode}</span>}
                                </>
                              )}
                            </div>
                            <div className="mt-1">
                              Options: {Object.entries(result.variant!.options)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Items */}
      {(selectedProducts.length > 0 || selectedVariants.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Selected Items ({selectedProducts.length + selectedVariants.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
            <CardDescription className="text-xs">
              Products: {selectedProducts.length} • Variants: {selectedVariants.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Selected Products */}
            {selectedProducts.map(product => (
              <div key={product.id} className="border rounded-lg p-3 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">{product.name}</span>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      All {product.variants.length} Variants
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProductExpanded(product.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedProducts.has(product.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(product.id)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Show variants when expanded */}
                {expandedProducts.has(product.id) && (
                  <div className="mt-3 pl-6 space-y-2">
                    {product.variants.map(variant => (
                      <div key={variant.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{variant.name}</span>
                          <span className="text-gray-500 ml-2">
                            {formatCurrency(variant.price, currency)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Stock: {variant.inventory}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Selected Variants */}
            {selectedVariants.map(variant => (
              <div key={variant.id} className="border rounded-lg p-3 bg-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      {variant.productName} - {variant.name}
                    </span>
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      {formatCurrency(variant.price, currency)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(variant.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-gray-600 mt-2 flex items-center space-x-4">
                  <span>Stock: {variant.inventory}</span>
                  {variant.sku && <span>SKU: {variant.sku}</span>}
                  {variant.barcode && <span>Barcode: {variant.barcode}</span>}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Options: {Object.entries(variant.options)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Help Text for Empty State */}
      {searchQuery.length < 3 && selectedProducts.length === 0 && selectedVariants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">
            Start typing to search for products or variants (minimum 3 characters)
          </p>
          <p className="text-xs mt-2">
            You can select entire products or specific variants
          </p>
        </div>
      )}
    </div>
  );
}
