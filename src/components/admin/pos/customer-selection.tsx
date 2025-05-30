import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CustomerSelectionProps {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  onSearchCustomers: (query: string) => void;
}

export default function CustomerSelection({
  customer,
  setCustomer,
  customers,
  setCustomers,
  onSearchCustomers,
}: CustomerSelectionProps) {
  return (
    <div className="mb-6">
      <Label htmlFor="customer" className="text-slate-700 font-semibold text-sm">
        Customer (Optional)
      </Label>
      <div className="mt-2">
        <Input
          placeholder="Search customers by name, email, or phone... (min 3 characters)"
          onChange={(e) => onSearchCustomers(e.target.value)}
          className="bg-white border-slate-300 text-gray-300 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
        />
        {customers.length > 0 && (
          <div className="mt-2 border border-slate-200 rounded-lg max-h-32 overflow-y-auto bg-white">
            {customers.map((cust) => (
              <div
                key={cust.id}
                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                onClick={() => {
                  setCustomer(cust);
                  setCustomers([]);
                }}
              >
                <p className="font-semibold text-slate-900">{cust.name}</p>
                <p className="text-sm text-slate-600">{cust.email}</p>
                {cust.phone && (
                  <p className="text-sm text-slate-600">{cust.phone}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {customer && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{customer.name}</p>
              <p className="text-sm text-slate-600">{customer.email}</p>
              {customer.phone && (
                <p className="text-sm text-slate-600">{customer.phone}</p>
              )}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setCustomer(null)}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
