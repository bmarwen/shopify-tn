// src/components/admin/product-tabs/order-history-tab.tsx
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingBag,
  AlertCircle,
  Clock,
  ChevronRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface OrderHistoryTabProps {
  productId: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productName: string;
  productSku: string | null;
  productBarcode: string | null;
  productDescription: string | null;
  productOptions: any | null;
  productImage: string | null;
  productTva: number;
  discountPercentage: number | null;
  discountAmount: number | null;
  discountCode: string | null;
  originalPrice: number | null;
  createdAt: string;
  order: {
    orderNumber: string;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export default function OrderHistoryTab({ productId }: OrderHistoryTabProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(
    null
  );

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products/${productId}/orders`);

        if (!response.ok) {
          throw new Error("Failed to fetch order history");
        }

        const data = await response.json();
        setOrderItems(data);
      } catch (error) {
        console.error("Error fetching order history:", error);
        setError("Failed to load order history");
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchOrderHistory();
    }
  }, [productId]);

  const renderOrderStatus = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Pending
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            Processing
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            Shipped
          </Badge>
        );
      case "DELIVERED":
        return <Badge variant="success">Delivered</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading order history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-red-500 mt-0.5 mr-2 h-5 w-5" />
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orderItems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <ShoppingBag className="h-8 w-8 text-gray-400 mb-2 mx-auto" />
            <h3 className="text-gray-700 font-medium mb-1">No Order History</h3>
            <p className="text-gray-500 text-sm">
              This product hasn't been purchased yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-800">Order History</CardTitle>
            <CardDescription>
              Displaying how this product appeared in orders
            </CardDescription>
          </div>
          <Badge variant="info" className="text-sm">
            {orderItems.length} Orders
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Order selection list */}
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
            {orderItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedOrderItem?.id === item.id
                    ? "bg-indigo-50 border-l-4 border-indigo-500"
                    : ""
                }`}
                onClick={() => setSelectedOrderItem(item)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <Link
                        href={`/admin/orders/${item.orderId}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {item.order.orderNumber}
                      </Link>
                      <span className="mx-2 text-gray-400">•</span>
                      {renderOrderStatus(item.order.status)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(item.order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-800">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total: {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {orderItems.length > 5 && (
              <div className="p-4 text-center">
                <Link
                  href={`/admin/products/${productId}/orders`}
                  className="text-indigo-600 hover:underline text-sm flex items-center justify-center"
                >
                  View all {orderItems.length} orders
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            )}
          </div>

          {/* Selected order item details */}
          {selectedOrderItem && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <h3 className="text-gray-800 font-medium mb-3">
                Order Item Details (as captured at order time)
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Product Information
                  </h4>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="flex items-start mb-3">
                      {selectedOrderItem.productImage ? (
                        <div className="w-16 h-16 rounded bg-gray-200 mr-3 overflow-hidden">
                          <Image
                            src={selectedOrderItem.productImage}
                            alt={selectedOrderItem.productName}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-gray-200 mr-3 flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-800">
                          {selectedOrderItem.productName}
                        </div>
                        {selectedOrderItem.productDescription && (
                          <div className="text-sm text-gray-600 mt-1">
                            {selectedOrderItem.productDescription}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedOrderItem.productSku && (
                        <div>
                          <span className="text-gray-500">SKU:</span>{" "}
                          {selectedOrderItem.productSku}
                        </div>
                      )}
                      {selectedOrderItem.productBarcode && (
                        <div>
                          <span className="text-gray-500">Barcode:</span>{" "}
                          {selectedOrderItem.productBarcode}
                        </div>
                      )}
                      {selectedOrderItem.productOptions &&
                        Object.keys(selectedOrderItem.productOptions).length >
                          0 && (
                          <div className="col-span-2 mt-2">
                            <span className="text-gray-500">Options:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(
                                selectedOrderItem.productOptions
                              ).map(([key, value]) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="bg-gray-50"
                                >
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Pricing Information
                  </h4>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="font-medium">
                          {formatCurrency(selectedOrderItem.unitPrice)}
                        </span>
                      </div>

                      {selectedOrderItem.originalPrice &&
                        selectedOrderItem.originalPrice >
                          selectedOrderItem.unitPrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Original Price:
                            </span>
                            <span className="line-through text-gray-500">
                              {formatCurrency(selectedOrderItem.originalPrice)}
                            </span>
                          </div>
                        )}

                      {selectedOrderItem.discountPercentage && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-green-600">
                            {selectedOrderItem.discountPercentage}%
                            {selectedOrderItem.discountCode &&
                              ` (${selectedOrderItem.discountCode})`}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span>{selectedOrderItem.quantity}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          TVA ({selectedOrderItem.productTva}%):
                        </span>
                        <span>
                          {formatCurrency(
                            (selectedOrderItem.total *
                              selectedOrderItem.productTva) /
                              100
                          )}
                        </span>
                      </div>

                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-800">Total:</span>
                          <span className="text-gray-800">
                            {formatCurrency(selectedOrderItem.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    <Info className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                    <span>
                      This information is preserved exactly as it was when the
                      order was placed, even if the product details were later
                      changed or the product was deleted.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
