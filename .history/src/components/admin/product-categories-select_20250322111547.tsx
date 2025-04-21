// src/components/admin/product-categories-select.tsx
"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  const [localSelected, setLocalSelected] = useState<string[]>(
    selectedCategories || []
  );

  // Sync local state with props
  useEffect(() => {
    setLocalSelected(selectedCategories || []);
  }, [selectedCategories]);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newSelected = checked
      ? [...localSelected, categoryId]
      : localSelected.filter((id) => id !== categoryId);

    setLocalSelected(newSelected);
    onChange(newSelected);
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
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
          style={{ color: "#bdc3c7" }}
        />
        <Input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-2 text-gray-200 placeholder-gray-400"
          style={{
            borderColor: "#bdc3c7",
            color: "#2c3e50",
            backgroundColor: "white",
          }}
        />
      </div>

      {categories.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No categories found. Please create categories first.
          </p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <p style={{ color: "#2c3e50" }}>No categories match your search.</p>
      ) : (
        <div
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: "#bdc3c7" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center space-x-2 p-3 hover:bg-gray-50"
                style={{
                  borderTop: "1px solid #bdc3c7",
                  backgroundColor: localSelected.includes(category.id)
                    ? "#f5f7fa"
                    : "white",
                }}
              >
                <div className="flex-shrink-0">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={localSelected.includes(category.id)}
                    onCheckedChange={(checked) =>
                      handleCategoryChange(category.id, checked === true)
                    }
                    style={{
                      backgroundColor: localSelected.includes(category.id)
                        ? "#16a085"
                        : "white",
                      borderColor: localSelected.includes(category.id)
                        ? "#16a085"
                        : "#bdc3c7",
                    }}
                  />
                </div>
                <Label
                  htmlFor={`category-${category.id}`}
                  className="cursor-pointer flex-grow"
                  style={{
                    marginLeft: `${category.level * 1.5}rem`,
                    color: "#2c3e50",
                  }}
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {localSelected.length > 0 && (
        <div className="mt-4">
          <p className="text-sm" style={{ color: "#2c3e50" }}>
            Selected categories: {localSelected.length}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {localSelected.map((id) => {
              const category = categories.find((c) => c.id === id);
              if (!category) return null;

              return (
                <div
                  key={id}
                  style={{
                    backgroundColor: "#16a085",
                    color: "white",
                  }}
                  className="px-3 py-1 rounded-full text-sm flex items-center"
                >
                  {category.name}
                  <button
                    onClick={() => handleCategoryChange(id, false)}
                    className="ml-2 hover:text-gray-200"
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
