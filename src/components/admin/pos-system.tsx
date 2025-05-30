"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import ProductSearch from "./pos/product-search";
import ShoppingCart from "./pos/shopping-cart";
import CheckoutPanel from "./pos/checkout-panel";
import MultiPaymentCheckout from "./pos/multi-payment-checkout";

// Types
export interface ProductVariant {
  id: string;
  name: string;
  price: number;        // Required
  finalPrice?: number;   // Price after discount
  cost?: number;
  tva: number;
  inventory: number;
  sku?: string;
  barcode?: string;
  images: string[];
  options: Record<string, string>; // Required
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: Record<string, number>;
  images: string[];
  variants: ProductVariant[];
  categories?: any[];
  discounts?: any[];
  hasDiscount?: boolean;
  discountPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;    // Required - always reference a variant
  name: string;
  sku?: string;
  price: number;
  finalPrice: number;
  quantity: number;
  total: number;
  priceExcludingTva: number;
  tvaAmount: number;
  tva: number;
  inventory: number;
  images: string[];
  variant: ProductVariant;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface CashPayment {
  amountGiven: number;
  change: number;
}

export interface CheckPayment {
  checkNumber: string;
  bankName?: string;
  amount: number;
  checkDate: Date;
  notes?: string;
}

export default function POSSystem() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "CHECK">("CASH");
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderDiscountType, setOrderDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<AppliedDiscountCode | null>(null);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  
  // Cash payment state
  const [cashAmountGiven, setCashAmountGiven] = useState<number>(0);
  
  // Check payment state
  const [checkPayments, setCheckPayments] = useState<CheckPayment[]>([]);
  
  // Utility functions
  const calculatePriceExcludingTva = (priceIncludingTva: number, tvaPercentage: number) => {
    return priceIncludingTva / (1 + tvaPercentage / 100);
  };

