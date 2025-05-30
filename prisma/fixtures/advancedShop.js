// prisma/fixtures/advancedShop.js
const bcrypt = require("bcryptjs");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

async function run(prisma) {
  try {
    // First check if the advanced shop already exists
    const existingShop = await prisma.shop.findUnique({
      where: {
        subdomain: "advanced",
      },
    });

    if (existingShop) {
      console.log(
        `Advanced shop already exists: ${existingShop.name} (${existingShop.subdomain})`
      );

      // Return the existing shop and find its admin
      const advancedAdmin = await prisma.user.findFirst({
        where: {
          shopId: existingShop.id,
          role: "SHOP_ADMIN",
        },
      });

      return { advancedShop: existingShop, advancedAdmin };
    }

    // Create another shop with Advanced plan
    const advancedShop = await prisma.shop.create({
      data: {
        name: "Advanced Shop",
        subdomain: "advanced",
        description: "A shop with the Advanced subscription plan",
        planType: "ADVANCED",
        active: true,
        settings: {
          create: {
            currency: "DT",
            language: "fr",
            timezone: "UTC",
            lowStockThreshold: 5,
            contactEmail: "advanced@example.com",
            contactPhone: "+1234567890",
            address: "123 Advanced St, Business City",
          },
        },
      },
    });

    console.log(
      `Created advanced shop: ${advancedShop.name} (${advancedShop.subdomain})`
    );

    // Create shop admin for this shop
    const hashedPassword = await bcrypt.hash("adminpassword", 10);
    const advancedAdmin = await prisma.user.create({
      data: {
        email: "advanced-admin@example.com",
        password: hashedPassword,
        name: "Advanced Admin",
        role: "SHOP_ADMIN",
        shopId: advancedShop.id,
      },
    });

    console.log(`Created admin user for advanced shop: ${advancedAdmin.email}`);

    // Add some sample categories
    const category1 = await prisma.category.create({
      data: {
        name: "Advanced Electronics",
        slug: "advanced-electronics",
        description: "High-end electronic products",
        shopId: advancedShop.id,
      },
    });

    const category2 = await prisma.category.create({
      data: {
        name: "Advanced Fashion",
        slug: "advanced-fashion",
        description: "High-quality fashion items",
        shopId: advancedShop.id,
      },
    });

    // Add a subcategory
    const subcategory = await prisma.category.create({
      data: {
        name: "Premium Gadgets",
        slug: "premium-gadgets",
        description: "Exclusive gadgets",
        shopId: advancedShop.id,
        parentId: category1.id,
      },
    });

    // Add some products with variants
    const product1 = await prisma.product.create({
      data: {
        name: "Premium Smartwatch",
        slug: "premium-smartwatch",
        description: "High-end smartwatch with advanced features",
        images: ["/assets/images/products/smartwatch.jpg"],
        shopId: advancedShop.id,
        categories: {
          connect: [{ id: subcategory.id }],
        },
        variants: {
          create: [
            {
              name: "Black / 42mm",
              price: 299.99,
              cost: 200.00,
              tva: 19,
              inventory: 15,
              sku: "WATCH-BLK-42",
              options: { color: "Black", size: "42mm" },
            },
            {
              name: "Silver / 42mm",
              price: 299.99,
              cost: 200.00,
              tva: 19,
              inventory: 10,
              sku: "WATCH-SIL-42",
              options: { color: "Silver", size: "42mm" },
            },
          ],
        },
      },
    });
    console.log(`Created product: ${product1.name} with variants`);

    const product2 = await prisma.product.create({
      data: {
        name: "Designer Jacket",
        slug: "designer-jacket",
        description: "Premium designer jacket",
        images: ["/assets/images/products/jacket.jpg"],
        shopId: advancedShop.id,
        categories: {
          connect: [{ id: category2.id }],
        },
        variants: {
          create: [
            {
              name: "Black / M",
              price: 199.99,
              cost: 120.00,
              tva: 19,
              inventory: 8,
              sku: "JACKET-BLK-M",
              options: { color: "Black", size: "M" },
            },
            {
              name: "Black / L",
              price: 199.99,
              cost: 120.00,
              tva: 19,
              inventory: 7,
              sku: "JACKET-BLK-L",
              options: { color: "Black", size: "L" },
            },
          ],
        },
      },
    });
    console.log(`Created product: ${product2.name} with variants`);

    // Check for existing subscription before creating a new one
    const existingSubscription = await prisma.subscription.findFirst({
      where: { shopId: advancedShop.id },
    });

    if (!existingSubscription) {
      // Create active subscription for Advanced plan
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(now.getFullYear() + 1);

      // Get Advanced plan pricing
      const advancedPricing = await prisma.planPricing.findFirst({
        where: { planType: "ADVANCED" },
      });

      if (advancedPricing) {
        // Calculate total amount with 12% discount for one year
        const discount = 12; // 12% discount for 1 year
        const totalAmount =
          advancedPricing.monthlyPrice * 12 * (1 - discount / 100);

        const advancedSubscription = await prisma.subscription.create({
          data: {
            shopId: advancedShop.id,
            userId: advancedAdmin.id,
            planPricingId: advancedPricing.id,
            startDate: now,
            endDate: oneYearLater,
            period: "ONE_YEAR",
            status: "ACTIVE",
            totalAmount: totalAmount,
            appliedDiscount: discount,
          },
        });

        // Create full payment
        const fullPayment = await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: advancedSubscription.id,
            amount: totalAmount,
            paymentDate: now,
            paymentMethod: "BANK_TRANSFER",
            status: "COMPLETED",
            transactionId: "TRX-ADV-123456",
            notes: "Full payment for 1 year",
          },
        });

        console.log(
          `Created active subscription for Advanced Shop with full payment`
        );
      }
    } else {
      console.log(
        `Subscription already exists for Advanced Shop: ${existingSubscription.id}`
      );
    }

    return { advancedShop, advancedAdmin };
  } catch (error) {
    console.error("Error in advancedShop fixture:", error);
    throw error;
  }
}

module.exports = { run };
