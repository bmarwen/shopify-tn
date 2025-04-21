// src/app/api/custom-fields/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// GET a single custom field
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const fieldId = params.id;

    // Get the custom field
    const customField = await db.customField.findUnique({
      where: {
        id: fieldId,
      },
    });

    // Check if it belongs to this shop
    if (!customField || customField.shopId !== shopId) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(customField);
  } catch (error) {
    console.error("Error fetching custom field:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field" },
      { status: 500 }
    );
  }
}

// UPDATE a custom field
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fieldId = params.id;

    // Check if custom field exists and belongs to this shop
    const existingField = await db.customField.findUnique({
      where: {
        id: fieldId,
      },
    });

    if (!existingField || existingField.shopId !== shopId) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, type, required } = body;

    // Validate input
    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Check if name already exists (except for this field)
    if (name !== existingField.name) {
      const nameExists = await db.customField.findFirst({
        where: {
          shopId,
          name: {
            equals: name,
            mode: "insensitive",
          },
          id: {
            not: fieldId,
          },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: "A custom field with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Update custom field
    const updatedField = await db.customField.update({
      where: { id: fieldId },
      data: {
        name,
        type,
        required: required === true,
      },
    });

    return NextResponse.json(updatedField);
  } catch (error) {
    console.error("Error updating custom field:", error);
    return NextResponse.json(
      { error: "Failed to update custom field" },
      { status: 500 }
    );
  }
}

// DELETE a custom field
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fieldId = params.id;

    // Check if custom field exists and belongs to this shop
    const existingField = await db.customField.findUnique({
      where: {
        id: fieldId,
      },
    });

    if (!existingField || existingField.shopId !== shopId) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      );
    }

    // Check if the field is in use
    const inUseCount = await db.customFieldValue.count({
      where: { customFieldId: fieldId },
    });

    if (inUseCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete a custom field that is in use",
          count: inUseCount,
        },
        { status: 400 }
      );
    }

    // Delete the custom field
    await db.customField.delete({
      where: { id: fieldId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    );
  }
}
