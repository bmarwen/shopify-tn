import React, { useState } from "react";
import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useCurrency } from "@/hooks/use-currency.hook";

// Import our new components
import CustomerSelection from "./customer-selection";
import PaymentSummary from "./payment-summary";
import PaymentMethodCard from "./payment-method-card";
import OrderActions from "./order-actions";
import DiscountCodeInput from "./discount-code-input";
import { Customer, CartItem, AppliedDiscountCode } from "../pos-system";

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

interface MultiPaymentCheckoutProps {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  orderDiscount: number;
  setOrderDiscount: (discount: number) => void;
  orderDiscountType: "PERCENTAGE" | "FIXED";
  setOrderDiscountType: (type: "PERCENTAGE" | "FIXED") => void;
  notes: string;
  setNotes: (notes: string) => void;
  totals: {
    subtotalIncludingTva: number;
    subtotalExcludingTva: number;
    discountAmount: number;
    discountCodeAmount: number;
    discountedSubtotalExcludingTva: number;
    tax: number;
    total: number;
  };
  cart: CartItem[];
  customer: Customer | null;
  appliedDiscountCode: AppliedDiscountCode | null;
  onDiscountCodeApplied: (discountCode: AppliedDiscountCode) => void;
  onDiscountCodeRemoved: () => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  validateDiscountAmount: (amount: number, type: "PERCENTAGE" | "FIXED", subtotalIncludingTva: number) => boolean;
  calculateDiscountPercentageForDB: (amount: number, type: "PERCENTAGE" | "FIXED", subtotalIncludingTva: number) => number;
  clearCart: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: any[]) => void;
}

