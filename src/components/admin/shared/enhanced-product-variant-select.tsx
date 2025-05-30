// src/components/admin/shared/enhanced-product-variant-select.tsx
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
  Layers,
  ShoppingCart,
  Plus
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

interface EnhancedProductVariantSelectProps {
  products: Product[];
  selectedProductIds: string[];
  selectedVariantIds: string[];
  onProductSelectionChange: (productIds: string[]) => void;
  onVariantSelectionChange: (variantIds: string[]) => void;
  currency: string;
  placeholder?: string;
}

export default function EnhancedProductVariantSelect({
  products,
  selectedProductIds,
  selectedVariantIds,
  onProductSelectionChange,
  onVariantSelectionChange,
  currency,
  placeholder = "Search products or variants...",
}: EnhancedProductVariantSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Search function - shows products with their variants underneath
  const searchResults = useMemo(() => {
    if (searchQuery.length < 3) return [];

    const query = searchQuery.toLowerCase();
    const results: Product[] = [];

    products.forEach(product => {
      // Check if product or any of its variants match
      const productMatches = [
        product.name.toLowerCase().includes(query),
        product.sku?.toLowerCase().includes(query),
        product.barcode?.toLowerCase().includes(query),
      ].some(Boolean);

      const variantMatches = product.variants.some(variant => [
        variant.name.toLowerCase().includes(query),
        variant.sku?.toLowerCase().includes(query),
        variant.barcode?.toLowerCase().includes(query),
        Object.values(variant.options).some(value => 
          value.toLowerCase().includes(query)
        ),
      ].some(Boolean));

      if (productMatches || variantMatches) {
        results.push(product);
      }
    });

    return results.slice(0, 10); // Limit results
  }, [searchQuery, products]);

  const handleProductToggle = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (selectedProductIds.includes(productId)) {
      // Removing product - remove product and all its variants
      const newSelectedProducts = selectedProductIds.filter(id => id !== productId);
      const variantIdsToRemove = product.variants.map(v => v.id);
      const newSelectedVariants = selectedVariantIds.filter(id => !variantIdsToRemove.includes(id));
      
      onProductSelectionChange(newSelectedProducts);
      onVariantSelectionChange(newSelectedVariants);
    } else {
      // Adding product - add product and remove any individual variants of this product
      const newSelectedProducts = [...selectedProductIds, productId];
      const variantIdsToRemove = product.variants.map(v => v.id);
      const newSelectedVariants = selectedVariantIds.filter(id => !variantIdsToRemove.includes(id));
      
      onProductSelectionChange(newSelectedProducts);
      onVariantSelectionChange(newSelectedVariants);
    }
  };

  const handleVariantToggle = (variantId: string) => {
    // Find which product this variant belongs to
    const parentProduct = products.find(p => p.variants.some(v => v.id === variantId));
    if (!parentProduct) return;

    // Check if parent product is already selected
    if (selectedProductIds.includes(parentProduct.id)) {
      // Parent product is selected, can't select individual variants
      return;
    }

    if (selectedVariantIds.includes(variantId)) {
      // Removing variant
      const newSelected = selectedVariantIds.filter(id => id !== variantId);
      onVariantSelectionChange(newSelected);
    } else {
      // Adding variant
      const newSelected = [...selectedVariantIds, variantId];
      
      // Check if all variants of this product are now selected
      const allVariantIds = parentProduct.variants.map(v => v.id);
      const selectedVariantsOfThisProduct = newSelected.filter(id => allVariantIds.includes(id));
      
      if (selectedVariantsOfThisProduct.length === allVariantIds.length) {
        // All variants selected, convert to product selection
        const newSelectedProducts = [...selectedProductIds, parentProduct.id];
        const newSelectedVariants = newSelected.filter(id => !allVariantIds.includes(id));
        
        onProductSelectionChange(newSelectedProducts);
        onVariantSelectionChange(newSelectedVariants);
      } else {
        onVariantSelectionChange(newSelected);
      }
    }
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

  // Helper function to check if a variant should be disabled
  const isVariantDisabled = (variantId: string) => {
    const parentProduct = products.find(p => p.variants.some(v => v.id === variantId));
    return parentProduct ? selectedProductIds.includes(parentProduct.id) : false;
  };

  // Helper function to get variants that should be visible (not part of selected products)
  const getVisibleSelectedVariants = () => {
    return products.flatMap(p => {
      // If the product is selected, don't show its variants in the selected list
      if (selectedProductIds.includes(p.id)) {
        return [];
      }
      return p.variants
        .filter(v => selectedVariantIds.includes(v.id))
        .map(v => ({ ...v, productName: p.name }));
    });
  };

  // Get selected items for display
  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
  const selectedVariants = getVisibleSelectedVariants();

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Search Results ({searchResults.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Select products (includes all variants) or individual variants. When a product is selected, its variants are automatically included and disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No products or variants found matching "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-4">
                {searchResults.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 bg-gray-50">
                    {/* Product Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => handleProductToggle(product.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-blue-900">{product.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {product.variants.length} Variants
                          </Badge>
                        </div>
                        {(product.sku || product.barcode) && (
                          <div className="text-xs text-gray-500 mt-1 ml-6">
                            {product.sku && <span>SKU: {product.sku}</span>}
                            {product.sku && product.barcode && <span> • </span>}
                            {product.barcode && <span>Barcode: {product.barcode}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variants List */}
                    <div className="pl-6 space-y-2">
                      {product.variants.map((variant) => {
                        const isDisabled = isVariantDisabled(variant.id);
                        const isSelected = selectedVariantIds.includes(variant.id);
                        const isProductSelected = selectedProductIds.includes(product.id);
                        
                        return (
                        <div key={variant.id} className={`flex items-center space-x-3 p-2 rounded border transition-all ${
                          isDisabled || isProductSelected 
                            ? 'bg-gray-100 border-gray-200' 
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}>
                          <Checkbox
                            id={`variant-${variant.id}`}
                            checked={isSelected || isProductSelected}
                            disabled={isDisabled || isProductSelected}
                            onCheckedChange={() => handleVariantToggle(variant.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Tag className={`h-3 w-3 ${
                                isDisabled || isProductSelected 
                                  ? 'text-gray-400' 
                                  : 'text-purple-400'
                              }`} />
                              <span className={`text-sm font-medium ${
                                isDisabled || isProductSelected 
                                  ? 'text-gray-500' 
                                  : 'text-gray-800'
                              }`}>
                                {variant.name}
                                {isProductSelected && (
                                  <span className="ml-2 text-xs text-blue-600 font-normal">
                                    (included in product)
                                  </span>
                                )}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {formatCurrency(variant.price, currency)}
                              </Badge>
                              <Badge 
                                variant={variant.inventory > 0 ? "default" : "destructive"} 
                                className="text-xs"
                              >
                                Stock: {variant.inventory}
                              </Badge>
                            </div>
                            <div className={`text-xs mt-1 flex items-center space-x-2 ${
                              isDisabled || isProductSelected 
                                ? 'text-gray-400' 
                                : 'text-gray-500'
                            }`}>
                              {variant.sku && <span>SKU: {variant.sku}</span>}
                              {variant.sku && variant.barcode && <span>•</span>}
                              {variant.barcode && <span>Barcode: {variant.barcode}</span>}
                            </div>
                            <div className={`text-xs mt-1 ${
                              isDisabled || isProductSelected 
                                ? 'text-gray-400' 
                                : 'text-gray-500'
                            }`}>
                              {Object.entries(variant.options)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
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
            • Select entire products to include all their variants<br/>
            • Select individual variants for precise targeting<br/>
            • Products and their variants cannot be selected simultaneously
          </p>
        </div>
      )}
    </div>
  );
}
