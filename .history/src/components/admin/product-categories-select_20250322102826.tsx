// src/components/admin/product-categories-select.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { SearchIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  level: number;
}

interface ProductCategoriesSelectProps {
  categories: Category[];
  selectedCategories: string[];
  onChange: (selected: string[]) => void;
}

export default function ProductCategoriesSelect({
  categories,
  selectedCategories,
  onChange,
}: ProductCategoriesSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedCategories, categoryId]);
    } else {
      onChange(selectedCategories.filter((id) => id !== categoryId));
    }
  };

  // Filter categories based on search term
  const filteredCategories = searchTerm
    ? categories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : categories;

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-gray-300 text-gray-800 placeholder:text-gray-400"
        />
      </div>

      {categories.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No categories found. Please create categories first.
          </p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <p className="text-gray-500">No categories match your search.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className={`flex items-center space-x-2 p-3 hover:bg-gray-50 ${
                  category.level > 0
                    ? "border-t border-gray-100"
                    : "border-t border-gray-200"
                }`}
              >
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) =>
                    handleCategoryChange(category.id, checked === true)
                  }
                  className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                />
                <Label
                  htmlFor={`category-${category.id}`}
                  className="text-gray-700 cursor-pointer flex-grow"
                  style={{ marginLeft: `${category.level * 1.5}rem` }}
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCategories.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Selected categories: {selectedCategories.length}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedCategories.map((id) => {
              const category = categories.find((c) => c.id === id);
              if (!category) return null;

              return (
                <div
                  key={id}
                  className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  {category.name}
                  <button
                    onClick={() => handleCategoryChange(id, false)}
                    className="ml-2 hover:text-indigo-900"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
