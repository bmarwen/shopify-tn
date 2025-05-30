// src/components/admin/discount-codes/searchable-customer-select.tsx
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Search, 
  User, 
  X,
  Users
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface SearchableCustomerSelectProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectionChange: (customerId: string) => void;
  placeholder?: string;
}

export default function SearchableCustomerSelect({
  customers,
  selectedCustomerId,
  onSelectionChange,
  placeholder = "Search customers...",
}: SearchableCustomerSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Search function
  const searchResults = useMemo(() => {
    if (searchQuery.length < 3) return [];

    const query = searchQuery.toLowerCase();
    const results = customers.filter(customer => {
      return (
        customer.name?.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query)
      );
    });

    return results.slice(0, 10); // Limit to 10 results
  }, [searchQuery, customers]);

  const handleCustomerSelect = (customerId: string) => {
    onSelectionChange(customerId);
    setSearchQuery(""); // Clear search after selection
  };

  const clearSelection = () => {
    onSelectionChange("");
  };

  // Get selected customer for display
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {searchQuery.length >= 3 && (
        <Card className="max-h-64 overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Search Results ({searchResults.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Select a customer for this discount code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No customers found matching "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleCustomerSelect(customer.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium">{customer.name || "No Name"}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                      {selectedCustomerId === customer.id && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Customer */}
      {selectedCustomer && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center">
                <User className="h-4 w-4 mr-2" />
                Selected Customer
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-red-600 hover:text-red-700"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-3 bg-blue-50">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">
                    {selectedCustomer.name || "No Name"}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedCustomer.email}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text for Empty State */}
      {searchQuery.length < 3 && !selectedCustomer && (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">
            Start typing to search for customers (minimum 3 characters)
          </p>
          <p className="text-xs mt-2">
            Search by customer name or email address
          </p>
        </div>
      )}
    </div>
  );
}
