// src/components/admin/subscription-info.tsx
"use client";

import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  canViewSubscription,
  formatPlanName,
  formatSubscriptionPeriod,
} from "@/lib/permissions";
import {
  CalendarClock,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface SubscriptionData {
  id: string;
  planType: string;
  period: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  appliedDiscount: number;
  paidAmount: number;
  remainingAmount: number;
  daysRemaining: number;
  isActive: boolean;
}

interface SubscriptionInfoProps {
  subscription: SubscriptionData | null;
  loading?: boolean;
}

export function SubscriptionInfo({
  subscription,
  loading = false,
}: SubscriptionInfoProps) {
  const { data: session } = useSession();

  // Check if user can view subscription
  if (!canViewSubscription(session?.user)) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-l-4 border-l-blue-500 mb-6">
        <CardContent className="pt-6">
          <div className="h-20 flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Loading subscription information...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="border-l-4 border-l-yellow-500 mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            Your shop doesn't have an active subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Contact platform admin to set up your subscription and unlock all
            features.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            Contact Support
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Get border color based on status
  const getBorderColor = () => {
    switch (subscription.status) {
      case "ACTIVE":
        return "border-l-green-500";
      case "PENDING":
        return "border-l-yellow-500";
      case "EXPIRED":
      case "CANCELED":
        return "border-l-red-500";
      case "TRIAL":
        return "border-l-blue-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <Card className={`border-l-4 ${getBorderColor()} mb-6`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {subscription.isActive ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {formatPlanName(subscription.planType)}
            </CardTitle>
            <CardDescription>
              {formatSubscriptionPeriod(subscription.period)} subscription
              {!subscription.isActive &&
                ` (${subscription.status.toLowerCase()})`}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">
              {formatCurrency(subscription.totalAmount)}
            </p>
            {subscription.appliedDiscount > 0 && (
              <p className="text-xs text-green-600">
                {subscription.appliedDiscount}% discount applied
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                Valid from{" "}
                {new Date(subscription.startDate).toLocaleDateString()} to{" "}
                {new Date(subscription.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {subscription.daysRemaining} days remaining
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                Paid: {formatCurrency(subscription.paidAmount)}
              </span>
            </div>
            {subscription.remainingAmount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-red-600">
                  Remaining: {formatCurrency(subscription.remainingAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      {subscription.remainingAmount > 0 && (
        <CardFooter className="pt-0">
          <Button size="sm">Make Payment</Button>
        </CardFooter>
      )}
    </Card>
  );
}
