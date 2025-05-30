import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";

// Create POS order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const userId = session.user.id;
    const body = await req.json();

    const {
      customerId,
      items,
      paymentMethods = [{ method: "CASH", amount: 0 }],
      discountCodeId,
      discountCodeValue,
      orderDiscount = 0,
      orderDiscountType = "PERCENTAGE",
      // Frontend calculated totals for validation
      expectedSubtotal,
      expectedDiscountCodeAmount = 0,
      expectedManualDiscountAmount = 0,
      expectedTotal,
      notes,
      orderStatus,
      paymentStatus,
      // Legacy support
      paymentMethodType,
      cashAmountGiven,
      cashAmountChange,
      checkPayments,
    } = body;

    console.log('Received POS order data:', { 
      customerId, 
      items, 
      paymentMethods, 
      orderDiscount, 
      orderDiscountType, 
      expectedTotal,
      expectedSubtotal,
      expectedDiscountCodeAmount,
      expectedManualDiscountAmount
    });

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Validate customer exists if provided
    let customer = null;
    if (customerId) {
      customer = await db.user.findUnique({
        where: { id: customerId, shopId, role: "CUSTOMER" },
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
    }

    // Process payment methods
    let processedPaymentMethods = [];
    
    if (paymentMethods && paymentMethods.length > 0 && paymentMethods[0].method) {
      processedPaymentMethods = paymentMethods;
    } else if (paymentMethodType) {
      const legacyPayment = {
        method: paymentMethodType,
        amount: 0, // Will be set later
        cashGiven: cashAmountGiven,
        cashChange: cashAmountChange,
        checkPayments: checkPayments
      };
      processedPaymentMethods = [legacyPayment];
    } else {
      return NextResponse.json(
        { error: "No payment methods specified" },
        { status: 400 }
      );
    }

    // Create order in transaction
    const order = await db.$transaction(async (tx) => {
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let finalSubtotal = 0;
      let total = 0;

      // If frontend provides expected totals, use them for consistency
      if (expectedSubtotal && expectedTotal) {
        console.log('Using frontend calculated totals for consistency');
        
        // Use frontend calculations directly
        subtotal = expectedSubtotal;
        totalDiscount = expectedDiscountCodeAmount + expectedManualDiscountAmount;
        total = expectedTotal;
        
        // Calculate tax from the difference
        totalTax = subtotal - total + totalDiscount;
        finalSubtotal = total - totalTax;
        
        // Round values to avoid floating-point precision issues
        subtotal = Math.round(subtotal * 100) / 100;
        totalTax = Math.round(totalTax * 100) / 100;
        totalDiscount = Math.round(totalDiscount * 100) / 100;
        finalSubtotal = Math.round(finalSubtotal * 100) / 100;
        total = Math.round(total * 100) / 100;
        
        console.log('Frontend totals:', {
          subtotal,
          totalDiscount,
          totalTax,
          finalSubtotal,
          total
        });
      } else {
        console.log('Calculating totals on backend');
        // Backend calculation fallback - simplified for now
        total = 0; // Will be calculated
      }

      // Validate and process items (always needed for inventory)
      const validatedItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await tx.product.findUnique({
            where: { id: item.productId, shopId },
            include: {
              variants: {
                include: { customFields: true }
              },
              discounts: {
                where: {
                  enabled: true,
                  startDate: { lte: new Date() },
                  endDate: { gte: new Date() },
                  availableInStore: true,
                },
              },
            },
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const variant = product.variants.find(v => v.id === item.variantId);
          if (!variant) {
            throw new Error(`Variant ${item.variantId} not found for product ${product.name}`);
          }

          // Check inventory
          if (variant.inventory < item.quantity) {
            throw new Error(`Insufficient inventory for ${product.name} - ${variant.name}. Available: ${variant.inventory}, Requested: ${item.quantity}`);
          }

          // For backend calculation, accumulate totals
          if (!expectedTotal) {
            let unitPrice = variant.price;
            if (product.discounts.length > 0) {
              const discountAmount = (unitPrice * product.discounts[0].percentage) / 100;
              unitPrice = unitPrice - discountAmount;
            }
            const lineTotal = unitPrice * item.quantity;
            const lineTotalExcludingTax = lineTotal / (1 + variant.tva / 100);
            const taxAmount = lineTotal - lineTotalExcludingTax;
            
            subtotal += lineTotalExcludingTax;
            totalTax += taxAmount;
          }

          return {
            productId: product.id,
            variantId: variant.id,
            quantity: item.quantity,
            unitPrice: variant.price,
            total: variant.price * item.quantity,
            productName: `${product.name} - ${variant.name}`,
            productSku: variant.sku || product.sku || '',
            productBarcode: variant.barcode || product.barcode || '',
            productDescription: product.description || '',
            productImage: (variant.images && variant.images.length > 0) ? variant.images[0] : (product.images && product.images.length > 0 ? product.images[0] : null),
            productTva: variant.tva,
            productOptions: variant.options,
            originalPrice: variant.price,
            discountPercentage: 0,
            discountAmount: 0,
            discountCode: null,
          };
        })
      );

      // If no frontend totals, calculate backend totals
      if (!expectedTotal) {
        // Apply order discount
        let orderDiscountAmount = 0;
        if (orderDiscount > 0) {
          if (orderDiscountType === "PERCENTAGE") {
            orderDiscountAmount = (subtotal * orderDiscount) / 100;
          } else {
            orderDiscountAmount = Math.min(orderDiscount, subtotal + totalTax);
          }
          totalDiscount = orderDiscountAmount;
        }

        finalSubtotal = Math.max(0, subtotal - orderDiscountAmount);
        const discountRatio = subtotal > 0 ? orderDiscountAmount / subtotal : 0;
        const adjustedTax = totalTax * (1 - discountRatio);
        total = finalSubtotal + adjustedTax;
        
        // Round values to avoid floating-point precision issues
        subtotal = Math.round(subtotal * 100) / 100;
        totalTax = Math.round(totalTax * 100) / 100;
        totalDiscount = Math.round(totalDiscount * 100) / 100;
        finalSubtotal = Math.round(finalSubtotal * 100) / 100;
        total = Math.round(total * 100) / 100;
      }

      // Set payment amounts if using legacy single payment
      if (processedPaymentMethods.length === 1 && processedPaymentMethods[0].amount === 0) {
        processedPaymentMethods[0].amount = total;
      }

      // Validate payment amounts
      let totalPaymentAmount = 0;
      for (const payment of processedPaymentMethods) {
        if (payment.method === 'CASH' && payment.amount === 0) {
          continue; // Valid - covered by other payments
        }
        if (!payment.amount || payment.amount <= 0) {
          throw new Error(`Invalid payment amount: ${payment.amount}`);
        }
        totalPaymentAmount += payment.amount;
      }

      // Payment validation with tolerance
      const tolerance = 0.01;
      const paymentDifference = Math.abs(totalPaymentAmount - total);
      
      console.log('Payment validation:', {
        total: total.toFixed(2),
        totalPaymentAmount: totalPaymentAmount.toFixed(2),
        difference: paymentDifference.toFixed(2),
        tolerance
      });

      if (paymentDifference > tolerance) {
        throw new Error(
          `Payment total (${totalPaymentAmount.toFixed(2)}) does not match order total (${total.toFixed(2)}) - difference: ${paymentDifference.toFixed(2)}`
        );
      }

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: orderStatus || "DELIVERED",
          paymentStatus: paymentStatus || (processedPaymentMethods.some(p => p.method === "CHECK") ? "PENDING" : "COMPLETED"),
          paymentMethodType: processedPaymentMethods.length === 1 ? processedPaymentMethods[0].method : null,
          orderSource: "IN_STORE",
          subtotal: finalSubtotal,
          tax: totalTax,
          shipping: 0,
          discount: totalDiscount,
          total,
          discountCodeId: discountCodeId || null,
          discountCodeValue: discountCodeValue || null,
          notes,
          shopId,
          userId: customerId || userId,
          processedByUserId: userId,
          items: {
            create: validatedItems,
          },
          // Legacy cash fields
          cashAmountGiven: processedPaymentMethods.find(p => p.method === "CASH")?.cashGiven,
          cashAmountChange: processedPaymentMethods.find(p => p.method === "CASH")?.cashChange,
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          user: true,
          processedBy: true,
        },
      });

      // Create OrderPayment records
      for (const payment of processedPaymentMethods) {
        await tx.orderPayment.create({
          data: {
            orderId: newOrder.id,
            paymentMethod: payment.method,
            amount: payment.amount,
            status: payment.method === "CASH" ? "COMPLETED" : "PENDING",
            notes: payment.notes || null,
            cashGiven: payment.cashGiven || null,
            cashChange: payment.cashChange || null,
            checkNumber: payment.checkNumber || null,
            checkBankName: payment.checkBankName || null,
            checkDate: payment.checkDate || null,
            checkStatus: payment.method === "CHECK" ? "RECEIVED" : null,
          },
        });
      }

      // Handle legacy check payments
      if (checkPayments && checkPayments.length > 0) {
        for (const check of checkPayments) {
          await tx.checkPayment.create({
            data: {
              orderId: newOrder.id,
              checkNumber: check.checkNumber,
              bankName: check.bankName,
              amount: check.amount,
              checkDate: check.checkDate,
              receivedDate: new Date(),
              status: "RECEIVED",
              notes: check.notes,
              shopId,
            },
          });
        }
      }

      // Update inventory
      for (const item of validatedItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Increment discount code usage
      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // Create notification
      await tx.notification.create({
        data: {
          title: "New In-Store Order",
          message: `Order ${orderNumber} created for ${total.toFixed(2)}`,
          type: "ORDER_CREATED",
          shopId,
        },
      });

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        customer: order.user ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
        } : null,
        paymentMethods: processedPaymentMethods.map(p => ({
          method: p.method,
          amount: p.amount,
          status: p.method === "CASH" ? "COMPLETED" : "PENDING"
        })),
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    });
  } catch (error) {
    console.error("Error creating POS order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
