import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { systemLimitsService } from "@/lib/services/system-limits.service";

// Super admin system limits management
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const planType = searchParams.get('planType');

    if (planType) {
      const limits = await systemLimitsService.getPlanLimits(planType as any);
      return NextResponse.json({ success: true, limits });
    }

    // Get all system limits
    const allLimits = await db.systemLimit.findMany({
      orderBy: [{ planType: 'asc' }, { category: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      limits: allLimits,
    });
  } catch (error) {
    console.error("Error fetching system limits:", error);
    return NextResponse.json(
      { error: "Failed to fetch system limits" },
      { status: 500 }
    );
  }
}

// Update system limit
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { codeName, value } = await req.json();

    if (!codeName || value === undefined) {
      return NextResponse.json(
        { error: "Code name and value are required" },
        { status: 400 }
      );
    }

    const updatedLimit = await systemLimitsService.updateSystemLimit(
      codeName,
      parseInt(value)
    );

    return NextResponse.json({
      success: true,
      limit: updatedLimit,
      message: "System limit updated successfully",
    });
  } catch (error) {
    console.error("Error updating system limit:", error);
    return NextResponse.json(
      { error: "Failed to update system limit" },
      { status: 500 }
    );
  }
}

// Create new system limit
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { codeName, name, description, value, category, planType } = await req.json();

    if (!codeName || !name || value === undefined || !category) {
      return NextResponse.json(
        { error: "Code name, name, value, and category are required" },
        { status: 400 }
      );
    }

    const newLimit = await systemLimitsService.createSystemLimit({
      codeName,
      name,
      description,
      value: parseInt(value),
      category,
      planType,
    });

    return NextResponse.json({
      success: true,
      limit: newLimit,
      message: "System limit created successfully",
    });
  } catch (error) {
    console.error("Error creating system limit:", error);
    return NextResponse.json(
      { error: "Failed to create system limit" },
      { status: 500 }
    );
  }
}
