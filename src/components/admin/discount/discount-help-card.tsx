// src/components/admin/discount/discount-help-card.tsx
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DiscountHelpCard() {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
        <CardTitle className="text-lg font-semibold text-white">
          About Discounts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 bg-white">
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Discounts apply to specific products</li>
          <li>• Set a percentage discount (1-100%)</li>
          <li>• Define a date range for your promotion</li>
          <li>• Add images and descriptions for marketing</li>
          <li>• Control online and in-store availability</li>
          <li>• Enable/disable discounts without deleting them</li>
        </ul>
      </CardContent>
    </Card>
  );
}
