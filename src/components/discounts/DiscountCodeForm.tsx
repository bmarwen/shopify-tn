"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  images: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface DiscountCodeFormProps {
  onSuccess?: () => void;
  initialData?: any;
  isEdit?: boolean;
}

export function DiscountCodeForm({ onSuccess, initialData, isEdit = false }: DiscountCodeFormProps) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    percentage: initialData?.percentage || "",
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
    availableOnline: initialData?.availableOnline ?? true,
    availableInStore: initialData?.availableInStore ?? true,
    productIds: initialData?.products?.map((p: any) => p.id) || [],
    categoryId: initialData?.categoryId || "",
  });

  const [selectedProducts, setSelectedProducts] = useState<Product[]>(initialData?.products || []);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initialData?.category || null);
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [categoryResults, setCategoryResults] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limits, setLimits] = useState<any>(null);
  const [targetType, setTargetType] = useState<"all" | "products" | "category">(
    initialData?.categoryId ? "category" : 
    initialData?.products?.length > 0 ? "products" : "all"
  );

  useEffect(() => {
    fetchLimits();
  }, []);

  useEffect(() => {
    if (productSearch.length >= 3) {
      searchProducts();
    } else {
      setProductResults([]);
    }
  }, [productSearch]);

  useEffect(() => {
    if (categorySearch.length >= 3) {
      searchCategories();
    } else {
      setCategoryResults([]);
    }
  }, [categorySearch]);

  const fetchLimits = async () => {
    try {
      const response = await fetch("/api/discount-codes");
      if (response.ok) {
        const data = await response.json();
        setLimits(data.limits);
      }
    } catch (error) {
      console.error("Error fetching limits:", error);
    }
  };

  const searchProducts = async () => {
    try {
      const response = await fetch(`/api/pos/discount-codes?type=products&q=${encodeURIComponent(productSearch)}`);
      if (response.ok) {
        const data = await response.json();
        setProductResults(data.products || []);
      }
    } catch (error) {
      console.error("Error searching products:", error);
    }
  };

  const searchCategories = async () => {
    try {
      const response = await fetch(`/api/pos/discount-codes?type=categories&q=${encodeURIComponent(categorySearch)}`);
      if (response.ok) {
        const data = await response.json();
        setCategoryResults(data.categories || []);
      }
    } catch (error) {
      console.error("Error searching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const submitData = {
        ...formData,
        productIds: targetType === "products" ? formData.productIds : [],
        categoryId: targetType === "category" ? formData.categoryId : null,
      };

      const endpoint = isEdit ? `/api/discount-codes/${initialData.id}` : "/api/discount-codes";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.();
      } else {
        setError(data.error || "Failed to save discount code");
      }
    } catch (error) {
      setError("An error occurred while saving the discount code");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addProduct = (product: Product) => {
    if (!selectedProducts.find(p => p.id === product.id)) {
      const newProducts = [...selectedProducts, product];
      setSelectedProducts(newProducts);
      setFormData(prev => ({ ...prev, productIds: newProducts.map(p => p.id) }));
    }
    setProductSearch("");
    setProductResults([]);
  };

  const removeProduct = (productId: string) => {
    const newProducts = selectedProducts.filter(p => p.id !== productId);
    setSelectedProducts(newProducts);
    setFormData(prev => ({ ...prev, productIds: newProducts.map(p => p.id) }));
  };

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, categoryId: category.id }));
    setCategorySearch("");
    setCategoryResults([]);
  };

  const clearCategory = () => {
    setSelectedCategory(null);
    setFormData(prev => ({ ...prev, categoryId: "" }));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Discount Code" : "Create New Discount Code"}
        </CardTitle>
        {limits && (
          <div className="text-sm text-gray-600">
            Plan: {limits.planType} | Discount Codes: {limits.current}/{limits.limit === -1 ? "∞" : limits.limit}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {limits && !limits.allowed && !isEdit && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>
              You have reached the maximum number of discount codes for your plan. 
              Upgrade to create more discount codes.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Discount Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                placeholder="Enter discount code (e.g., SUMMER10)"
                required
                disabled={isEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentage">Discount Percentage *</Label>
              <Input
                id="percentage"
                type="number"
                min="1"
                max="100"
                value={formData.percentage}
                onChange={(e) => handleInputChange("percentage", e.target.value)}
                placeholder="Enter discount percentage"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                min={formData.startDate}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Availability</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="availableOnline"
                  checked={formData.availableOnline}
                  onCheckedChange={(checked) => handleInputChange("availableOnline", checked)}
                />
                <Label htmlFor="availableOnline" className="cursor-pointer">
                  Available for online orders
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="availableInStore"
                  checked={formData.availableInStore}
                  onCheckedChange={(checked) => handleInputChange("availableInStore", checked)}
                />
                <Label htmlFor="availableInStore" className="cursor-pointer">
                  Available for in-store/POS orders
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Targeting</Label>
            <Select value={targetType} onValueChange={(value) => setTargetType(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="products">Specific Products</SelectItem>
                <SelectItem value="category">Product Category</SelectItem>
              </SelectContent>
            </Select>

            {targetType === "products" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Products (min 3 characters)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="pl-10"
                    />
                  </div>
                  
                  {productResults.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {productResults.map((product) => (
                        <div
                          key={product.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => addProduct(product)}
                        >
                          {product.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Products ({selectedProducts.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProducts.map((product) => (
                        <Badge key={product.id} variant="secondary" className="flex items-center gap-1">
                          {product.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeProduct(product.id)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {targetType === "category" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Category (min 3 characters)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="pl-10"
                    />
                  </div>
                  
                  {categoryResults.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {categoryResults.map((category) => (
                        <div
                          key={category.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => selectCategory(category)}
                        >
                          <div className="flex justify-between items-center">
                            <span>{category.name}</span>
                            <span className="text-sm text-gray-500">
                              {category._count.products} products
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCategory && (
                  <div className="space-y-2">
                    <Label>Selected Category</Label>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      {selectedCategory.name} ({selectedCategory._count.products} products)
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={clearCategory}
                      />
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {targetType === "all" && (
              <Alert>
                <AlertDescription>
                  This discount code will apply to all products in your store.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {!formData.availableOnline && !formData.availableInStore && (
            <Alert variant="destructive">
              <AlertDescription>
                Please select at least one availability option.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={
                loading || 
                (!formData.availableOnline && !formData.availableInStore) || 
                (limits && !limits.allowed && !isEdit)
              }
            >
              {loading ? "Saving..." : isEdit ? "Update Discount Code" : "Create Discount Code"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
