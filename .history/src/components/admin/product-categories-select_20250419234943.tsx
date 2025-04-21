// src/components/admin/product-categories-select.tsx
"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  level: number;
  parentId?: string | null;
}

interface CategoryTreeItem extends Category {
  children?: CategoryTreeItem[];
  isExpanded?: boolean;
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
  const [categoryTree, setCategoryTree] = useState<CategoryTreeItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Sync local state with props
  useEffect(() => {
    setLocalSelected(selectedCategories || []);
  }, [selectedCategories]);

  // Build category tree
  useEffect(() => {
    // First, organize into a tree structure
    const buildCategoryTree = (cats: Category[]): CategoryTreeItem[] => {
      // Map to store categories by ID for quick lookup
      const categoryMap: Record<string, CategoryTreeItem> = {};

      // Initialize the map with all categories
      cats.forEach((cat) => {
        categoryMap[cat.id] = {
          ...cat,
          children: [],
          isExpanded: expandedCategories.has(cat.id),
        };
      });

      // Build the tree by assigning children to their parents
      const rootCategories: CategoryTreeItem[] = [];

      cats.forEach((cat) => {
        if (cat.parentId && categoryMap[cat.parentId]) {
          // This is a child category
          if (!categoryMap[cat.parentId].children) {
            categoryMap[cat.parentId].children = [];
          }
          categoryMap[cat.parentId].children!.push(categoryMap[cat.id]);
        } else {
          // This is a root category (no parent)
          rootCategories.push(categoryMap[cat.id]);
        }
      });

      return rootCategories;
    };

    setCategoryTree(buildCategoryTree(categories));
  }, [categories, expandedCategories]);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newSelected = checked
      ? [...localSelected, categoryId]
      : localSelected.filter((id) => id !== categoryId);

    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Filter categories based on search term
  const filterCategories = (
    items: CategoryTreeItem[],
    term: string
  ): CategoryTreeItem[] => {
    if (!term) return items;

    return items
      .filter((item) => {
        const nameMatches = item.name
          .toLowerCase()
          .includes(term.toLowerCase());
        const childMatches = item.children
          ? filterCategories(item.children, term).length > 0
          : false;

        return nameMatches || childMatches;
      })
      .map((item) => {
        if (!item.children) return item;

        return {
          ...item,
          children: filterCategories(item.children, term),
        };
      });
  };

  const filteredCategoryTree = searchTerm
    ? filterCategories(categoryTree, searchTerm)
    : categoryTree;

  // Render a category item with its children recursively
  const renderCategory = (category: CategoryTreeItem, depth = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="category-item">
        <div
          className={`flex items-center px-3 py-2 hover:bg-gray-50 ${
            localSelected.includes(category.id) ? "bg-gray-50" : ""
          }`}
          style={{ paddingLeft: `${16 + depth * 20}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleCategoryExpansion(category.id)}
              className="p-1 mr-1 rounded-sm hover:bg-gray-100 text-gray-500"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6 mr-1"></div>}

          <Checkbox
            id={`category-${category.id}`}
            checked={localSelected.includes(category.id)}
            onCheckedChange={(checked) =>
              handleCategoryChange(category.id, checked === true)
            }
            className="mr-2"
          />
          <Label
            htmlFor={`category-${category.id}`}
            className="cursor-pointer flex-grow text-sm"
            style={{ color: "#2c3e50" }}
          >
            {category.name}
          </Label>
        </div>

        {hasChildren && isExpanded && (
          <div className="children">
            {category.children!.map((child) =>
              renderCategory(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

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
          className="pl-10 border-2 text-gray-800 placeholder-gray-400"
          style={{
            borderColor: "#bdc3c7",
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
      ) : filteredCategoryTree.length === 0 ? (
        <p style={{ color: "#2c3e50" }}>No categories match your search.</p>
      ) : (
        <div
          className="border rounded-lg overflow-auto max-h-[400px]"
          style={{ borderColor: "#bdc3c7" }}
        >
          <div className="category-tree">
            {filteredCategoryTree.map((category) => renderCategory(category))}
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
