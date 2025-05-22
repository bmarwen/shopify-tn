// src/components/admin/order-status-badge.tsx
"use client";

import { Badge } from "@/components/ui/badge";

type StatusType = "order" | "payment" | "shipping";

interface OrderStatusBadgeProps {
  status: string;
  type?: StatusType;
}

export default function OrderStatusBadge({
  status,
  type = "order",
}: OrderStatusBadgeProps) {
  // Different statuses based on type
  if (type === "order") {
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
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Delivered
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Cancelled
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            {status}
          </Badge>
        );
    }
  }

  // Payment statuses
  if (type === "payment") {
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
      case "PAID":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Paid
          </Badge>
        );
      case "FAILED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Failed
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Refunded
          </Badge>
        );
      case "PARTIALLY_REFUNDED":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            Partial Refund
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            {status}
          </Badge>
        );
    }
  }

  // Shipping statuses
  if (type === "shipping") {
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
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Delivered
          </Badge>
        );
      case "RETURNED":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Returned
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            {status}
          </Badge>
        );
    }
  }

  // Fallback
  return (
    <Badge
      variant="outline"
      className="bg-gray-50 text-gray-700 border-gray-200"
    >
      {status}
    </Badge>
  );
}
