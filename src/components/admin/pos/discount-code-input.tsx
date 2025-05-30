// src/components/admin/pos/discount-code-input.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Tag, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCurrency } from "@/hooks/use-currency.hook";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface AppliedDiscountCode {
  id: string;
  code: string;
  percentage: number;
  title?: string;
  description?: string;
  discountAmount: number;
}

interface DiscountCodeInputProps {
  cart: CartItem[];
  customer: Customer | null;
  subtotal: number;
  appliedDiscountCode: AppliedDiscountCode | null;
  onDiscountApplied: (discountCode: AppliedDiscountCode) => void;
  onDiscountRemoved: () => void;
}

export default function DiscountCodeInput({
  cart,
  customer,
  subtotal,
  appliedDiscountCode,
  onDiscountApplied,
  onDiscountRemoved,
}: DiscountCodeInputProps) {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  
  const [discountCode, setDiscountCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open when discount code is applied
  useEffect(() => {
    if (appliedDiscountCode) {
      setIsOpen(true);
    }
  }, [appliedDiscountCode]);

  // Clear input when discount is removed
  useEffect(() => {
    if (!appliedDiscountCode) {
      setDiscountCode("");
      setValidationError(null);
    }
  }, [appliedDiscountCode]);

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setValidationError("Please enter a discount code");
      return;
    }

    if (cart.length === 0) {
      setValidationError("Add items to cart before applying discount");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      // Prepare cart data for validation
      const cartItems = cart.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
      }));

      const response = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          orderSource: "IN_STORE",
          customerId: customer?.id,
          cartItems,
          subtotal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to validate discount code");
      }

      if (result.valid && result.discountCode && result.discountAmount) {
        // Apply the discount
        const appliedDiscount: AppliedDiscountCode = {
          id: result.discountCode.id,
          code: result.discountCode.code,
          percentage: result.discountCode.percentage,
          title: result.discountCode.title,
          description: result.discountCode.description,
          discountAmount: result.discountAmount,
        };

        onDiscountApplied(appliedDiscount);
        
        toast({
          title: "Discount Applied!",
          description: `${result.discountCode.code} - ${formatPrice(result.discountAmount)} off`,
        });
      } else {
        setValidationError(result.error || "Invalid discount code");
      }
    } catch (error) {
      console.error("Error validating discount code:", error);
      setValidationError(error instanceof Error ? error.message : "Failed to validate discount code");
    } finally {
      setIsValidating(false);
    }
  };

  const removeDiscountCode = () => {
    onDiscountRemoved();
    setDiscountCode("");
    setValidationError(null);
    
    toast({
      title: "Discount Removed",
      description: "Discount code has been removed from the order",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isValidating && !appliedDiscountCode) {
      validateDiscountCode();
    }
  };

  return (
    <div className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between p-3 h-auto"
            type="button"
          >
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span className="text-sm font-medium">
                {appliedDiscountCode ? (
                  <span className="text-green-700">
                    Discount Applied: {appliedDiscountCode.code} (-{formatPrice(appliedDiscountCode.discountAmount)})
                  </span>
                ) : (
                  "Have a discount code?"
                )}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          {appliedDiscountCode ? (
            /* Applied Discount Code Display */
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-green-800">
                          {appliedDiscountCode.code}
                        </span>
                        <span className="text-sm text-green-600">
                          ({appliedDiscountCode.percentage}% off)
                        </span>
                      </div>
                      {appliedDiscountCode.title && (
                        <p className="text-sm text-green-700 mt-1">
                          {appliedDiscountCode.title}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-green-800 mt-1">
                        Discount: {formatPrice(appliedDiscountCode.discountAmount)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeDiscountCode}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Discount Code Input */
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setValidationError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter discount code (e.g., SAVE10)"
                  className="bg-white border-slate-300 text-gray-300 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 font-mono"
                  disabled={isValidating}
                />
                <Button
                  onClick={validateDiscountCode}
                  disabled={isValidating || !discountCode.trim()}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>

              {validationError && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="text-xs text-slate-500">
                Enter a valid discount code to apply savings to your order
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
