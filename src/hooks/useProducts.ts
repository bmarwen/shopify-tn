// src/hooks/useProducts.ts
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { Product, ProductResponse, ProductFiltersType } from "@/types/product";

export function useProducts(filters: ProductFiltersType) {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [productStats, setProductStats] = useState({
    totalInventory: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  // Use a ref to track the previous filters to avoid unnecessary API calls
  const prevFiltersRef = useRef<string>("");
  const currentFiltersString = JSON.stringify(filters);

  useEffect(() => {
    // Skip if session is loading or filters haven't changed
    if (
      status === "loading" ||
      !session?.user?.shopId ||
      prevFiltersRef.current === currentFiltersString
    ) {
      return;
    }

    // Update the previous filters ref
    prevFiltersRef.current = currentFiltersString;

    const fetchProducts = async () => {
      setIsLoading(true);

      try {
        // Fetch products with all params
        const response = await apiClient.products.getProducts(filters);

        setProducts(response.products);
        setTotalProducts(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        setLowStockThreshold(response.filter.lowStockThreshold);
        setProductStats(response.stats);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [session, status, currentFiltersString, toast]);

  return {
    isLoading,
    products,
    totalProducts,
    totalPages,
    lowStockThreshold,
    productStats,
  };
}
