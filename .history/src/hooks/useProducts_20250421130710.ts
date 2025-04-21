// src/hooks/useProducts.ts
import { useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchProducts = async () => {
      if (status === "loading" || !session?.user?.shopId) return;

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
  }, [session, status, filters, toast]);

  return {
    isLoading,
    products,
    totalProducts,
    totalPages,
    lowStockThreshold,
    productStats,
  };
}
