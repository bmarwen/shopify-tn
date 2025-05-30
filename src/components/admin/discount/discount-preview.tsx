// src/components/admin/discount/discount-preview.tsx
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import SimpleS3Image from "@/components/ui/image-upload/simple-s3-image";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface DiscountPreviewProps {
  selectedProduct: Product | null;
  percentage: number;
  currency: string;
  discountImage?: string;
}

export default function DiscountPreview({
  selectedProduct,
  percentage,
  currency,
  discountImage,
}: DiscountPreviewProps) {
  if (!selectedProduct) return null;

  const getDiscountedPrice = (price: number, discountPercentage: number) => {
    if (!price || !discountPercentage) return price;
    const discount = (price * discountPercentage) / 100;
    return price - discount;
  };

  const discountedPrice = getDiscountedPrice(selectedProduct.price, percentage);
  const savings = selectedProduct.price - discountedPrice;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
        <CardTitle className="text-lg font-semibold text-white">
          Discount Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 bg-white">
        <div className="space-y-4">
          {/* Discount Image Preview */}
          {discountImage && (
            <div className="w-full">
              <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden relative max-w-sm mx-auto">
                <SimpleS3Image
                  src={discountImage}
                  alt="Discount preview"
                  fill
                  sizes="300px"
                  className="w-full h-full"
                />
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-800">
              Product
            </h3>
            <p className="text-lg font-medium text-gray-900">
              {selectedProduct.name}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-800">
              Original Price
            </h3>
            <p className="text-lg font-medium text-gray-900">
              {formatCurrency(selectedProduct.price, currency)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-800">
              Discount
            </h3>
            <p className="text-lg font-medium text-orange-600">
              {percentage}%
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-800">
              Discounted Price
            </h3>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(discountedPrice, currency)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-800">
              Savings
            </h3>
            <p className="text-lg font-medium text-red-600">
              {formatCurrency(savings, currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
