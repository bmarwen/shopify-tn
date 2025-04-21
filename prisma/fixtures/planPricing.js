// prisma/fixtures/planPricing.js
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
    // Get the shop
    const shop = await prisma.shop.findFirst({
      where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
    });

    if (!shop) {
      throw new Error("Shop not found. Run shop fixtures first.");
    }

    // Check for existing plan pricing before clearing
    const existingPricings = await prisma.planPricing.findMany();

    // If we have existing plan pricings, just update them instead of deleting and recreating
    if (existingPricings.length > 0) {
      console.log("Updating existing plan pricing records");

      // Update standard pricing
      const standardPricing = await prisma.planPricing.upsert({
        where: {
          planType: "STANDARD",
        },
        update: {
          monthlyPrice: 69.0, // Tunisian Dinar
        },
        create: {
          planType: "STANDARD",
          monthlyPrice: 69.0, // Tunisian Dinar
        },
      });

      // Update advanced pricing
      const advancedPricing = await prisma.planPricing.upsert({
        where: {
          planType: "ADVANCED",
        },
        update: {
          monthlyPrice: 129.0, // Tunisian Dinar
        },
        create: {
          planType: "ADVANCED",
          monthlyPrice: 129.0, // Tunisian Dinar
        },
      });

      // Update premium pricing
      const premiumPricing = await prisma.planPricing.upsert({
        where: {
          planType: "PREMIUM",
        },
        update: {
          monthlyPrice: 249.0, // Tunisian Dinar
        },
        create: {
          planType: "PREMIUM",
          monthlyPrice: 249.0, // Tunisian Dinar
        },
      });

      console.log(
        `Updated plan pricing: Standard (${standardPricing.monthlyPrice} TND/month)`
      );
      console.log(
        `Updated plan pricing: Advanced (${advancedPricing.monthlyPrice} TND/month)`
      );
      console.log(
        `Updated plan pricing: Premium (${premiumPricing.monthlyPrice} TND/month)`
      );

      return { standardPricing, advancedPricing, premiumPricing };
    } else {
      // Create new plan pricing
      console.log("Creating new plan pricing records");

      // Create plan pricing
      const standardPricing = await prisma.planPricing.create({
        data: {
          planType: "STANDARD",
          monthlyPrice: 69.0, // Tunisian Dinar
        },
      });

      const advancedPricing = await prisma.planPricing.create({
        data: {
          planType: "ADVANCED",
          monthlyPrice: 129.0, // Tunisian Dinar
        },
      });

      const premiumPricing = await prisma.planPricing.create({
        data: {
          planType: "PREMIUM",
          monthlyPrice: 249.0, // Tunisian Dinar
        },
      });

      console.log(
        `Created plan pricing: Standard (${standardPricing.monthlyPrice} TND/month)`
      );
      console.log(
        `Created plan pricing: Advanced (${advancedPricing.monthlyPrice} TND/month)`
      );
      console.log(
        `Created plan pricing: Premium (${premiumPricing.monthlyPrice} TND/month)`
      );

      return { standardPricing, advancedPricing, premiumPricing };
    }
  } catch (error) {
    console.error("Error in planPricing fixture:", error);
    throw error;
  }
}

module.exports = { run };
