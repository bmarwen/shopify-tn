"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CategoryForm from "@/components/admin/category-form";
import { formatDate } from "@/lib/utils";
import {
  Search,
  X,
  ChevronRight,
  FolderTree,
  Plus,
  Folder,
  Edit,
  Trash,
  ChevronDown,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId: string | null;
  level: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    children: number;
  };
  totalProducts?: number;
}

interface HierarchicalCategory extends Category {
  children: HierarchicalCategory[];
}

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchicalCategories, setHierarchicalCategories] = useState<
    HierarchicalCategory[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (!session?.user?.shopId) {
      router.push("/login?callbackUrl=/admin/categories");
      return;
    }
    fetchCategories();
  }, [session, status, router]);

  // Fetch categories from API
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/categories?withProductCount=true`);
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(data);

      // Organize categories into hierarchical structure
      const hierarchical = organizeCategoriesHierarchically(data);
      setHierarchicalCategories(hierarchical);

      const allCategoryIds = new Set<string>(
        data.map((category: Category) => category.id)
      );

      setExpandedCategories(allCategoryIds);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert flat categories array to hierarchical structure
  const organizeCategoriesHierarchically = (
    flatCategories: Category[]
  ): HierarchicalCategory[] => {
    // Create a map to quickly look up categories by ID
    const categoryMap = new Map<string, HierarchicalCategory>();

    // Initialize hierarchical categories with empty children arrays
    flatCategories.forEach((category) => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build the hierarchy by assigning children to their parents
    const rootCategories: HierarchicalCategory[] = [];

    // First pass: assign children to parents
    flatCategories.forEach((category) => {
      if (category.parentId && categoryMap.has(category.parentId)) {
        // This is a child - add it to its parent's children array
        const parent = categoryMap.get(category.parentId)!;
        const child = categoryMap.get(category.id)!;
        parent.children.push(child);
      } else if (!category.parentId) {
        // This is a root category
        rootCategories.push(categoryMap.get(category.id)!);
      }
    });

    // Sort root categories by name
    rootCategories.sort((a, b) => a.name.localeCompare(b.name));

    // Sort each parent's children by name
    const sortChildrenRecursively = (categories: HierarchicalCategory[]) => {
      categories.forEach((category) => {
        if (category.children.length > 0) {
          category.children.sort((a, b) => a.name.localeCompare(b.name));
          sortChildrenRecursively(category.children);
        }
      });
    };

    sortChildrenRecursively(rootCategories);

    return rootCategories;
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (expandedCategories.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }
      // Show success message
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      // Refresh categories list
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setCategoryToDelete(null);
    }
  };

  const handleFormClose = (refreshData = false) => {
    setIsFormOpen(false);
    setEditingCategory(null);
    if (refreshData) {
      fetchCategories();
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  // Filter hierarchical categories based on search term
  const filterHierarchicalCategories = (
    categories: HierarchicalCategory[],
    searchTerm: string
  ): HierarchicalCategory[] => {
    if (!searchTerm) return categories;

    return categories
      .filter((category) => {
        // Check if this category matches the search term
        const nameMatches = category.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        // Filter this category's children
        const filteredChildren = filterHierarchicalCategories(
          category.children,
          searchTerm
        );

        // Keep this category if its name matches or if any child matches
        return nameMatches || filteredChildren.length > 0;
      })
      .map((category) => {
        // Return a new object with filtered children
        if (category.children.length === 0) {
          return category;
        }

        return {
          ...category,
          children: filterHierarchicalCategories(category.children, searchTerm),
        };
      });
  };

  const filteredCategories = filterHierarchicalCategories(
    hierarchicalCategories,
    searchTerm
  );

  // Recursively render categories with proper hierarchy
  const renderCategoryRow = (category: HierarchicalCategory, index: number) => {
    const hasChildren = category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const rowKey = `category-${category.id}-${index}`;

    return (
      <React.Fragment key={rowKey}>
        <TableRow className="hover:bg-gray-50">
          <TableCell className="py-2">
            <div className="flex items-center relative">
              {/* Indentation and hierarchy indicators */}
              <div
                className="flex items-center"
                style={{
                  marginLeft: `${category.level * 24}px`,
                  position: "relative",
                }}
              >
                {category.level > 0 && (
                  <div className="relative flex items-center h-full">
                    {/* Horizontal line to category */}
                    <div
                      className="absolute w-6 h-0 border-t-2 border-gray-200"
                      style={{ left: "-12px", top: "50%" }}
                    ></div>
                  </div>
                )}

                <div className="flex items-center z-10 bg-white rounded">
                  {/* Always reserve space for the expand/collapse control for consistent alignment */}
                  {hasChildren ? (
                    <button
                      onClick={() => toggleCategoryExpansion(category.id)}
                      className="mr-1 p-1 rounded hover:bg-gray-100 text-gray-700 focus:outline-none"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <span className="mr-1 p-1 w-6 text-center text-gray-400">
                      --
                    </span>
                  )}

                  {/* Category icon and name */}
                  <Folder
                    className={`h-4 w-4 mr-2 ${
                      hasChildren ? "text-indigo-500" : "text-gray-500"
                    }`}
                  />
                  <span className="font-medium text-gray-800 mr-4">
                    {category.name}
                  </span>
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell className="text-gray-600 truncate max-w-[200px]">
            {category.description || "—"}
          </TableCell>
          <TableCell>
            {category._count?.products || 0}/{category.totalProducts || 0}
          </TableCell>
          <TableCell>{category._count?.children || 0}</TableCell>
          <TableCell>{formatDate(category.createdAt)}</TableCell>
          <TableCell>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditCategory(category)}
                className="text-gray-500 hover:text-blue-600"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoryToDelete(category)}
                className="text-gray-500 hover:text-red-600"
                disabled={
                  (category._count?.children || 0) > 0 ||
                  (category._count?.products || 0) > 0
                }
                title={
                  (category._count?.children || 0) > 0
                    ? "Cannot delete category with subcategories"
                    : (category._count?.products || 0) > 0
                    ? "Cannot delete category with products"
                    : "Delete category"
                }
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {/* Render child categories if expanded */}
        {isExpanded &&
          hasChildren &&
          category.children.map((child, childIndex) =>
            renderCategoryRow(child, childIndex)
          )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Categories
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your product categories and subcategories
          </p>
        </div>
        <Button onClick={handleAddCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-gray-500" />
            <span className="text-gray-600">
              {categories.length} categories in total
            </span>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">
                  <div title="Direct/Total">Products</div>
                </TableHead>
                <TableHead className="w-32">Subcategories</TableHead>
                <TableHead className="w-32">Created</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                      <span className="ml-2 text-gray-500">
                        Loading categories...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-gray-500"
                  >
                    {categories.length === 0
                      ? "No categories found. Create your first category to get started."
                      : "No categories match your search criteria."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category, index) =>
                  renderCategoryRow(category, index)
                )
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Category Form Dialog */}
      {isFormOpen && (
        <CategoryForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          category={editingCategory}
          categories={categories.filter(
            (c) => !editingCategory || c.id !== editingCategory.id
          )}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
