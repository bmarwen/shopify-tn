"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Check, X, Percent } from "lucide-react";

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface POSDiscountCodeProps {
  cartItems: CartItem[];
  onDiscountApplied: (discount: {
    code: string;
    percentage: number;
    applicableProducts: string[];
    totalDiscount: number;
  }) => void;
  onDiscountRemoved: () => void;
  appliedDiscount?: any;
}

export function POSDiscountCode({ 
  cartItems, 
  onDiscountApplied, 
  onDiscountRemoved, 
  appliedDiscount 
}: POSDiscountCodeProps) {
  const [discountCode, setDiscountCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setError("Please enter a discount code");
      return;
    }

    setLoading(true);
    setError("");
    setValidationResult(null);

    try {
      const response = await fetch("/api/pos/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode.toUpperCase(),
          productIds: cartItems.map(item => item.productId),
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        const result = {
          ...data,
          code: discountCode.toUpperCase(),
        };
        
        // Calculate total discount amount
        const applicableItems = cartItems.filter(item => 
          data.applicableProducts.length === 0 || data.applicableProducts.includes(item.productId)
        );
        
        const subtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscount = (subtotal * data.discountPercentage) / 100;
        
        result.totalDiscount = totalDiscount;
        
        setValidationResult(result);
        onDiscountApplied(result);
      } else {
        setError(data.message || "Invalid discount code");
        setValidationResult(null);
      }
    } catch (error) {
      setError("Failed to validate discount code");
      setValidationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const removeDiscount = () => {
    setDiscountCode("");
    setValidationResult(null);
    setError("");
    onDiscountRemoved();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      validateDiscountCode();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Discount Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!appliedDiscount ? (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="discountCode" className="sr-only">
                  Discount Code
                </Label>
                <Input
                  id="discountCode"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter discount code"
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={validateDiscountCode}
                disabled={loading || !discountCode.trim()}
              >
                {loading ? "Validating..." : "Apply"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">
                    Code: {appliedDiscount.code}
                  </div>
                  <div className="text-sm text-green-600">
                    {appliedDiscount.discountPercentage}% discount applied
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeDiscount}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {appliedDiscount.applicableProducts.length > 0 && (
              <div className="text-sm text-gray-600">
                Applied to {appliedDiscount.applicableProducts.length} item(s) in cart
              </div>
            )}

            <div className="flex justify-between items-center font-medium text-green-700">
              <span>Total Discount:</span>
              <span>${appliedDiscount.totalDiscount?.toFixed(2)}</span>
            </div>
          </div>
        )}

        {cartItems.length === 0 && (
          <Alert>
            <AlertDescription>
              Add items to cart to apply discount codes
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
