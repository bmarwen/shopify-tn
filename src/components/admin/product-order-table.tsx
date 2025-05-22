// src/components/admin/product-order-table.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderStatusBadge from "@/components/admin/order-status-badge";
import { Loader2, ExternalLink } from "lucide-react";

interface OrderItem {
  id: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface ProductOrderTableProps {
  productId: string;
  limit?: number;
  showViewAllLink?: boolean;
}

export default function ProductOrderTable({
  productId,
  limit = 5,
  showViewAllLink = true,
}: ProductOrderTableProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/products/${productId}/orders`);

        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error("Error fetching product orders:", err);
        setError("Could not load order history");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No orders found for this product
      </div>
    );
  }

  // Limit the number of orders to display
  const displayOrders = limit ? orders.slice(0, limit) : orders;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-lg text-gray-800">Order History</CardTitle>
          <CardDescription>
            Recent orders containing this product
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOrders.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/orders/${item.order.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {item.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(item.order.createdAt)}</TableCell>
                  <TableCell>
                    {item.order.user.name || item.order.user.email || "Guest"}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={item.order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/orders/${item.order.id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {showViewAllLink && orders.length > limit && (
          <CardFooter className="bg-gray-50 border-t p-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/orders?product=${productId}`)}
              className="ml-auto"
            >
              View All Orders ({orders.length})
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
