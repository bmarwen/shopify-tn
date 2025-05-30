"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  images: string[];
}

interface DiscountFormProps {
  onSuccess?: () => void;
  initialData?: any;
  isEdit?: boolean;
}

export function DiscountForm({ onSuccess, initialData, isEdit = false }: DiscountFormProps) {
  const [formData, setFormData] = useState({
    productId: initialData?.productId || "",
    percentage: initialData?.percentage || "",
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
    availableOnline: initialData?.availableOnline ?? true,
    availableInStore: initialData?.availableInStore ?? true,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
    fetchLimits();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await fetch("/api/discounts");
      if (response.ok) {
        const data = await response.json();
        setLimits(data.limits);
      }
    } catch (error) {
      console.error("Error fetching limits:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isEdit ? `/api/discounts/${initialData.id}` : "/api/discounts";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.();
      } else {
        setError(data.error || "Failed to save discount");
      }
    } catch (error) {
      setError("An error occurred while saving the discount");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Discount" : "Create New Discount"}
        </CardTitle>
        {limits && (
          <div className="text-sm text-gray-600">
            Plan: {limits.planType} | Discounts: {limits.current}/{limits.limit === -1 ? "∞" : limits.limit}
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
              You have reached the maximum number of discounts for your plan. 
              Upgrade to create more discounts.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="productId">Product *</Label>
            <Select 
              value={formData.productId} 
              onValueChange={(value) => handleInputChange("productId", value)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

            {!formData.availableOnline && !formData.availableInStore && (
              <Alert variant="destructive">
                <AlertDescription>
                  Please select at least one availability option.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={loading || (!formData.availableOnline && !formData.availableInStore) || (limits && !limits.allowed && !isEdit)}
            >
              {loading ? "Saving..." : isEdit ? "Update Discount" : "Create Discount"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
