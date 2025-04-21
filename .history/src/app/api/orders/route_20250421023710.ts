// src/app/api/orders/route.ts - Update the POST method to capture product info

// Example POST handler for order creation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const userId = session.user.id;

    const body = await req.json();
    const { items, shippingAddressId, paymentMethod, notes, couponCode } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Generate a unique order number
    const orderNumber = generateOrderNumber();

    // Calculate totals and prepare items
    let subtotal = 0;
    const orderItems = [];

    // Process each item to capture product information
    for (const item of items) {
      const { productId, variantId, quantity } = item;

      // If neither product nor variant is provided, reject
      if (!productId) {
        return NextResponse.json(
          { error: "Each item must specify a product" },
          { status: 400 }
        );
      }

      // Look up the product and variant
      const product = await db.product.findUnique({
        where: {
          id: productId,
          shopId, // Ensure it belongs to this shop
        },
        include: {
          variants: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product with ID ${productId} not found` },
          { status: 404 }
        );
      }

      // Determine the variant if applicable
      let variant = null;
      if (variantId) {
        variant = product.variants.find((v) => v.id === variantId);
        if (!variant) {
          return NextResponse.json(
            { error: `Variant with ID ${variantId} not found` },
            { status: 404 }
          );
        }
      }

      // Check for active discounts on this product
      const activeDiscount = await db.discount.findFirst({
        where: {
          productId,
          enabled: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: {
          percentage: "desc", // Get the highest discount if multiple exist
        },
      });

      // Calculate the unit price based on product or variant
      let unitPrice = variant ? variant.price : product.price;
      let originalPrice = unitPrice;
      let discountPercentage = null;
      let discountAmount = null;

      // Apply product-specific discount if available
      if (activeDiscount) {
        discountPercentage = activeDiscount.percentage;
        discountAmount = (unitPrice * discountPercentage) / 100;
        unitPrice = unitPrice - discountAmount;
      }

      // Calculate total for this item
      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      // Capture product information at the time of order
      orderItems.push({
        productId,
        variantId: variant ? variant.id : null,
        quantity,
        unitPrice,
        total: itemTotal,
        // Capture product information for historical records
        productName: product.name,
        productSku: product.sku || null,
        productBarcode: product.barcode || null,
        productDescription: product.description || null,
        productOptions: variant ? variant.options : null,
        productImage:
          product.images && product.images.length > 0
            ? product.images[0]
            : null,
        // Tax and discount information
        productTva: product.tva || 19, // Capture TVA rate at time of order
        discountPercentage: discountPercentage,
        discountAmount: discountAmount,
        discountCode: null, // This will be updated if a coupon code is applied
        originalPrice: originalPrice,
      });
    }

    // Apply coupon if provided
    let discount = 0;
    let appliedCouponCode = null;
    let couponPercentage = 0;

    if (couponCode) {
      // Fetch and validate the coupon
      const coupon = await db.discountCode.findFirst({
        where: {
          code: couponCode,
          shopId,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (coupon) {
        // Apply the discount
        couponPercentage = coupon.percentage;
        discount = (subtotal * couponPercentage) / 100;
        appliedCouponCode = coupon.code;

        // Update order items with the coupon code information if the coupon is valid
        orderItems.forEach((item) => {
          item.discountCode = appliedCouponCode;

          // If the item already has a product-specific discount, we keep the higher one
          // and adjust the discountAmount and discountPercentage accordingly
          if (
            !item.discountPercentage ||
            couponPercentage > item.discountPercentage
          ) {
            const itemOriginalPrice = item.originalPrice || item.unitPrice;
            const newDiscountAmount =
              (itemOriginalPrice * couponPercentage) / 100;

            // Update discount information
            item.discountPercentage = couponPercentage;
            item.discountAmount = newDiscountAmount;

            // Recalculate unit price and total
            item.unitPrice = itemOriginalPrice - newDiscountAmount;
            item.total = item.unitPrice * item.quantity;
          }
        });

        // Recalculate subtotal based on updated item totals
        subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
      }
    }

    // Calculate tax and shipping (simplified example)
    const tax = subtotal * 0.1; // 10% tax
    const shipping = 10.0; // Flat shipping rate
    const total = subtotal + tax + shipping - discount;

    // Create the order in a transaction
    const order = await db.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: "PENDING",
          paymentStatus: "PENDING",
          shippingStatus: "PENDING",
          subtotal,
          tax,
          shipping,
          discount,
          total,
          notes,
          userId,
          shopId,
          addressId: shippingAddressId,
          // Create order items with captured product info
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Update inventory
      for (const item of items) {
        const { productId, variantId, quantity } = item;

        if (variantId) {
          // Update variant inventory
          await tx.productVariant.update({
            where: { id: variantId },
            data: {
              inventory: {
                decrement: quantity,
              },
            },
          });
        } else {
          // Update product inventory
          await tx.product.update({
            where: { id: productId },
            data: {
              inventory: {
                decrement: quantity,
              },
            },
          });
        }
      }

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
