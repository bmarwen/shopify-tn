// prisma/fixtures/subscriptions.js
async function run(prisma) {
  try {
    // Get the shop
    const shop = await prisma.shop.findFirst({
      where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
    });

    if (!shop) {
      throw new Error("Shop not found. Run shop fixtures first.");
    }

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: "SHOP_ADMIN",
        shopId: shop.id,
      },
    });

    if (!adminUser) {
      throw new Error("Admin user not found. Run users fixtures first.");
    }

    // Get plan pricing
    const standardPricing = await prisma.planPricing.findFirst({
      where: { planType: "STANDARD" },
    });

    const advancedPricing = await prisma.planPricing.findFirst({
      where: { planType: "ADVANCED" },
    });

    if (!standardPricing || !advancedPricing) {
      throw new Error(
        "Plan pricing not found. Run planPricing fixtures first."
      );
    }

    // Clear existing data
    await prisma.subscriptionPayment.deleteMany({});
    await prisma.subscription.deleteMany({});

    // Create an active subscription for the current shop
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(now.getFullYear() + 1);

    // Calculate total amount with 12% discount for one year
    const discount = 12; // 12% discount for 1 year
    const totalAmount =
      standardPricing.monthlyPrice * 12 * (1 - discount / 100);

    const activeSubscription = await prisma.subscription.create({
      data: {
        shopId: shop.id,
        userId: adminUser.id,
        planPricingId: standardPricing.id,
        startDate: now,
        endDate: oneYearLater,
        period: "ONE_YEAR",
        status: "ACTIVE",
        totalAmount: totalAmount,
        appliedDiscount: discount,
      },
    });

    // Create payment for 8 months (partial payment)
    const partialPayment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: activeSubscription.id,
        amount: standardPricing.monthlyPrice * 8 * (1 - discount / 100),
        paymentDate: now,
        paymentMethod: "BANK_TRANSFER",
        status: "COMPLETED",
        transactionId: "TRX-123456",
        notes: "Initial payment for 8 months",
      },
    });

    console.log(`Created active subscription for ${shop.name}`);
    console.log(
      `Created partial payment: ${partialPayment.amount} TND (8 months)`
    );

    // Create an expired subscription for a demo user/shop
    // (this assumes you have another user/shop set up, if not, you can skip this part)
    const expiredDate = new Date(now);
    expiredDate.setMonth(now.getMonth() - 1); // 1 month ago

    const expiredEndDate = new Date(expiredDate);
    expiredEndDate.setMonth(expiredDate.getMonth() + 6); // 6 months subscription

    // Try to find another shop, or use the same one for demo
    const anotherShop = await prisma.shop.findFirst({
      where: {
        id: { not: shop.id },
      },
    });

    if (anotherShop) {
      // Find an admin for this shop
      const anotherAdmin = await prisma.user.findFirst({
        where: {
          role: "SHOP_ADMIN",
          shopId: anotherShop.id,
        },
      });

      if (anotherAdmin) {
        const expiredSubscription = await prisma.subscription.create({
          data: {
            shopId: anotherShop.id,
            userId: anotherAdmin.id,
            planPricingId: advancedPricing.id,
            startDate: expiredDate,
            endDate: expiredEndDate,
            period: "SIX_MONTHS",
            status: "EXPIRED",
            totalAmount: advancedPricing.monthlyPrice * 6,
            appliedDiscount: 0,
          },
        });

        // Create full payment (but subscription is still expired due to date)
        const fullPayment = await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: expiredSubscription.id,
            amount: advancedPricing.monthlyPrice * 6,
            paymentDate: expiredDate,
            paymentMethod: "CREDIT_CARD",
            status: "COMPLETED",
            transactionId: "TRX-654321",
            notes: "Full payment for 6 months subscription",
          },
        });

        console.log(`Created expired subscription for ${anotherShop.name}`);
      }
    }

    return { activeSubscription, partialPayment };
  } catch (error) {
    console.error("Error in subscriptions fixture:", error);
    throw error;
  }
}

module.exports = { run };
