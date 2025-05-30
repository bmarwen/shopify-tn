// src/app/api/discount-codes/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DiscountValidationService from "@/lib/services/discount-validation.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const {
      code,
      orderSource = 'ONLINE',
      customerId,
      cartItems = [],
      subtotal,
    } = await req.json();

    if (!code || !subtotal) {
      return NextResponse.json(
        { error: "Code and subtotal are required" },
        { status: 400 }
      );
    }

    // Validate the discount code
    const result = await DiscountValidationService.validateDiscountCode({
      code,
      shopId,
      orderSource,
      customerId,
      cartItems,
      subtotal,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error validating discount code:", error);
    return NextResponse.json(
      { error: "Failed to validate discount code" },
      { status: 500 }
    );
  }
}
