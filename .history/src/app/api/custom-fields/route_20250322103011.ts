// src/app/api/custom-fields/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// GET custom fields for the shop
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;

    // Get custom fields for the shop
    const customFields = await db.customField.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}

// Create a new custom field
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const body = await req.json();

    // Validate input
    const { name, type, required = false } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Check if a custom field with the same name already exists
    const existingField = await db.customField.findFirst({
      where: {
        shopId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingField) {
      return NextResponse.json(
        { error: "A custom field with this name already exists" },
        { status: 400 }
      );
    }

    // Create new custom field
    const customField = await db.customField.create({
      data: {
        name,
        type,
        required,
        shopId,
      },
    });

    return NextResponse.json(customField, { status: 201 });
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    );
  }
}
