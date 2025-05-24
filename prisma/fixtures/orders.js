// prisma/fixtures/orders.js
const {
  generateOrderNumber,
  getRandomItem,
  getRandomDate,
} = require("./utils");

async function run(prisma) {
  // Get the shop
  const shop = await prisma.shop.findFirst({
    where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
  });

  if (!shop) {
    throw new Error("Shop not found. Run shop fixtures first.");
  }

  // Get customers
  const customers = await prisma.user.findMany({
    where: {
      shopId: shop.id,
      role: "CUSTOMER",
    },
    include: {
      addresses: true,
    },
  });

  if (customers.length === 0) {
    throw new Error("No customers found. Run user fixtures first.");
  }

  // Get products with variants
  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    include: {
      variants: true,
    },
  });

  if (products.length === 0) {
    throw new Error("No products found. Run product fixtures first.");
  }

  // Clear existing orders
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  // Generate random orders
  const orderStatuses = [
    "PENDING",
    "SHIPPED",
    "RETURNED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ];

  const paymentStatuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];

  // Create orders
  const orders = [];
  const orderCount = 20; // Number of orders to create

  for (let i = 0; i < orderCount; i++) {
    // Select random customer
    const customer = getRandomItem(customers);
    const address = customer.addresses[0] || null;

    // Generate 1-5 order items
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      // Select random product
      const product = getRandomItem(products);

      // Maybe select a variant
      const hasVariant = product.variants.length > 0 && Math.random() > 0.3;
      const variant = hasVariant ? getRandomItem(product.variants) : null;

      // Calculate price and quantity
      const price = variant ? variant.price : product.price;
      const quantity = Math.floor(Math.random() * 3) + 1;

      // Apply a random discount (20% of the time)
      const hasDiscount = Math.random() > 0.8;
      const discountPercentage = hasDiscount
        ? Math.floor(Math.random() * 30) + 5
        : null; // 5-35% discount
      const discountAmount = hasDiscount
        ? (price * discountPercentage) / 100
        : null;
      const unitPrice = hasDiscount ? price - (discountAmount || 0) : price;
      const itemTotal = unitPrice * quantity;

      subtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        variantId: variant ? variant.id : null,
        quantity,
        unitPrice,
        total: itemTotal,
        // Add new fields required by the updated schema
        productName: product.name,
        productSku: product.sku || null,
        productBarcode: product.barcode || null,
        productDescription: product.description || null,
        productOptions: variant ? variant.options : null,
        productImage:
          product.images && product.images.length > 0
            ? product.images[0]
            : null,
        productTva: product.tva || 19, // Default TVA if not set
        discountPercentage: discountPercentage,
        discountAmount: discountAmount,
        discountCode: null,
        originalPrice: hasDiscount ? price : null,
      });
    }

    // Calculate order totals
    const tax = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
    const shipping = 10.0; // Flat shipping rate
    const discount =
      Math.random() > 0.7 ? Math.round(subtotal * 0.15 * 100) / 100 : 0; // 15% discount sometimes
    const total = subtotal + tax + shipping - discount;

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: getRandomItem(orderStatuses),
        paymentStatus: getRandomItem(paymentStatuses),
        subtotal,
        tax,
        shipping,
        discount,
        total,
        notes: Math.random() > 0.7 ? "Please deliver to front door" : null,
        userId: customer.id,
        shopId: shop.id,
        addressId: address ? address.id : null,
        createdAt: getRandomDate(),
        items: {
          create: orderItems,
        },
      },
    });

    orders.push(order);
    console.log(
      `Created order: ${order.orderNumber} (${
        order.status
      }) - $${order.total.toFixed(2)}`
    );

    // Create invoice for completed orders (for Advanced/Premium plan features)
    if (
      ["SHIPPED", "DELIVERED"].includes(order.status) &&
      order.paymentStatus === "COMPLETED"
    ) {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${order.orderNumber.slice(4)}`,
          orderId: order.id,
          pdfUrl: `/invoices/${order.orderNumber}.pdf`, // Mock URL
        },
      });
      console.log(`  - Created invoice: ${invoice.invoiceNumber}`);
    }
  }

  return orders;
}

module.exports = { run };
