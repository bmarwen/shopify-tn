// src/components/admin/shared/enhanced-customer-select.tsx
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  User, 
  X,
  Users,
  Filter,
  ShoppingBag,
  UserX
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  orders?: { id: string }[]; // For filtering by order history
}

interface EnhancedCustomerSelectProps {
  customers: Customer[];
  selectedCustomerIds: string[];
  onSelectionChange: (customerIds: string[]) => void;
  placeholder?: string;
}

export default function EnhancedCustomerSelect({
  customers,
  selectedCustomerIds,
  onSelectionChange,
  placeholder = "Search customers...",
}: EnhancedCustomerSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Filter and search customers
  const filteredAndSearchedCustomers = useMemo(() => {
    let filtered = customers;

    // Apply filter first
    switch (filterType) {
      case "no-orders":
        filtered = customers.filter(customer => !customer.orders || customer.orders.length === 0);
        break;
      case "has-orders":
        filtered = customers.filter(customer => customer.orders && customer.orders.length > 0);
        break;
      case "all":
      default:
        filtered = customers;
        break;
    }

    // Then apply search if query is long enough
    if (searchQuery.length >= 3) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => {
        return (
          customer.name?.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query)
        );
      });
    }

    return filtered.slice(0, 20); // Limit results
  }, [customers, searchQuery, filterType]);

  const handleCustomerToggle = (customerId: string) => {
    const newSelected = selectedCustomerIds.includes(customerId)
      ? selectedCustomerIds.filter(id => id !== customerId)
      : [...selectedCustomerIds, customerId];
    
    onSelectionChange(newSelected);
  };

  const removeCustomer = (customerId: string) => {
    onSelectionChange(selectedCustomerIds.filter(id => id !== customerId));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    const allVisibleIds = filteredAndSearchedCustomers.map(c => c.id);
    const newSelected = [...new Set([...selectedCustomerIds, ...allVisibleIds])];
    onSelectionChange(newSelected);
  };

  // Get selected customers for display
  const selectedCustomers = customers.filter(c => selectedCustomerIds.includes(c.id));

  // Get filter counts
  const filterCounts = useMemo(() => {
    return {
      all: customers.length,
      hasOrders: customers.filter(c => c.orders && c.orders.length > 0).length,
      noOrders: customers.filter(c => !c.orders || c.orders.length === 0).length,
    };
  }, [customers]);

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center justify-between w-full">
                <span>All Customers</span>
                <Badge variant="secondary" className="ml-2">{filterCounts.all}</Badge>
              </div>
            </SelectItem>
            <SelectItem value="no-orders">
              <div className="flex items-center justify-between w-full">
                <span>No Orders Yet</span>
                <Badge variant="secondary" className="ml-2">{filterCounts.noOrders}</Badge>
              </div>
            </SelectItem>
            <SelectItem value="has-orders">
              <div className="flex items-center justify-between w-full">
                <span>Has Orders</span>
                <Badge variant="secondary" className="ml-2">{filterCounts.hasOrders}</Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      {(searchQuery.length >= 3 || filterType !== "all") && (
        <Card className="max-h-64 overflow-y-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  Customers ({filteredAndSearchedCustomers.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  {filterType === "no-orders" && "Customers who haven't placed orders yet"}
                  {filterType === "has-orders" && "Customers with order history"}
                  {filterType === "all" && "All customers"}
                </CardDescription>
              </div>
              {filteredAndSearchedCustomers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  Select All Visible
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredAndSearchedCustomers.length === 0 ? (
              <div className="text-center py-4">
                <UserX className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">
                  {searchQuery.length >= 3 
                    ? `No customers found matching "${searchQuery}"`
                    : "No customers match the selected filter"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSearchedCustomers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`customer-${customer.id}`}
                        checked={selectedCustomerIds.includes(customer.id)}
                        onCheckedChange={() => handleCustomerToggle(customer.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{customer.name || "No Name"}</span>
                          {customer.orders && customer.orders.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              <ShoppingBag className="h-3 w-3 mr-1" />
                              {customer.orders.length} orders
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <UserX className="h-3 w-3 mr-1" />
                              New customer
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{customer.email}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Customers */}
      {selectedCustomers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Selected Customers ({selectedCustomers.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
            <CardDescription className="text-xs">
              This discount code will only work for these customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedCustomers.map(customer => (
              <div key={customer.id} className="border rounded-lg p-3 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">
                        {customer.name || "No Name"}
                      </div>
                      <div className="text-sm text-blue-700">
                        {customer.email}
                      </div>
                    </div>
                    {customer.orders && customer.orders.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {customer.orders.length} orders
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomer(customer.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Help Text for Empty State */}
      {searchQuery.length < 3 && filterType === "all" && selectedCustomers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">
            Search customers or use filters to find specific groups
          </p>
          <p className="text-xs mt-2">
            You can filter by order history and select multiple customers
          </p>
        </div>
      )}
    </div>
  );
}
