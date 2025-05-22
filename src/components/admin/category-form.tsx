"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/utils";
import { AlertCircle, FolderTree } from "lucide-react";
import { s3ImageService } from "@/lib/services/s3-image.service";

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

interface CategoryFormProps {
  isOpen: boolean;
  onClose: (refreshData?: boolean) => void;
  category: Category | null;
  categories: Category[];
}

// Schema validation
const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoryForm({
  isOpen,
  onClose,
  category,
  categories,
}: CategoryFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Get default values for the form
  const defaultValues: CategoryFormValues = {
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image: category?.image || "",
    parentId: category?.parentId || null,
  };

  // Initialize form
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  // Watch name field to auto-generate slug
  const watchedName = form.watch("name");

  // Load image preview from S3 if image is a key
  useEffect(() => {
    const loadImagePreview = async () => {
      const imageValue = category?.image || "";

      // If no image or it's already a data URL, set preview directly
      if (!imageValue || imageValue.startsWith("data:")) {
        setImagePreview(imageValue);
        return;
      }

      // Check if it's an S3 key or URL
      try {
        setIsImageLoading(true);
        if (s3ImageService.isS3Key(imageValue)) {
          // It's an S3 key, get the URL
          const url = await s3ImageService.getImageUrl(imageValue);
          setImagePreview(url);
        } else if (imageValue.startsWith("http")) {
          // It's already a URL, use it directly
          setImagePreview(imageValue);
        }
      } catch (error) {
        console.error("Error loading image preview:", error);
        setImagePreview(null);
      } finally {
        setIsImageLoading(false);
      }
    };

    loadImagePreview();
  }, [category]);

  // Always auto-generate slug when name changes
  useEffect(() => {
    if (!watchedName) return;
    const generatedSlug = slugify(watchedName);

    // Always update the slug based on the name
    form.setValue("slug", generatedSlug, { shouldValidate: true });
  }, [watchedName, form]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const imageDataUrl = event.target.result as string;
          setImagePreview(imageDataUrl);
          // Just store the data URL for now - will convert to S3 on form submit
          form.setValue("image", imageDataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Always ensure slug is generated from name
      values.slug = slugify(values.name);

      // Handle image upload to S3 if it's a data URL
      if (values.image && values.image.startsWith("data:")) {
        try {
          const uploadResult = await s3ImageService.uploadImage(
            values.image,
            `${values.slug}-image.jpg`,
            "categories"
          );

          // Replace data URL with S3 key
          values.image = uploadResult.key;
        } catch (uploadError) {
          console.error("Error uploading image to S3:", uploadError);
          toast({
            title: "Image Upload Failed",
            description:
              "Your category was saved but the image couldn't be uploaded.",
            variant: "destructive",
          });
          // Continue without image if upload fails
          values.image = "";
        }
      }

      const url = category
        ? `/api/categories/${category.id}`
        : "/api/categories";
      const method = category ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || `Failed to ${category ? "update" : "create"} category`
        );
      }

      toast({
        title: "Success",
        description: `Category ${
          category ? "updated" : "created"
        } successfully`,
      });
      onClose(true);
    } catch (error: any) {
      console.error("Error in form submission:", error);
      setError(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove image
  const removeImage = () => {
    setImagePreview(null);
    form.setValue("image", "");
  };

  // Organize categories in hierarchical structure for the dropdown
  const organizeCategoriesForDropdown = () => {
    // Filter out the current category and categories with deep nesting
    const availableCategories = categories.filter(
      (c) => (!category || c.id !== category.id) && c.level < 2
    );

    // Group categories by parent ID
    const groupedByParent: Record<string | "root", Category[]> = { root: [] };

    // First pass: group all categories by their parent
    availableCategories.forEach((cat) => {
      if (!cat.parentId) {
        // Root categories
        groupedByParent["root"].push(cat);
      } else {
        // Child categories
        if (!groupedByParent[cat.parentId]) {
          groupedByParent[cat.parentId] = [];
        }
        groupedByParent[cat.parentId].push(cat);
      }
    });

    // Sort root categories by name
    groupedByParent["root"].sort((a, b) => a.name.localeCompare(b.name));

    // Sort children under each parent by name
    Object.keys(groupedByParent).forEach((parentId) => {
      if (parentId !== "root") {
        groupedByParent[parentId].sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    // Create an array of objects for the dropdown with proper structure
    const result: Array<{
      id: string;
      name: string;
      level: number;
      hasChildren: boolean;
      children?: Category[];
    }> = [];

    // Add root categories first
    groupedByParent["root"].forEach((rootCat) => {
      const hasChildren = !!groupedByParent[rootCat.id]?.length;
      result.push({
        id: rootCat.id,
        name: rootCat.name,
        level: 0,
        hasChildren,
        children: hasChildren ? groupedByParent[rootCat.id] : undefined,
      });
    });

    return result;
  };

  const hierarchicalCategories = organizeCategoriesForDropdown();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              {category ? "Edit Category" : "Create New Category"}
            </div>
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Update your category details below"
              : "Fill in the information below to create a new category"}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Name*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Electronics, Clothing, Books"
                      className="border-2 text-gray-700"
                      style={{ borderColor: "#bdc3c7" }}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, descriptive name for your category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug field is removed from UI but still managed in the form */}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this category for your customers"
                      className="min-h-[100px] border-2 text-gray-700"
                      style={{ borderColor: "#bdc3c7" }}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of what products belong in this
                    category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Category Image
                  </FormLabel>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        {isImageLoading ? (
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
                            <p className="mt-2 text-sm text-gray-600">
                              Loading image...
                            </p>
                          </div>
                        ) : imagePreview ? (
                          <div className="relative w-full h-full">
                            <img
                              src={imagePreview}
                              alt="Category preview"
                              className="w-full h-full object-contain p-2"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-sm font-medium">
                                Click to change image
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg
                              className="w-10 h-10 mb-3 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              ></path>
                            </svg>
                            <p className="mb-2 text-sm text-gray-600">
                              <span className="font-semibold">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                        )}
                        <input
                          id="image-upload"
                          name="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 w-full"
                        onClick={removeImage}
                      >
                        Remove Image
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    Upload an image to represent this category (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Parent Category
                  </FormLabel>
                  <Select
                    value={field.value || "null"}
                    onValueChange={(value) => {
                      form.setValue(
                        "parentId",
                        value === "null" ? null : value
                      );
                    }}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="border-2 text-gray-700"
                        style={{ borderColor: "#bdc3c7" }}
                      >
                        <SelectValue placeholder="Select a parent category (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">None (Root Category)</SelectItem>
                      {/* Root categories and their children */}
                      {hierarchicalCategories.map((rootCategory) => (
                        <React.Fragment key={rootCategory.id}>
                          {/* Root category */}
                          <SelectItem value={rootCategory.id}>
                            {rootCategory.name}
                          </SelectItem>
                          {/* Child categories */}
                          {rootCategory.children?.map((childCategory) => (
                            <SelectItem
                              key={childCategory.id}
                              value={childCategory.id}
                              className="pl-7"
                            >
                              └─ {childCategory.name}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {category
                      ? "You can move this category under a different parent"
                      : "Leave empty to create a top-level category"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
                className="border-2"
                style={{ borderColor: "#bdc3c7", color: "#2c3e50" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{ backgroundColor: "#16a085", color: "white" }}
                disabled={isSubmitting || isImageLoading}
              >
                {isSubmitting
                  ? "Saving..."
                  : category
                  ? "Update Category"
                  : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
