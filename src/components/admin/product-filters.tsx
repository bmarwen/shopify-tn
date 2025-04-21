// src/components/admin/product-filters.tsx - Add lowStockThreshold prop
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
  currentFilters: {
    search?: string;
    category?: string;
    inStock?: string;
    lowStock?: string;
    page?: string;
    perPage?: string;
    sort?: string;
    order?: string;
  };
  lowStockThreshold: number;
}

export default function ProductFilters({
  categories,
  currentFilters,
  lowStockThreshold,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for filters to enable live updates
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || "");
  const [selectedCategory, setSelectedCategory] = useState(
    currentFilters.category || "all"
  );
  const [isInStock, setIsInStock] = useState(currentFilters.inStock === "true");
  const [isLowStock, setIsLowStock] = useState(
    currentFilters.lowStock === "true"
  );

  // Update URL when filters change
  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 when filters change
    params.set("page", "1");

    // Update search parameter
    if (searchTerm) {
      params.set("search", searchTerm);
    } else {
      params.delete("search");
    }

    // Update category parameter
    if (selectedCategory && selectedCategory !== "all") {
      params.set("category", selectedCategory);
    } else {
      params.delete("category");
    }

    // Update stock filters
    if (isInStock) {
      params.set("inStock", "true");
    } else {
      params.delete("inStock");
    }

    if (isLowStock) {
      params.set("lowStock", "true");
    } else {
      params.delete("lowStock");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Live search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, isInStock, isLowStock]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setIsInStock(false);
    setIsLowStock(false);

    router.push(pathname);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 space-y-4 border border-gray-200">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="pl-10 max-w-sm text-gray-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <div className="w-48">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="text-gray-800">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="inStock"
              checked={isInStock}
              onCheckedChange={(checked) => setIsInStock(checked === true)}
            />
            <Label htmlFor="inStock" className="text-gray-800">
              In Stock
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="lowStock"
              checked={isLowStock}
              onCheckedChange={(checked) => setIsLowStock(checked === true)}
            />
            <Label htmlFor="lowStock" className="text-gray-800">
              Low Stock (≤{lowStockThreshold})
            </Label>
          </div>

          {(searchTerm ||
            selectedCategory !== "all" ||
            isInStock ||
            isLowStock) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
