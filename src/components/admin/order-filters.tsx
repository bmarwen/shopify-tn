"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const orderStatuses = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

const paymentStatuses = [
  { value: "all", label: "All Payment" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
];

const orderSources = [
  { value: "all", label: "All Sources" },
  { value: "ONLINE", label: "Online" },
  { value: "IN_STORE", label: "In Store" },
  { value: "PHONE", label: "Phone" },
];

const dateFilters = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

interface OrderFiltersProps {
  currentFilters: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    orderSource?: string;
    dateFilter?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    perPage?: string;
    sort?: string;
    order?: string;
  };
}

export default function OrderFilters({ currentFilters }: OrderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for filters to enable live updates
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || "");
  const [selectedStatus, setSelectedStatus] = useState(
    currentFilters.status || "all"
  );
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(
    currentFilters.paymentStatus || "all"
  );
  const [selectedOrderSource, setSelectedOrderSource] = useState(
    currentFilters.orderSource || "all"
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState(
    currentFilters.dateFilter || "today"
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentFilters.dateTo ? new Date(currentFilters.dateTo) : undefined
  );

  // Update URL when filters change
  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 when filters change
    params.set("page", "1");

    // Update search parameter
    if (searchTerm) {
      params.set("search", searchTerm);
    } else {
      params.delete("search");
    }

    // Update status parameter
    if (selectedStatus && selectedStatus !== "all") {
      params.set("status", selectedStatus);
    } else {
      params.delete("status");
    }

    // Update payment status parameter
    if (selectedPaymentStatus && selectedPaymentStatus !== "all") {
      params.set("paymentStatus", selectedPaymentStatus);
    } else {
      params.delete("paymentStatus");
    }

    // Update order source parameter
    if (selectedOrderSource && selectedOrderSource !== "all") {
      params.set("orderSource", selectedOrderSource);
    } else {
      params.delete("orderSource");
    }

    // Update date filter parameter
    if (selectedDateFilter) {
      params.set("dateFilter", selectedDateFilter);
    } else {
      params.delete("dateFilter");
    }

    // Update date filters (only for custom range)
    if (selectedDateFilter === "custom") {
      if (dateFrom) {
        params.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
      } else {
        params.delete("dateFrom");
      }

      if (dateTo) {
        params.set("dateTo", format(dateTo, "yyyy-MM-dd"));
      } else {
        params.delete("dateTo");
      }
    } else {
      // Clear custom date fields when using preset date filters
      params.delete("dateFrom");
      params.delete("dateTo");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Live search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedStatus, selectedPaymentStatus, selectedOrderSource, selectedDateFilter, dateFrom, dateTo]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedPaymentStatus("all");
    setSelectedOrderSource("all");
    setSelectedDateFilter("today");
    setDateFrom(undefined);
    setDateTo(undefined);

    router.push(pathname);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedStatus !== "all" ||
    selectedPaymentStatus !== "all" ||
    selectedOrderSource !== "all" ||
    selectedDateFilter !== "today" ||
    dateFrom ||
    dateTo;

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 space-y-4 border border-gray-200">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order number, customer..."
              className="pl-10 max-w-md text-gray-100"
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
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-44 text-gray-100">
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              {orderStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedPaymentStatus}
            onValueChange={setSelectedPaymentStatus}
          >
            <SelectTrigger className="w-44 text-gray-100">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              {paymentStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedOrderSource}
            onValueChange={setSelectedOrderSource}
          >
            <SelectTrigger className="w-44 text-gray-100">
              <SelectValue placeholder="Order Source" />
            </SelectTrigger>
            <SelectContent>
              {orderSources.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date filter */}
          <div className="flex gap-2">
            <Select
              value={selectedDateFilter}
              onValueChange={setSelectedDateFilter}
            >
              <SelectTrigger className="w-36 text-gray-100">
                <SelectValue placeholder="Date Filter" />
              </SelectTrigger>
              <SelectContent>
                {dateFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDateFilter === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex gap-2 text-gray-700">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      {dateFrom ? format(dateFrom, "PP") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex gap-2 text-gray-700">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      {dateTo ? format(dateTo, "PP") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
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