export default function MultiPaymentCheckout({
  customer,
  setCustomer,
  customers,
  setCustomers,
  orderDiscount,
  setOrderDiscount,
  orderDiscountType,
  setOrderDiscountType,
  notes,
  setNotes,
  totals,
  cart,
  appliedDiscountCode,
  onDiscountCodeApplied,
  onDiscountCodeRemoved,
  isProcessing,
  setIsProcessing,
  validateDiscountAmount,
  calculateDiscountPercentageForDB,
  clearCart,
  setSearchQuery,
  setSearchResults,
}: MultiPaymentCheckoutProps) {
  const { toast } = useToast();
  const { formatPrice, currencySymbol } = useCurrency();

  // Payment methods state - start with cash by default with empty amount
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'cash-1',
      method: 'CASH',
      amount: 0,
      cashGiven: undefined, // Start with undefined instead of 0
      cashChange: 0
    }
  ]);

  // Update cash payment amount when total changes
  React.useEffect(() => {
    if (paymentMethods.length === 1 && paymentMethods[0].method === 'CASH' && totals.total > 0) {
      setPaymentMethods([{
        ...paymentMethods[0],
        amount: totals.total,
        cashGiven: undefined, // Keep cash given as undefined by default
        cashChange: 0
      }]);
    }
  }, [totals.total]);

  // Search customers
  const searchCustomers = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setCustomers([]);
      return;
    }

    try {
      const response = await fetch(`/api/pos/customers?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  };

  // Handle discount input change with validation (only for manual discount)
  const handleDiscountChange = (value: string) => {
    const numValue = Number(value);
    const availableSubtotal = totals.subtotalIncludingTva - (totals.discountCodeAmount || 0);
    
    if (orderDiscountType === "PERCENTAGE") {
      setOrderDiscount(Math.min(Math.max(0, numValue), 100));
    } else {
      setOrderDiscount(Math.min(Math.max(0, numValue), availableSubtotal));
    }
  };

  // Add new payment method
  const addPaymentMethod = (type: "CASH" | "CREDIT_CARD" | "CHECK") => {
    const remainingAmount = getTotalPaidAmount() - totals.total;
    
    // Check if this payment type already exists (except for CHECK which can have multiple)
    if (type !== "CHECK") {
      const existingPayment = paymentMethods.find(p => p.method === type);
      if (existingPayment) {
        toast({
          title: "Payment Method Exists",
          description: `${type} payment already exists. You can modify the amount instead.`,
          variant: "destructive",
        });
        return;
      }
    }

    const newPayment: PaymentMethod = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      method: type,
      amount: type === "CHECK" ? 0 : Math.max(0, -remainingAmount), // Checks start at 0, others take remaining
      ...(type === "CASH" && {
        cashGiven: Math.max(0, -remainingAmount),
        cashChange: 0
      }),
      ...(type === "CHECK" && {
        checkDate: new Date()
      })
    };

    setPaymentMethods([...paymentMethods, newPayment]);
  };

  // Remove payment method with proper cash adjustment
  const removePaymentMethod = (id: string) => {
    if (paymentMethods.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one payment method is required",
        variant: "destructive",
      });
      return;
    }
    
    setPaymentMethods(prev => {
      const filtered = prev.filter(p => p.id !== id);
      
      // Auto-adjust cash payment after removing a payment method
      const cashPayment = filtered.find(p => p.method === 'CASH');
      if (cashPayment) {
        const otherPaymentsTotal = filtered
          .filter(p => p.method !== 'CASH')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const remainingForCash = Math.max(0, totals.total - otherPaymentsTotal);
        const roundedRemaining = Math.round(remainingForCash * 100) / 100;
        
        return filtered.map(p => 
          p.method === 'CASH' 
            ? { 
                ...p, 
                amount: roundedRemaining,
                // Preserve cashGiven, only update change
                cashChange: p.cashGiven ? Math.max(0, Math.round((p.cashGiven - roundedRemaining) * 100) / 100) : 0
              }
            : p
        );
      }
      
      return filtered;
    });
  };

  // Update payment method with proper handling
  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    setPaymentMethods(prev => {
      const updated = prev.map(p => 
        p.id === id ? { ...p, ...updates } : p
      );
      
      // Only auto-adjust cash if we're updating a NON-cash payment amount
      const updatedPayment = prev.find(p => p.id === id);
      if (updatedPayment && updatedPayment.method !== 'CASH' && updates.amount !== undefined) {
        const cashPayment = updated.find(p => p.method === 'CASH');
        if (cashPayment) {
          const otherPaymentsTotal = updated
            .filter(p => p.method !== 'CASH')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const remainingForCash = Math.max(0, totals.total - otherPaymentsTotal);
          const roundedRemaining = Math.round(remainingForCash * 100) / 100; // Fix floating point
          
          return updated.map(p => 
            p.method === 'CASH' 
              ? { 
                  ...p, 
                  amount: roundedRemaining,
                  // Don't auto-change cashGiven - let user control it
                  cashChange: p.cashGiven ? Math.max(0, Math.round((p.cashGiven - roundedRemaining) * 100) / 100) : 0
                }
              : p
          );
        }
      }
      
      return updated;
    });
  };

  // Auto-adjust cash payment amount only when other payments change
  React.useEffect(() => {
    const cashPayment = paymentMethods.find(p => p.method === 'CASH');
    
    if (cashPayment && paymentMethods.length > 1) {
      const otherPaymentsTotal = paymentMethods
        .filter(p => p.method !== 'CASH')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const remainingForCash = Math.max(0, totals.total - otherPaymentsTotal);
      const roundedRemaining = Math.round(remainingForCash * 100) / 100; // Fix floating point
      
      // Only update if there's a significant difference (avoid infinite loops)
      if (Math.abs((cashPayment.amount || 0) - roundedRemaining) > 0.01) {
        setPaymentMethods(prev => prev.map(p => 
          p.method === 'CASH' 
            ? { 
                ...p, 
                amount: roundedRemaining,
                // If cash amount becomes 0, clear cash given and change
                cashGiven: roundedRemaining === 0 ? undefined : p.cashGiven,
                cashChange: roundedRemaining === 0 ? 0 : (p.cashGiven ? Math.max(0, Math.round((p.cashGiven - roundedRemaining) * 100) / 100) : 0)
              }
            : p
        ));
      }
    }
  }, [paymentMethods.filter(p => p.method !== 'CASH').map(p => p.amount), totals.total]); // Only watch non-cash amounts

  // Get total amount paid across all payment methods (with proper rounding)
  const getTotalPaidAmount = () => {
    const total = paymentMethods.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    return Math.round(total * 100) / 100; // Fix floating point precision
  };

  // Validate payment methods
  const validatePayments = () => {
    const totalPaid = getTotalPaidAmount();
    const tolerance = 0.01;

    if (Math.abs(totalPaid - totals.total) > tolerance) {
      return {
        valid: false,
        message: `Payment total (${formatPrice(totalPaid)}) must equal order total (${formatPrice(totals.total)})`
      };
    }

    for (const payment of paymentMethods) {
      // Skip validation for cash payments that are 0 (covered by other payments)
      if (payment.method === 'CASH' && payment.amount === 0) {
        continue; // This is valid - cash is covered by other payments
      }
      
      // For all other payments, amount must be greater than 0
      if (!payment.amount || payment.amount <= 0) {
        return {
          valid: false,
          message: `Invalid amount for ${payment.method} payment`
        };
      }

      // Cash payment validations
      if (payment.method === 'CASH' && payment.amount > 0) {
        if (!payment.cashGiven || payment.cashGiven < payment.amount) {
          return {
            valid: false,
            message: `⚠️ Cash given must be at least ${formatPrice(payment.amount)}`
          };
        }
      }

      // Check payment validations
      if (payment.method === 'CHECK' && payment.amount > 0) {
        if (!payment.checkNumber || payment.checkNumber.trim() === '') {
          return {
            valid: false,
            message: "🔢 Check number is required"
          };
        }

        if (!payment.checkDate) {
          return {
            valid: false,
            message: "Check date is required for check payments"
          };
        }

        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (payment.checkDate < today) {
          return {
            valid: false,
            message: "Check date cannot be in the past"
          };
        }
      }
    }

    return { valid: true };
  };

  // Process order
  const processOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart",
        variant: "destructive",
      });
      return;
    }

    // Validate discount
    if (!validateDiscountAmount(orderDiscount, orderDiscountType, totals.subtotalIncludingTva)) {
      toast({
        title: "Invalid Discount",
        description: orderDiscountType === "PERCENTAGE" 
          ? "Percentage must be between 0 and 100" 
          : `Amount must be between 0 and ${formatPrice(totals.subtotalIncludingTva)}`,
        variant: "destructive",
      });
      return;
    }

    // Validate payments
    const validation = validatePayments();
    if (!validation.valid) {
      // Error will be shown in OrderActions component
      return;
    }

    setIsProcessing(true);
    try {
      // Send the exact discount amounts that were calculated in frontend
      const orderData = {
        customerId: customer?.id,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        paymentMethods: paymentMethods.map(payment => ({
          method: payment.method,
          amount: payment.amount,
          cashGiven: payment.cashGiven,
          cashChange: payment.cashChange,
          checkNumber: payment.checkNumber,
          checkBankName: payment.checkBankName,
          checkDate: payment.checkDate,
          notes: payment.notes,
        })),
        // Send discount code info if applied
        discountCodeId: appliedDiscountCode?.id,
        discountCodeValue: appliedDiscountCode?.code,
        // Send manual order discount info
        orderDiscount: orderDiscount, // Send the actual input value
        orderDiscountType: orderDiscountType, // Send the actual type
        // Also send pre-calculated totals for validation
        expectedSubtotal: totals.subtotalIncludingTva,
        expectedDiscountCodeAmount: totals.discountCodeAmount,
        expectedManualDiscountAmount: totals.discountAmount,
        expectedTotal: totals.total,
        notes,
        // Set status based on payment methods
        orderStatus: "DELIVERED", // IN_STORE orders are delivered immediately
        paymentStatus: paymentMethods.some(p => p.method === 'CHECK') ? "PENDING" : "COMPLETED"
      };

      const response = await fetch("/api/pos/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        // Determine success message based on payment methods
        const hasCheck = paymentMethods.some(p => p.method === 'CHECK');
        const successMessage = hasCheck 
          ? `Order ${data.order.orderNumber} completed! Check payment(s) pending verification.`
          : `Order ${data.order.orderNumber} completed successfully!`;
          
        toast({
          title: "Order Completed",
          description: successMessage,
        });
        
        // Clear the cart and reset form
        clearCart();
        setSearchQuery("");
        setSearchResults([]);
        
        // Reset payment methods to default
        setPaymentMethods([{
          id: 'cash-1',
          method: 'CASH',
          amount: 0,
          cashGiven: undefined,
          cashChange: 0
        }]);
      } else {
        throw new Error(data.error || "Failed to create order");
      }
    } catch (error) {
      console.error("Error processing order:", error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Failed to process order",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPaid = getTotalPaidAmount();
  const remainingAmount = totals.total - totalPaid;
  const paymentValidation = validatePayments();

  // Get payment method counts for display
  const cashPayments = paymentMethods.filter(p => p.method === 'CASH');
  const cardPayments = paymentMethods.filter(p => p.method === 'CREDIT_CARD');
  const checkPayments = paymentMethods.filter(p => p.method === 'CHECK');

  return (
    <div className="w-[450px] bg-slate-50 rounded-lg border border-slate-200 p-6 max-h-screen overflow-y-auto">
      <h3 className="text-xl font-bold mb-6 text-slate-900 flex items-center">
        <DollarSign className="h-6 w-6 mr-2 text-green-600" />
        Multi-Payment Checkout
      </h3>

      {/* Customer Selection Component */}
      <CustomerSelection
        customer={customer}
        setCustomer={setCustomer}
        customers={customers}
        setCustomers={setCustomers}
        onSearchCustomers={searchCustomers}
      />

      {/* Payment Summary and Add Buttons */}
      <PaymentSummary
        orderTotal={totals.total}
        totalPaid={totalPaid}
        remainingAmount={remainingAmount}
        paymentMethods={paymentMethods}
        cashPayments={cashPayments}
        cardPayments={cardPayments}
        checkPayments={checkPayments}
        onAddPaymentMethod={addPaymentMethod}
      />

      {/* Payment Methods List */}
      <div className="space-y-3 mb-6">
        {paymentMethods.map((payment, index) => (
          <PaymentMethodCard
            key={payment.id}
            payment={payment}
            index={index}
            totalPayments={paymentMethods.length}
            checkPayments={checkPayments}
            cart={cart}
            onUpdate={updatePaymentMethod}
            onRemove={removePaymentMethod}
          />
        ))}
      </div>

      {/* Discount Code Input */}
      <DiscountCodeInput
        cart={cart}
        customer={customer}
        subtotal={totals.subtotalIncludingTva}
        appliedDiscountCode={appliedDiscountCode}
        onDiscountApplied={onDiscountCodeApplied}
        onDiscountRemoved={onDiscountCodeRemoved}
      />

      {/* Order Discount */}
      <div className="mb-6">
        <Label className="text-slate-700 font-semibold text-sm">Order Discount</Label>
        <div className="flex gap-2 mt-2">
          <Input
            type="number"
            value={orderDiscount}
            onChange={(e) => handleDiscountChange(e.target.value)}
            placeholder="0"
            min="0"
            max={orderDiscountType === "PERCENTAGE" ? 100 : (totals.subtotalIncludingTva - (totals.discountCodeAmount || 0))}
            className="bg-white border-slate-300 text-gray-300 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
            disabled={totals.subtotalIncludingTva - (totals.discountCodeAmount || 0) <= 0}
          />
          <Select 
            value={orderDiscountType} 
            onValueChange={(value: "PERCENTAGE" | "FIXED") => {
              setOrderDiscountType(value);
              setOrderDiscount(0); // Reset discount when type changes
            }}
          >
            <SelectTrigger className="w-24 bg-white border-slate-300 text-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="PERCENTAGE" className="text-gray-300">%</SelectItem>
              <SelectItem value="FIXED" className="text-gray-300">{currencySymbol}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {orderDiscountType === "PERCENTAGE" && (
          <p className="text-xs text-slate-500 mt-1">Max: 100%</p>
        )}
        {orderDiscountType === "FIXED" && (
          <p className="text-xs text-slate-500 mt-1">
            Max: {formatPrice(totals.subtotalIncludingTva - (totals.discountCodeAmount || 0))}
            {appliedDiscountCode && " (after discount code)"}
          </p>
        )}
        {appliedDiscountCode && (
          <p className="text-xs text-blue-600 mt-1">
            Additional manual discount on top of {appliedDiscountCode.code}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <Label htmlFor="notes" className="text-slate-700 font-semibold text-sm">
          Order Notes (Optional)
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Order notes..."
          className="mt-2 bg-white border-slate-300 text-gray-300 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500 min-h-[60px] resize-none"
          rows={3}
        />
      </div>

      {/* Order Summary */}
      <div className="border-t border-slate-300 pt-4 mb-6 bg-white rounded-lg p-4">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-slate-700">
            <span>Subtotal (incl. TVA):</span>
            <span>{formatPrice(totals.subtotalIncludingTva)}</span>
          </div>
          
          {/* Enhanced Discount Code Display */}
          {appliedDiscountCode && totals.discountCodeAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {appliedDiscountCode.code}
                  </span>
                  <span className="text-green-700 font-medium text-xs">
                    {appliedDiscountCode.percentage}% OFF
                  </span>
                </div>
                <span className="text-green-600 font-semibold">
                  -{formatPrice(totals.discountCodeAmount)}
                </span>
              </div>
              <div className="text-xs text-green-600">
                💰 You saved {formatPrice(totals.discountCodeAmount)} with code {appliedDiscountCode.code}!
              </div>
            </div>
          )}
          
          {/* Enhanced Manual Discount Display */}
          {totals.discountAmount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-orange-700 font-medium text-xs">
                    Manual Discount ({orderDiscountType === 'PERCENTAGE' ? `${orderDiscount}%` : formatPrice(orderDiscount)})
                  </span>
                </div>
                <span className="text-orange-600 font-semibold">
                  -{formatPrice(totals.discountAmount)}
                </span>
              </div>
              <div className="text-xs text-orange-600">
                💸 Additional savings: {formatPrice(totals.discountAmount)}
              </div>
            </div>
          )}
          
          {/* Total Savings Summary */}
          {(totals.discountCodeAmount > 0 || totals.discountAmount > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex justify-between items-center">
                <span className="text-blue-700 font-medium text-sm">💎 Total Savings:</span>
                <span className="text-blue-600 font-bold text-sm">
                  {formatPrice(totals.discountCodeAmount + totals.discountAmount)}
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Final price: {formatPrice(totals.total)} (was {formatPrice(totals.subtotalIncludingTva)})
              </div>
            </div>
          )}
          
          <div className="flex justify-between text-slate-700">
            <span>Subtotal (excl. TVA):</span>
            <span>{formatPrice(totals.discountedSubtotalExcludingTva)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>TVA:</span>
            <span>{formatPrice(totals.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2 text-slate-900">
            <span>Total:</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Order Actions Component */}
      <OrderActions
        cart={cart}
        isProcessing={isProcessing}
        remainingAmount={remainingAmount}
        onProcessOrder={processOrder}
        paymentValidation={paymentValidation}
      />
    </div>
  );
}
