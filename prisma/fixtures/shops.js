// prisma/fixtures/shops.js
const { PlanType } = require("@prisma/client");

async function run(prisma) {
  // Clear existing data
  try {
    await prisma.shop.deleteMany({});
  } catch (error) {
    console.warn("⚠️ Warning: Failed to delete existing shops. Continuing...");
    console.error(error);
  }


  // Create shop
  const shop = await prisma.shop.create({
    data: {
      name: "Para Shop",
      subdomain: process.env.SHOP_SUBDOMAIN || "para",
      description: "A demo shop selling various products",
      planType: PlanType.STANDARD,
      logo: "/assets/logo.svg",
      active: true,
      settings: {
        create: {
          currency: "DT",
          language: "fr",
          timezone: "UTC",
          lowStockThreshold: 5,
          contactEmail: "contact@parashop.example",
          contactPhone: "+1234567890",
          address: "123 Shop Street, E-commerce City",
        },
      },
    },
  });

  console.log(`Created shop: ${shop.name} (${shop.subdomain})`);

  return shop;
}

module.exports = { run };
