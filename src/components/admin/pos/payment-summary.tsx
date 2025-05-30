import React from "react";
import { CreditCard, Banknote, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/use-currency.hook";

interface PaymentMethod {
  id: string;
  method: "CASH" | "CREDIT_CARD" | "CHECK";
  amount: number;
}

interface PaymentSummaryProps {
  orderTotal: number;
  totalPaid: number;
  remainingAmount: number;
  paymentMethods: PaymentMethod[];
  cashPayments: PaymentMethod[];
  cardPayments: PaymentMethod[];
  checkPayments: PaymentMethod[];
  onAddPaymentMethod: (type: "CASH" | "CREDIT_CARD" | "CHECK") => void;
}

export default function PaymentSummary({
  orderTotal,
  totalPaid,
  remainingAmount,
  paymentMethods,
  cashPayments,
  cardPayments,
  checkPayments,
  onAddPaymentMethod,
}: PaymentSummaryProps) {
  const { formatPrice } = useCurrency();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-slate-700 font-semibold text-sm">Payment Methods</Label>
        <div className="flex gap-1">
          {cashPayments.length === 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAddPaymentMethod('CASH')}
              className="text-green-600 border-green-300 hover:bg-green-50 text-xs px-2 py-1"
            >
              <Banknote className="h-3 w-3 mr-1" />
              Cash
            </Button>
          )}
          {cardPayments.length === 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAddPaymentMethod('CREDIT_CARD')}
              className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs px-2 py-1"
            >
              <CreditCard className="h-3 w-3 mr-1" />
              Card
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAddPaymentMethod('CHECK')}
            className="text-purple-600 border-purple-300 hover:bg-purple-50 text-xs px-2 py-1"
          >
            <Receipt className="h-3 w-3 mr-1" />
            Add Check
          </Button>
        </div>
      </div>

      {/* Payment Summary Card */}
      <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Order Total:</span>
          <span className="font-medium text-slate-900">{formatPrice(orderTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total Paid:</span>
          <span className={`font-medium ${
            Math.abs(totalPaid - orderTotal) < 0.01 ? 'text-green-600' : 
            totalPaid > orderTotal ? 'text-orange-600' : 'text-red-600'
          }`}>
            {formatPrice(totalPaid)}
          </span>
        </div>
        <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
          <span className="font-medium text-slate-700">Remaining:</span>
          <span className={`font-medium ${
            Math.abs(remainingAmount) < 0.01 ? 'text-green-600' : 
            remainingAmount < 0 ? 'text-orange-600' : 'text-red-600'
          }`}>
            {formatPrice(remainingAmount)}
          </span>
        </div>

        {/* Payment Method Breakdown */}
        {paymentMethods.length > 1 && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="text-xs text-slate-600 mb-1">Payment Breakdown:</div>
            {paymentMethods.map((payment, index) => (
              <div key={payment.id} className="flex justify-between text-xs text-slate-700">
                <span className="flex items-center">
                  {payment.method === 'CASH' && <Banknote className="h-3 w-3 mr-1 text-green-600" />}
                  {payment.method === 'CREDIT_CARD' && <CreditCard className="h-3 w-3 mr-1 text-blue-600" />}
                  {payment.method === 'CHECK' && <Receipt className="h-3 w-3 mr-1 text-purple-600" />}
                  {payment.method === 'CASH' && 'CASH'}
                  {payment.method === 'CREDIT_CARD' && 'CARD'}
                  {payment.method === 'CHECK' && `CHECK #${checkPayments.indexOf(payment) + 1}`}
                  :
                </span>
                <span>{formatPrice(payment.amount || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
