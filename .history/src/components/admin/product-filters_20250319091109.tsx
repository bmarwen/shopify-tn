"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
}

export default function ProductFilters({
  categories,
  currentFilters,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyFilters = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    // Reset to page 1 when filters change
    params.set("page", "1");

    // Apply new filters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const searchTerm = formData.get("search") as string;

    applyFilters({ search: searchTerm || null });
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            name="search"
            placeholder="Search products..."
            defaultValue={currentFilters.search}
            className="max-w-sm"
          />
          <Button type="submit" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>

        <div className="flex gap-4 flex-wrap">
          <div className="w-40">
            <Select
              value={currentFilters.category || "all"}
              onValueChange={(value) =>
                applyFilters({ category: value === "all" ? null : value })
              }
            >
              <SelectTrigger>
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
              checked={currentFilters.inStock === "true"}
              onCheckedChange={(checked) =>
                applyFilters({ inStock: checked ? "true" : null })
              }
            />
            <Label htmlFor="inStock">In Stock</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="lowStock"
              checked={currentFilters.lowStock === "true"}
              onCheckedChange={(checked) =>
                applyFilters({ lowStock: checked ? "true" : null })
              }
            />
            <Label htmlFor="lowStock">Low Stock</Label>
          </div>

          {(currentFilters.search ||
            currentFilters.category ||
            currentFilters.inStock ||
            currentFilters.lowStock) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
