// prisma/fixtures/clear-all.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Clears all data from the database without dropping the schema
 * Deletes in the correct order to avoid foreign key constraint errors
 */
async function clearAllData() {
  console.log("🧹 Clearing all data from the database...");

  try {
    // Delete in order of dependencies (children first, then parents)

    // Order related
    await prisma.orderItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.order.deleteMany({});

    // Cart related
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});

    // Product related
    await prisma.productVariant.deleteMany({});
    await prisma.customFieldValue.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.product.deleteMany({});

    // Categories
    await prisma.category.deleteMany({});

    // User related
    await prisma.address.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.user.deleteMany({});

    // Shop related
    await prisma.paymentMethod.deleteMany({});
    await prisma.shippingMethod.deleteMany({});
    await prisma.customField.deleteMany({});
    await prisma.shopSettings.deleteMany({});
    await prisma.shop.deleteMany({});

    console.log("✅ All data has been cleared");
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();
