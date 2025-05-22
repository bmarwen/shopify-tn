// src/components/admin/pagination.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex justify-between items-center mt-6 px-4 py-2 bg-white border rounded-md shadow-sm">
      <div className="text-sm text-gray-800">
        Showing {totalItems > 0 ? (currentPage - 1) * 10 + 1 : 0} to{" "}
        {Math.min(currentPage * 10, totalItems)} of {totalItems} items
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(1)}
          disabled={currentPage <= 1}
          className="border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded">
          Page {currentPage} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(totalPages)}
          disabled={currentPage >= totalPages}
          className="border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
