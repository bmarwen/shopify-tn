// src/components/admin/order-status-update-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// Order status options
const orderStatuses = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

// Payment status options
const paymentStatuses = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
];

// Shipping status options
const shippingStatuses = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
];

// Form schema
const formSchema = z.object({
  status: z.string().min(1, "Order status is required"),
  paymentStatus: z.string().min(1, "Payment status is required"),
  shippingStatus: z.string().min(1, "Shipping status is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OrderStatusUpdateFormProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  currentShippingStatus: string;
}

export default function OrderStatusUpdateForm({
  orderId,
  currentStatus,
  currentPaymentStatus,
  currentShippingStatus,
}: OrderStatusUpdateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: currentStatus,
      paymentStatus: currentPaymentStatus,
      shippingStatus: currentShippingStatus || "PENDING",
      notes: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update order status");
      }

      // Success message
      toast({
        title: "Order Updated",
        description: "The order status has been updated successfully.",
      });

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Order Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full border-gray-300 text-gray-800">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Payment Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full border-gray-300 text-gray-800">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shippingStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Shipping Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full border-gray-300 text-gray-800">
                      <SelectValue placeholder="Select shipping status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {shippingStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a note about this status change (visible to admin only)"
                  className="resize-none h-20 border-gray-300 text-gray-800"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Update Order Status"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
