import { useState } from "react";
import { CreditCard, Banknote, Receipt, X, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Customer, CartItem, CheckPayment } from "../pos-system";
import { useCurrency } from "@/hooks/use-currency.hook";

interface CheckoutPanelProps {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  paymentMethod: "CASH" | "CREDIT_CARD" | "CHECK";
  setPaymentMethod: (method: "CASH" | "CREDIT_CARD" | "CHECK") => void;
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
    discountedSubtotalExcludingTva: number;
    tax: number;
    total: number;
  };
  cart: CartItem[];
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  validateDiscountAmount: (amount: number, type: "PERCENTAGE" | "FIXED", subtotalIncludingTva: number) => boolean;
  calculateDiscountPercentageForDB: (amount: number, type: "PERCENTAGE" | "FIXED", subtotalIncludingTva: number) => number;
  clearCart: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: any[]) => void;
  cashAmountGiven: number;
  setCashAmountGiven: (amount: number) => void;
  checkPayments: CheckPayment[];
  setCheckPayments: (payments: CheckPayment[]) => void;
}

export default function CheckoutPanel({
  customer,
  setCustomer,
  customers,
  setCustomers,
  paymentMethod,
  setPaymentMethod,
  orderDiscount,
  setOrderDiscount,
  orderDiscountType,
  setOrderDiscountType,
  notes,
  setNotes,
  totals,
  cart,
  isProcessing,
  setIsProcessing,
  validateDiscountAmount,
  calculateDiscountPercentageForDB,
  clearCart,
  setSearchQuery,
  setSearchResults,
  cashAmountGiven,
  setCashAmountGiven,
  checkPayments,
  setCheckPayments,
}: CheckoutPanelProps) {
  const { toast } = useToast();
  const { formatPrice, currencySymbol } = useCurrency();
  
  // Local state for check payment form
  const [newCheckPayment, setNewCheckPayment] = useState<Partial<CheckPayment>>({
    checkNumber: '',
    bankName: '',
    amount: 0,
    checkDate: new Date(),
    notes: ''
  });

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

  // Handle discount input change with validation
  const handleDiscountChange = (value: string) => {
    const numValue = Number(value);
    
    if (orderDiscountType === "PERCENTAGE") {
      setOrderDiscount(Math.min(Math.max(0, numValue), 100));
    } else {
      setOrderDiscount(Math.min(Math.max(0, numValue), totals.subtotalIncludingTva));
    }
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

      // Validate cash payment
      if (paymentMethod === "CASH" && cashAmountGiven < totals.total) {
        toast({
          title: "Insufficient Cash",
          description: `Customer must provide at least ${formatPrice(totals.total)}`,
          variant: "destructive",
        });
        return;
      }

      // Validate check payments
      if (paymentMethod === "CHECK") {
        const totalCheckAmount = checkPayments.reduce((sum, check) => sum + check.amount, 0);
        if (totalCheckAmount < totals.total) {
          toast({
            title: "Insufficient Check Amount",
            description: `Total check amount (${formatPrice(totalCheckAmount)}) must cover the order total (${formatPrice(totals.total)})`,
            variant: "destructive",
          });
          return;
        }
        if (checkPayments.length === 0) {
          toast({
            title: "No Checks Added",
            description: "Please add at least one check payment",
            variant: "destructive",
          });
          return;
        }
      }

    setIsProcessing(true);
    try {
      // Calculate the percentage to save in DB
      const discountPercentageForDB = calculateDiscountPercentageForDB(
        orderDiscount, 
        orderDiscountType, 
        totals.subtotalIncludingTva
      );

      const orderData = {
        customerId: customer?.id,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        paymentMethodType: paymentMethod,
        orderDiscount: discountPercentageForDB, // Always save as percentage in DB
        orderDiscountType: "PERCENTAGE", // Always save as percentage in DB
        notes,
        // Cash payment data
        cashAmountGiven: paymentMethod === "CASH" ? cashAmountGiven : undefined,
        cashAmountChange: paymentMethod === "CASH" ? (cashAmountGiven - totals.total) : undefined,
        // Check payment data
        checkPayments: paymentMethod === "CHECK" ? checkPayments : undefined,
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
        toast({
          title: "Order Created",
          description: `Order ${data.order.orderNumber} created successfully`,
        });
        
        // Clear the cart and reset form
        clearCart();
        setSearchQuery("");
        setSearchResults([]);
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

  return (
    <div className="w-96 bg-slate-50 rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold mb-6 text-slate-900">Checkout</h3>

      {/* Customer Selection */}
      <div className="mb-6">
        <Label htmlFor="customer" className="text-slate-700 font-semibold text-sm">
          Customer (Optional)
        </Label>
        <div className="mt-2">
          <Input
            placeholder="Search customers by name, email, or phone... (min 3 characters)"
            onChange={(e) => searchCustomers(e.target.value)}
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

      {/* Cash Payment Details */}
      {paymentMethod === "CASH" && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Label className="text-slate-700 font-semibold text-sm flex items-center mb-3">
            <DollarSign className="h-4 w-4 mr-2" />
            Cash Payment Details
          </Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cashGiven" className="text-sm text-slate-600">Amount Given by Customer</Label>
              <Input
                id="cashGiven"
                type="number"
                step="0.01"
                min={totals.total}
                value={cashAmountGiven || ''}
                onChange={(e) => setCashAmountGiven(Number(e.target.value))}
                placeholder={`Min: ${formatPrice(totals.total)}`}
                className="mt-1 bg-white border-slate-300 text-gray-700"
              />
            </div>
            {cashAmountGiven >= totals.total && (
              <div className="p-3 bg-white border border-green-300 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount Given:</span>
                  <span className="font-medium text-slate-900">{formatPrice(cashAmountGiven)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Order Total:</span>
                  <span className="font-medium text-slate-900">{formatPrice(totals.total)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-green-200 pt-2 mt-2">
                  <span className="text-green-700">Change to Return:</span>
                  <span className="text-green-700">{formatPrice(cashAmountGiven - totals.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check Payment Details */}
      {paymentMethod === "CHECK" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="text-slate-700 font-semibold text-sm flex items-center mb-3">
            <Receipt className="h-4 w-4 mr-2" />
            Check Payment Details
          </Label>
          
          {/* Add New Check Form */}
          <div className="space-y-3 p-3 bg-white border border-blue-200 rounded mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-600">Check Number *</Label>
                <Input
                  type="text"
                  value={newCheckPayment.checkNumber || ''}
                  onChange={(e) => setNewCheckPayment(prev => ({ ...prev, checkNumber: e.target.value }))}
                  placeholder="123456"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newCheckPayment.amount || ''}
                  onChange={(e) => setNewCheckPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Bank Name</Label>
              <Input
                type="text"
                value={newCheckPayment.bankName || ''}
                onChange={(e) => setNewCheckPayment(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="Bank name (optional)"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Check Date *</Label>
              <Input
                type="date"
                value={newCheckPayment.checkDate ? newCheckPayment.checkDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setNewCheckPayment(prev => ({ ...prev, checkDate: new Date(e.target.value) }))}
                className="mt-1 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!newCheckPayment.checkNumber || !newCheckPayment.amount || !newCheckPayment.checkDate) {
                  toast({
                    title: "Missing Information",
                    description: "Please fill in check number, amount, and date",
                    variant: "destructive",
                  });
                  return;
                }
                
                const check: CheckPayment = {
                  checkNumber: newCheckPayment.checkNumber,
                  bankName: newCheckPayment.bankName,
                  amount: newCheckPayment.amount,
                  checkDate: newCheckPayment.checkDate,
                  notes: newCheckPayment.notes,
                };
                
                setCheckPayments([...checkPayments, check]);
                setNewCheckPayment({
                  checkNumber: '',
                  bankName: '',
                  amount: 0,
                  checkDate: new Date(),
                  notes: ''
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Add Check
            </Button>
          </div>
          
          {/* Current Checks List */}
          {checkPayments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Added Checks:</Label>
              {checkPayments.map((check, index) => (
                <div key={index} className="p-2 bg-white border border-blue-200 rounded flex justify-between items-center">
                  <div className="text-xs">
                    <div className="font-medium">Check #{check.checkNumber}</div>
                    <div className="text-slate-600">
                      {formatPrice(check.amount)} - {check.checkDate.toLocaleDateString()}
                      {check.bankName && ` - ${check.bankName}`}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCheckPayments(checkPayments.filter((_, i) => i !== index));
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {/* Check Summary */}
              <div className="p-3 bg-white border border-blue-300 rounded mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Check Amount:</span>
                  <span className="font-medium text-slate-900">
                    {formatPrice(checkPayments.reduce((sum, check) => sum + check.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Order Total:</span>
                  <span className="font-medium text-slate-900">{formatPrice(totals.total)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-blue-200 pt-2 mt-2">
                  <span className={`font-medium ${
                    checkPayments.reduce((sum, check) => sum + check.amount, 0) >= totals.total
                      ? 'text-green-700' : 'text-red-600'
                  }`}>
                    {checkPayments.reduce((sum, check) => sum + check.amount, 0) >= totals.total
                      ? '✓ Sufficient' : '⚠ Insufficient'
                    }
                  </span>
                  <span className={`font-medium ${
                    checkPayments.reduce((sum, check) => sum + check.amount, 0) >= totals.total
                      ? 'text-green-700' : 'text-red-600'
                  }`}>
                    {checkPayments.reduce((sum, check) => sum + check.amount, 0) >= totals.total
                      ? formatPrice(checkPayments.reduce((sum, check) => sum + check.amount, 0) - totals.total)
                      : formatPrice(totals.total - checkPayments.reduce((sum, check) => sum + check.amount, 0))
                    } 
                    {checkPayments.reduce((sum, check) => sum + check.amount, 0) >= totals.total
                      ? ' over' : ' short'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
            max={orderDiscountType === "PERCENTAGE" ? 100 : totals.subtotalIncludingTva}
            className="bg-white border-slate-300 text-gray-300 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
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
          <p className="text-xs text-slate-500 mt-1">Max: {formatPrice(totals.subtotalIncludingTva)}</p>
        )}
      </div>

      {/* Payment Method */}
      <div className="mb-6">
        <Label className="text-slate-700 font-semibold text-sm">Payment Method</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant={paymentMethod === "CASH" ? "default" : "outline"}
            onClick={() => setPaymentMethod("CASH")}
            className={paymentMethod === "CASH" 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }
          >
            <Banknote className="h-4 w-4 mr-2" />
            Cash
          </Button>
          <Button
            variant={paymentMethod === "CREDIT_CARD" ? "default" : "outline"}
            onClick={() => setPaymentMethod("CREDIT_CARD")}
            className={paymentMethod === "CREDIT_CARD"
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Card
          </Button>
          <Button
              variant={paymentMethod === "CHECK" ? "default" : "outline"}
              onClick={() => setPaymentMethod("CHECK")}
              className={paymentMethod === "CHECK"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }
          >
            <Receipt className="h-4 w-4 mr-2" />
            Check
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <Label htmlFor="notes" className="text-slate-700 font-semibold text-sm">
          Notes (Optional)
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
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-700">
            <span>Subtotal (incl. TVA):</span>
            <span>{formatPrice(totals.subtotalIncludingTva)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-{formatPrice(totals.discountAmount)}</span>
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

      {/* Process Order Button */}
      <Button
        onClick={processOrder}
        disabled={cart.length === 0 || isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        size="lg"
      >
        <Receipt className="h-4 w-4 mr-2" />
        {isProcessing ? "Processing..." : "Process Order"}
      </Button>

      {cart.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <AlertCircle className="h-4 w-4" />
          Add items to cart to process order
        </div>
      )}
    </div>
  );
}