  const getEffectiveProductData = (product: Product, variantId?: string) => {
    if (variantId && product.variants.length > 0) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        return {
          price: variant.price,
          finalPrice: variant.finalPrice || variant.price, // Use finalPrice if available
          hasDiscount: variant.hasDiscount || false,
          discountPercentage: variant.discountPercentage || 0,
          discountAmount: variant.discountAmount || 0,
          inventory: variant.inventory,
          sku: variant.sku || product.sku,
          barcode: variant.barcode || product.barcode,
          images: variant.images && variant.images.length > 0 ? variant.images : product.images,
          name: `${product.name} - ${variant.name}`,
          tva: variant.tva,
          variant
        };
      }
    }
    
    // If no variant specified or found, use first variant (since all products must have variants)
    if (product.variants.length > 0) {
      const firstVariant = product.variants[0];
      return {
        price: firstVariant.price,
        finalPrice: firstVariant.finalPrice || firstVariant.price,
        hasDiscount: firstVariant.hasDiscount || false,
        discountPercentage: firstVariant.discountPercentage || 0,
        discountAmount: firstVariant.discountAmount || 0,
        inventory: firstVariant.inventory,
        sku: firstVariant.sku || product.sku,
        barcode: firstVariant.barcode || product.barcode,
        images: firstVariant.images && firstVariant.images.length > 0 ? firstVariant.images : product.images,
        name: `${product.name} - ${firstVariant.name}`,
        tva: firstVariant.tva,
        variant: firstVariant
      };
    }
    
    // Fallback (shouldn't happen with new structure)
    return {
      price: 0,
      finalPrice: 0,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmount: 0,
      inventory: 0,
      sku: product.sku,
      barcode: product.barcode,
      images: product.images,
      name: product.name,
      tva: 19,
      variant: undefined
    };
  };

  const validateDiscountAmount = (amount: number, type: "PERCENTAGE" | "FIXED", subtotalIncludingTva: number): boolean => {
    if (amount < 0) return false;
    
    if (type === "PERCENTAGE") {
      return amount <= 100;
    } else {
      return amount <= subtotalIncludingTva;
    }
  };

  const calculateDiscountPercentageForDB = (amount: number, type: "PERCENTAGE" | "FIXED", subtotalIncludingTva: number): number => {
    if (type === "PERCENTAGE") {
      return amount;
    } else {
      return subtotalIncludingTva > 0 ? (amount / subtotalIncludingTva) * 100 : 0;
    }
  };

  // Cart operations
  const addToCart = (product: Product, variantId?: string) => {
    const effectiveData = getEffectiveProductData(product, variantId);
    const cartItemId = variantId ? `${product.id}-${variantId}` : product.id;
    
    const existingItem = cart.find(item => item.id === cartItemId);
    
    if (existingItem) {
      if (existingItem.quantity >= effectiveData.inventory) {
        toast({
          title: "Insufficient Inventory",
          description: `Only ${effectiveData.inventory} items available`,
          variant: "destructive",
        });
        return;
      }
      updateCartItemQuantity(cartItemId, existingItem.quantity + 1);
    } else {
      if (effectiveData.inventory <= 0) {
        toast({
          title: "Out of Stock",
          description: "This product is out of stock",
          variant: "destructive",
        });
        return;
      }
      
      // Apply discounts - check variant-specific first, then product-level
      let finalPrice = effectiveData.price;
      let discountPercentage = 0;
      
      // First check for variant-specific discounts
      if (effectiveData.hasDiscount) {
        discountPercentage = effectiveData.discountPercentage;
        finalPrice = effectiveData.finalPrice;
      }
      // Then check for product-level discounts (if no variant discount)
      else if (product.hasDiscount && product.discountPercentage) {
        discountPercentage = product.discountPercentage;
        const discountAmount = (effectiveData.price * discountPercentage) / 100;
        finalPrice = effectiveData.price - discountAmount;
      }
      // Fallback to legacy product discounts structure
      else if (product.discounts && product.discounts.length > 0) {
        const now = new Date();
        const activeDiscount = product.discounts.find(discount => 
          discount.enabled && 
          new Date(discount.startDate) <= now && 
          new Date(discount.endDate) >= now &&
          discount.availableInStore
        );
        
        if (activeDiscount) {
          discountPercentage = activeDiscount.percentage;
          const discountAmount = (effectiveData.price * discountPercentage) / 100;
          finalPrice = effectiveData.price - discountAmount;
        }
      }
      
      const priceExcludingTva = calculatePriceExcludingTva(finalPrice, effectiveData.tva);
      const tvaAmount = finalPrice - priceExcludingTva;
      
      const cartItem: CartItem = {
        id: cartItemId,
        productId: product.id,
        variantId: variantId || (effectiveData.variant ? effectiveData.variant.id : ""),
        name: effectiveData.name,
        sku: effectiveData.sku,
        price: effectiveData.price, // Original price
        finalPrice: finalPrice, // Price after discount
        quantity: 1,
        total: finalPrice,
        priceExcludingTva,
        tvaAmount,
        tva: effectiveData.tva,
        inventory: effectiveData.inventory,
        images: effectiveData.images,
      };
      setCart(prev => [...prev, cartItem]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${effectiveData.name} added to cart`,
    });
  };

  const updateCartItemQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        if (newQuantity > item.inventory) {
          toast({
            title: "Insufficient Inventory",
            description: `Only ${item.inventory} items available`,
            variant: "destructive",
          });
          return item;
        }
        
        return {
          ...item,
          quantity: newQuantity,
          total: item.finalPrice * newQuantity,
        };
      }
      return item;
    }));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setOrderDiscount(0);
    setAppliedDiscountCode(null);
    setNotes("");
    setSelectedVariants({});
    setCashAmountGiven(0);
    setCheckPayments([]);
  };

  // Calculate totals with discount code support
  const calculateTotals = () => {
    // Safety check for empty cart
    if (cart.length === 0) {
      return {
        subtotalIncludingTva: 0,
        subtotalExcludingTva: 0,
        discountAmount: 0,
        discountCodeAmount: 0,
        discountedSubtotalExcludingTva: 0,
        tax: 0,
        total: 0,
      };
    }

    const subtotalIncludingTva = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const subtotalExcludingTva = cart.reduce((sum, item) => sum + (item.priceExcludingTva * item.quantity), 0);
    const originalTax = cart.reduce((sum, item) => sum + (item.tvaAmount * item.quantity), 0);
    
    // Calculate discount code amount first
    let discountCodeAmount = 0;
    if (appliedDiscountCode) {
      discountCodeAmount = appliedDiscountCode.discountAmount;
    }
    
    // Calculate manual order discount (applied after discount code)
    let manualDiscountAmount = 0;
    const subtotalAfterCodeDiscount = subtotalIncludingTva - discountCodeAmount;
    if (orderDiscount > 0 && subtotalAfterCodeDiscount > 0) {
      if (orderDiscountType === "PERCENTAGE") {
        manualDiscountAmount = (subtotalAfterCodeDiscount * orderDiscount) / 100;
      } else {
        manualDiscountAmount = Math.min(orderDiscount, subtotalAfterCodeDiscount);
      }
    }
    
    const totalDiscountAmount = discountCodeAmount + manualDiscountAmount;
    
    // Calculate discounted totals
    const discountedTotalIncludingTva = subtotalIncludingTva - totalDiscountAmount;
    
    // Calculate proportional discount for excl. TVA amount
    const discountRatio = subtotalIncludingTva > 0 ? totalDiscountAmount / subtotalIncludingTva : 0;
    const discountedSubtotalExcludingTva = subtotalExcludingTva * (1 - discountRatio);
    const discountedTax = originalTax * (1 - discountRatio);

    return {
      subtotalIncludingTva: Number(subtotalIncludingTva.toFixed(2)),
      subtotalExcludingTva: Number(subtotalExcludingTva.toFixed(2)),
      discountAmount: Number(manualDiscountAmount.toFixed(2)),
      discountCodeAmount: Number(discountCodeAmount.toFixed(2)),
      discountedSubtotalExcludingTva: Number(discountedSubtotalExcludingTva.toFixed(2)),
      tax: Number(discountedTax.toFixed(2)),
      total: Number(discountedTotalIncludingTva.toFixed(2)),
    };
  };

  const totals = calculateTotals();

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Product Search & Cart (2/3 width) */}
      <div className="flex-1 flex flex-col min-w-0">
        <ProductSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
          selectedVariants={selectedVariants}
          setSelectedVariants={setSelectedVariants}
          addToCart={addToCart}
        />
        
        <ShoppingCart
          cart={cart}
          updateCartItemQuantity={updateCartItemQuantity}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
        />
      </div>

      {/* Right Panel - Multi-Payment Checkout (1/3 width but wider) */}
      <div className="flex-shrink-0">
      <MultiPaymentCheckout
        customer={customer}
        setCustomer={setCustomer}
        customers={customers}
        setCustomers={setCustomers}
        orderDiscount={orderDiscount}
        setOrderDiscount={setOrderDiscount}
        orderDiscountType={orderDiscountType}
        setOrderDiscountType={setOrderDiscountType}
        notes={notes}
        setNotes={setNotes}
        totals={totals}
        cart={cart}
        customer={customer}
        appliedDiscountCode={appliedDiscountCode}
        onDiscountCodeApplied={setAppliedDiscountCode}
        onDiscountCodeRemoved={() => setAppliedDiscountCode(null)}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        validateDiscountAmount={validateDiscountAmount}
        calculateDiscountPercentageForDB={calculateDiscountPercentageForDB}
        clearCart={clearCart}
        setSearchQuery={setSearchQuery}
        setSearchResults={setSearchResults}
      />
      </div>
    </div>
  );
}
