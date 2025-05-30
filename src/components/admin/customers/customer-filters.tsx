// src/components/admin/customers/customer-filters.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface CustomerFiltersProps {
  currentSearch: string;
  currentSortBy: string;
  currentSortOrder: string;
  totalCustomers: number;
}

export default function CustomerFilters({
  currentSearch,
  currentSortBy,
  currentSortOrder,
  totalCustomers,
}: CustomerFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(currentSearch);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    
    // Reset to first page when searching
    params.delete("page");
    
    router.push(`/admin/customers?${params.toString()}`);
  };

  const handleSortChange = (field: string, order: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", field);
    params.set("sortOrder", order);
    params.delete("page"); // Reset to first page
    
    router.push(`/admin/customers?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    router.push("/admin/customers");
  };

  const hasActiveFilters = currentSearch || currentSortBy !== "createdAt" || currentSortOrder !== "desc";

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  if (currentSearch) {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("search");
                    params.delete("page");
                    router.push(`/admin/customers?${params.toString()}`);
                  }
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
          <Select
            value={`${currentSortBy}-${currentSortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split("-");
              handleSortChange(field, order);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="email-asc">Email (A-Z)</SelectItem>
              <SelectItem value="email-desc">Email (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          {currentSearch ? (
            <span>
              Found <strong>{totalCustomers}</strong> customer{totalCustomers !== 1 ? 's' : ''} matching "{currentSearch}"
            </span>
          ) : (
            <span>
              Showing <strong>{totalCustomers}</strong> customer{totalCustomers !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <Filter className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
