// src/app/api/custom-fields/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for custom field creation
const createCustomFieldSchema = z.object({
  name: z.string().min(2, "Field name must be at least 2 characters"),
  type: z.string().min(1, "Field type is required"),
  required: z.boolean().default(false),
});

// POST: Create a new custom field
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

    // Parse and validate request body
    const body = await req.json();
    const validationResult = createCustomFieldSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      );
    }

    const { name, type, required } = validationResult.data;

    // Check if field with the same name already exists for this shop
    const existingField = await db.customField.findFirst({
      where: {
        shopId,
        name: {
          equals: name,
          mode: "insensitive", // Case insensitive comparison
        },
      },
    });

    if (existingField) {
      return NextResponse.json(
        { error: "A custom field with this name already exists" },
        { status: 400 }
      );
    }

    // Create the custom field
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

// GET: List all custom fields for the shop
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const sort = searchParams.get("sort") || "name";
    const order = searchParams.get("order") || "asc";

    // Build where clause
    const where: any = { shopId };

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (type) {
      where.type = type;
    }

    // Get custom fields
    const customFields = await db.customField.findMany({
      where,
      orderBy: {
        [sort]: order,
      },
    });

    // Count usage for each field
    const fieldsWithUsage = await Promise.all(
      customFields.map(async (field) => {
        const usageCount = await db.customFieldValue.count({
          where: { customFieldId: field.id },
        });

        return {
          ...field,
          usageCount,
        };
      })
    );

    return NextResponse.json(fieldsWithUsage);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    );
  }
}
