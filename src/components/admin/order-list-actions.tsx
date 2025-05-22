// src/components/admin/order-list-actions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Edit,
  ExternalLink,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { FeatureGuard } from "@/components/authorization/feature-guard";
import { Feature } from "@/lib/feature-authorization";

interface OrderListActionsProps {
  orderId: string;
  hasInvoice?: boolean;
}

export default function OrderListActions({
  orderId,
  hasInvoice = false,
}: OrderListActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true);

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE", // This is actually cancellation, not deletion
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to cancel order");
      }

      // Show success toast
      toast({
        title: "Order cancelled",
        description: "The order has been successfully cancelled",
      });

      // Close the dialog
      setShowCancelDialog(false);

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error("Error cancelling order:", error);

      // Show error toast
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link
              href={`/admin/orders/${orderId}`}
              className="flex items-center"
            >
              <Edit className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>

          <FeatureGuard feature={Feature.INVOICE_GENERATION}>
            <DropdownMenuItem asChild>
              <Link
                href={
                  hasInvoice
                    ? `/api/orders/${orderId}/invoice`
                    : `/api/orders/${orderId}/invoice/generate`
                }
                className="flex items-center"
              >
                <FileText className="mr-2 h-4 w-4" />
                {hasInvoice ? "View Invoice" : "Generate Invoice"}
              </Link>
            </DropdownMenuItem>
          </FeatureGuard>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-amber-600 focus:text-amber-600 cursor-pointer"
            onClick={() => setShowCancelDialog(true)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Cancel Order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the order and restore any inventory. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              No, Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
