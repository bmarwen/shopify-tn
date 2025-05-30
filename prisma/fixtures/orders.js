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

  // Clear existing orders in proper order to avoid foreign key constraints
  try {
    // Delete in order: Invoice -> OrderPayment -> CheckPayment -> OrderItem -> Order
    await prisma.invoice.deleteMany({});
    await prisma.orderPayment.deleteMany({}).catch(() => console.log('OrderPayment table not found - this is expected for new schema'));
    await prisma.checkPayment.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    console.log('✅ Cleared existing orders successfully');
  } catch (error) {
    console.warn('⚠️ Warning: Failed to delete some existing orders. Continuing...');
    console.error(error.message);
  }

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
      // Select random product with variant
      const product = getRandomItem(products);
      
      // All products should now have variants, select one
      if (product.variants.length === 0) {
        console.warn(`Product ${product.name} has no variants, skipping...`);
        continue;
      }
      
      const variant = getRandomItem(product.variants);
      
      // Calculate price and quantity from variant
      const price = variant.price;
      const tva = variant.tva || 19;
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
        variantId: variant.id, // Always have a variant now
        quantity,
        unitPrice,
        total: itemTotal,
        // Add new fields required by the updated schema
        productName: product.name,
        productSku: variant.sku || product.sku || null,
        productBarcode: variant.barcode || product.barcode || null,
        productDescription: product.description || null,
        productOptions: variant.options || null,
        productImage:
          (variant.images && variant.images.length > 0 ? variant.images[0] : null) ||
          (product.images && product.images.length > 0 ? product.images[0] : null),
        productTva: tva,
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

    // Select payment method type (mix some multi-payment orders)
    const paymentMethodType = Math.random() > 0.7 ? null : getRandomItem(["CASH", "CHECK", "BANK_TRANSFER"]); // 30% multi-payment
    const orderSource = getRandomItem(["ONLINE", "IN_STORE", "PHONE"]);

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: getRandomItem(orderStatuses),
        paymentStatus: getRandomItem(paymentStatuses),
        paymentMethodType, // Can be null for multi-payment orders
        orderSource,
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

    // Create payment records for multi-payment orders
    if (!paymentMethodType && Math.random() > 0.5) {
      // Create multiple payments for this order (cash + check example)
      const cashAmount = Math.round(total * 0.6 * 100) / 100; // 60% cash
      const checkAmount = Math.round((total - cashAmount) * 100) / 100; // Rest as check

      // Create cash payment
      await prisma.orderPayment.create({
        data: {
          orderId: order.id,
          paymentMethod: "CASH",
          amount: cashAmount,
          status: "COMPLETED",
          cashGiven: cashAmount + Math.round(Math.random() * 20 * 100) / 100, // Some change
          cashChange: Math.max(0, (cashAmount + Math.round(Math.random() * 20 * 100) / 100) - cashAmount),
        },
      });

      // Create check payment
      await prisma.orderPayment.create({
        data: {
          orderId: order.id,
          paymentMethod: "CHECK",
          amount: checkAmount,
          status: "PENDING",
          checkNumber: `CHK${Math.floor(Math.random() * 999999)}`,
          checkBankName: getRandomItem(["Bank ABC", "XYZ Bank", "National Bank"]),
          checkDate: getRandomDate(),
          checkStatus: "RECEIVED",
        },
      });

      console.log(`  - Created multi-payment: ${cashAmount} DT cash + ${checkAmount} DT check`);
    }

    orders.push(order);
    console.log(
      `Created order: ${order.orderNumber} (${order.status}) - ${total.toFixed(2)} DT`
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
