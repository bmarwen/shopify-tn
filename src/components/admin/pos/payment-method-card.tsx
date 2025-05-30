import React from "react";
import { CreditCard, Banknote, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/use-currency.hook";

interface PaymentMethod {
  id: string;
  method: "CASH" | "CREDIT_CARD" | "CHECK";
  amount: number;
  cashGiven?: number;
  cashChange?: number;
  checkNumber?: string;
  checkBankName?: string;
  checkDate?: Date;
  notes?: string;
}

interface PaymentMethodCardProps {
  payment: PaymentMethod;
  index: number;
  totalPayments: number;
  checkPayments: PaymentMethod[];
  cart: any[]; // Add cart prop with proper type
  onUpdate: (id: string, updates: Partial<PaymentMethod>) => void;
  onRemove: (id: string) => void;
}

export default function PaymentMethodCard({
  payment,
  index,
  totalPayments,
  checkPayments,
  cart,
  onUpdate,
  onRemove,
}: PaymentMethodCardProps) {
  const { formatPrice } = useCurrency();

  const getPaymentTitle = () => {
    switch (payment.method) {
      case 'CASH':
        return 'Cash Payment';
      case 'CREDIT_CARD':
        return 'Card Payment';
      case 'CHECK':
        return `Check #${checkPayments.indexOf(payment) + 1}`;
      default:
        return 'Payment';
    }
  };

  const getPaymentIcon = () => {
    switch (payment.method) {
      case 'CASH':
        return <Banknote className="h-4 w-4 mr-2 text-green-600" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4 mr-2 text-blue-600" />;
      case 'CHECK':
        return <Receipt className="h-4 w-4 mr-2 text-purple-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700 flex items-center">
            {getPaymentIcon()}
            {getPaymentTitle()}
          </CardTitle>
          {totalPayments > 1 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRemove(payment.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Amount Input */}
          <div>
            <Label className="text-xs text-slate-600 font-bold">Amount</Label>
            <Input
            type="number"
            step="0.01"
            min="0.01"
            value={payment.amount || ''}
            onChange={(e) => onUpdate(payment.id, { amount: Number(e.target.value) })}
            placeholder="0.00"
            className="mt-1 text-sm"
            disabled={payment.method === 'CASH'} // Cash amount auto-adjusts
            />
            {payment.method === 'CASH' && (
            <p className="text-xs text-orange-300 mt-1 font-semibold">
            💡 Cash amount will be auto-adjusted
            </p>
            )}
          </div>

          {/* Cash-specific fields */}
          {payment.method === 'CASH' && payment.amount > 0 && (
            <div className="space-y-2 p-2 bg-green-50 border border-green-200 rounded">
              <div>
                <Label className="text-xs text-slate-600 font-bold">Cash Given by Customer</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={payment.amount}
                  value={payment.cashGiven || ''}
                  onChange={(e) => {
                    const given = Number(e.target.value) || 0;
                    const change = given - (payment.amount || 0);
                    onUpdate(payment.id, { 
                      cashGiven: given, 
                      cashChange: Math.max(0, Math.round(change * 100) / 100) // Round to 2 decimal places
                    });
                  }}
                  placeholder={`Min: ${formatPrice(payment.amount || 0)}`}
                  className="mt-1 text-xs bg-white"
                />
                {payment.cashGiven && payment.cashGiven < (payment.amount || 0) && (
                  <div className="mt-2 p-2 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded">
                    <p className="text-xs text-red-800 font-bold">
                      ⚠️ Cash given must be at least {formatPrice(payment.amount || 0)}
                    </p>
                  </div>
                )}
              </div>
              {payment.cashGiven && payment.cashGiven >= (payment.amount || 0) && (
                <div className="text-xs text-green-700 font-medium">
                  💵 Change to return: {formatPrice(Math.round(((payment.cashGiven || 0) - (payment.amount || 0)) * 100) / 100)}
                </div>
              )}
            </div>
          )}

          {/* Cash amount is 0 - no cash given needed */}
          {payment.method === 'CASH' && payment.amount === 0 && cart.length > 0 && (
            <div className="space-y-2 p-2 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs text-slate-600">
                💡 No cash payment needed - fully covered by other payment methods
              </p>
            </div>
          )}

          {/* Check-specific fields */}
          {payment.method === 'CHECK' && (
            <div className="space-y-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-600 font-bold">Check Number *</Label>
                  <Input
                    type="text"
                    value={payment.checkNumber || ''}
                    onChange={(e) => onUpdate(payment.id, { checkNumber: e.target.value })}
                    placeholder="123456"
                    className={`mt-1 text-xs bg-white ${
                      !payment.checkNumber && payment.amount > 0 
                        ? 'border-red-300 focus:border-red-500' 
                        : ''
                    }`}
                  />
                  {!payment.checkNumber && payment.amount > 0 && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded">
                      <p className="text-xs text-red-800 font-bold">
                        ⚠️ Check number is required
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Bank Name</Label>
                  <Input
                    type="text"
                    value={payment.checkBankName || ''}
                    onChange={(e) => onUpdate(payment.id, { checkBankName: e.target.value })}
                    placeholder="Bank name"
                    className="mt-1 text-xs bg-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-bold">Check Date *</Label>
                <Input
                  type="date"
                  value={payment.checkDate ? payment.checkDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdate(payment.id, { checkDate: new Date(e.target.value) })}
                  className={`mt-1 text-xs bg-white ${
                    (!payment.checkDate || payment.checkDate < new Date(new Date().setHours(0,0,0,0))) && payment.amount > 0
                      ? 'border-red-300 focus:border-red-500' 
                      : ''
                  }`}
                />
                {(!payment.checkDate || payment.checkDate < new Date(new Date().setHours(0,0,0,0))) && payment.amount > 0 && (
                  <div className="mt-2 p-2 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded">
                    <p className="text-xs text-red-800 font-bold">
                      ⚠️ Check date is required and cannot be in the past
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Credit Card specific fields */}
          {payment.method === 'CREDIT_CARD' && (
            <div className="space-y-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-slate-600">💳 Card payment processing will be handled externally</p>
            </div>
          )}

          {/* Notes for this payment */}
          <div>
            <Label className="text-xs text-slate-600">Payment Notes (Optional)</Label>
            <Input
              type="text"
              value={payment.notes || ''}
              onChange={(e) => onUpdate(payment.id, { notes: e.target.value })}
              placeholder="Notes for this payment..."
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
