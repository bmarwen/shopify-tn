// src/app/api/orders/[id]/invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { hasFeatureAccess, Feature } from "@/lib/feature-authorization";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has the invoice generation feature
    if (!hasFeatureAccess(session.user, Feature.INVOICE_GENERATION)) {
      return NextResponse.json(
        {
          error:
            "Access denied. Your plan does not include invoice generation.",
        },
        { status: 403 }
      );
    }

    const shopId = session.user.shopId;
    const orderId = params.id;

    // Get order with all necessary information
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        shopId, // Ensure it belongs to this shop
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        address: true,
        items: true, // This includes all stored product information
        invoice: true, // Check if invoice already exists
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get shop information for invoice
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      include: {
        settings: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check if invoice already exists
    if (order.invoice) {
      // Return existing invoice information
      return NextResponse.json({
        invoiceNumber: order.invoice.invoiceNumber,
        pdfUrl: order.invoice.pdfUrl,
        orderId: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        // Include a link to download the existing invoice
        downloadUrl: `/api/invoices/${order.invoice.id}/download`,
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${order.orderNumber.slice(4)}`;

    // Generate PDF content (simplified - in real implementation this would use a PDF library)
    const invoiceData = {
      invoiceNumber,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      dueDate: order.createdAt, // Due immediately for simplicity
      customer: {
        name: order.user.name,
        email: order.user.email,
        address: order.address
          ? {
              line1: order.address.line1,
              line2: order.address.line2,
              city: order.address.city,
              state: order.address.state,
              postalCode: order.address.postalCode,
              country: order.address.country,
            }
          : null,
      },
      shop: {
        name: shop.name,
        address: shop.settings?.address,
        email: shop.settings?.contactEmail,
        phone: shop.settings?.contactPhone,
      },
      items: order.items.map((item) => ({
        // Use stored information from order time, not current product info
        name: item.productName,
        description: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice: item.originalPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        total: item.total,
        tva: item.productTva,
        tvaTotalAmount: (item.total * item.productTva) / 100,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      paymentStatus: order.paymentStatus,
    };

    // In a real implementation, you would generate a PDF here
    // For this example, we'll just create the invoice record

    // Create the invoice record
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        pdfUrl: `/invoices/${invoiceNumber}.pdf`, // This would be the actual PDF URL in production
      },
    });

    // Return invoice data
    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        pdfUrl: invoice.pdfUrl,
        createdAt: invoice.createdAt,
      },
      // Include the full invoice data for rendering
      invoiceData,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
