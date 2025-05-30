import { ShoppingCart, X, Plus, Minus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/utils";
import { CartItem } from "../pos-system";
import { useCurrency } from "@/hooks/use-currency.hook";

interface ShoppingCartProps {
  cart: CartItem[];
  updateCartItemQuantity: (cartItemId: string, newQuantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
}

export default function ShoppingCartComponent({
  cart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
}: ShoppingCartProps) {
  const { formatPrice } = useCurrency();
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
        </h3>
        {cart.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearCart}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="font-medium">No items in cart</p>
          <p className="text-sm">Search and add products to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                {item.images[0] && (
                  <img
                    src={getImageUrl(item.images[0])}
                    alt={item.name}
                    className="w-10 h-10 object-cover object-center rounded border border-slate-200"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder.svg';
                    }}
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-slate-900">{item.name}</h4>
                  
                  {/* Show discount info if item has discount */}
                  {item.price !== item.finalPrice ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="line-through text-gray-400">
                        {formatPrice(item.price)}
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatPrice(item.finalPrice)}
                      </span>
                      <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">
                        {Math.round(((item.price - item.finalPrice) / item.price) * 100)}% OFF
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">
                      {formatPrice(item.finalPrice)}
                    </p>
                  )}
                  
                  {item.variant && (
                    <p className="text-xs text-blue-600">
                      {Object.entries(item.variant.options).map(([key, value]) => `${key}: ${value}`).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold text-slate-900">
                  {item.quantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <div className="w-20 text-right font-bold text-slate-900">
                  {formatPrice(item.total)}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFromCart(item.id)}
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
