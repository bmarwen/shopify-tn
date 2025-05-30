import React from "react";
import { AlertCircle, Receipt, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency.hook";

interface OrderActionsProps {
  cart: any[];
  isProcessing: boolean;
  remainingAmount: number;
  onProcessOrder: () => void;
  paymentValidation?: { valid: boolean; message?: string };
}

export default function OrderActions({
  cart,
  isProcessing,
  remainingAmount,
  onProcessOrder,
  paymentValidation,
}: OrderActionsProps) {
  const { formatPrice } = useCurrency();

  const canProcessOrder = cart.length > 0 && 
                         !isProcessing && 
                         Math.abs(remainingAmount) <= 0.01 && 
                         (!paymentValidation || paymentValidation.valid);

  return (
    <div className="space-y-3">
      {/* Process Order Button */}
      <Button
        onClick={onProcessOrder}
        disabled={!canProcessOrder}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold disabled:bg-gray-400"
        size="lg"
      >
        <Receipt className="h-4 w-4 mr-2" />
        {isProcessing ? "Processing..." : "Process Order"}
      </Button>

      {/* Status messages */}
      {cart.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <AlertCircle className="h-4 w-4" />
          Add items to cart to process order
        </div>
      )}
      
      {Math.abs(remainingAmount) > 0.01 && cart.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <XCircle className="h-4 w-4" />
          {remainingAmount > 0 
            ? `⚠ Insufficient ${formatPrice(remainingAmount)} short` 
            : `Payment over by ${formatPrice(-remainingAmount)}`
          }
        </div>
      )}

      {/* Payment validation errors */}
      {paymentValidation && !paymentValidation.valid && cart.length > 0 && (
        <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800 font-bold text-sm">
              {paymentValidation.message}
            </span>
          </div>
        </div>
      )}

      {Math.abs(remainingAmount) < 0.01 && cart.length > 0 && (!paymentValidation || paymentValidation.valid) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          ✓ Ready to process order
        </div>
      )}
    </div>
  );
}
