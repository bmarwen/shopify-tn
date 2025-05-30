// prisma/fixtures/discounts.js

async function run(prisma) {
  try {
    console.log("Creating sample discounts and discount codes...");

    // Get the shop
    const shop = await prisma.shop.findFirst({
      where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
    });

    if (!shop) {
      throw new Error("Shop not found. Run shop fixtures first.");
    }

    // Get some products with variants to create discounts for
    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      include: {
        variants: {
          take: 2 // Get first 2 variants for testing
        }
      },
      take: 5,
    });

    if (products.length === 0) {
      console.log("No products found. Skipping discount creation.");
      return { discounts: [], discountCodes: [] };
    }

    // Get a category for category-based discount codes
    const category = await prisma.category.findFirst({
      where: { shopId: shop.id },
    });

    // Clear existing discounts for this shop (optional)
    await prisma.discount.deleteMany({
      where: {
        OR: [
          { product: { shopId: shop.id } },
          { variant: { product: { shopId: shop.id } } }
        ]
      },
    });
    await prisma.discountCode.deleteMany({
      where: { shopId: shop.id },
    });

    console.log("Creating product discounts...");

    // Create sample product discounts
    const discounts = [];
    
    if (products.length > 0) {
      // Online-only discount
      const onlineDiscount = await prisma.discount.create({
        data: {
          productId: products[0].id,
          percentage: 15,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          availableOnline: true,
          availableInStore: false,
          enabled: true,
        },
        include: {
          product: { select: { name: true } },
        },
      });
      discounts.push(onlineDiscount);
      console.log(`✓ Created online-only discount: ${onlineDiscount.percentage}% off ${onlineDiscount.product.name}`);
    }

    if (products.length > 1) {
      // In-store only discount
      const inStoreDiscount = await prisma.discount.create({
        data: {
          productId: products[1].id,
          percentage: 10,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          availableOnline: false,
          availableInStore: true,
          enabled: true,
        },
        include: {
          product: { select: { name: true } },
        },
      });
      discounts.push(inStoreDiscount);
      console.log(`✓ Created in-store only discount: ${inStoreDiscount.percentage}% off ${inStoreDiscount.product.name}`);
    }

    if (products.length > 2) {
      // Both online and in-store discount
      const universalDiscount = await prisma.discount.create({
        data: {
          productId: products[2].id,
          percentage: 20,
          startDate: new Date(),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          availableOnline: true,
          availableInStore: true,
          enabled: true,
        },
        include: {
          product: { select: { name: true } },
        },
      });
      discounts.push(universalDiscount);
      console.log(`✓ Created universal discount: ${universalDiscount.percentage}% off ${universalDiscount.product.name}`);
    }

    // Create variant-specific discount if we have variants
    if (products.length > 3 && products[3].variants.length > 0) {
      const variantDiscount = await prisma.discount.create({
        data: {
          variantId: products[3].variants[0].id, // Target specific variant
          percentage: 25,
          title: "Variant Special",
          description: "Special discount on specific variant",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          availableOnline: true,
          availableInStore: true,
          enabled: true,
        },
        include: {
          variant: {
            select: {
              name: true,
              product: { select: { name: true } }
            }
          },
        },
      });
      discounts.push(variantDiscount);
      console.log(`✓ Created variant-specific discount: ${variantDiscount.percentage}% off ${variantDiscount.variant.product.name} - ${variantDiscount.variant.name}`);
    }

    console.log("Creating discount codes...");

    const discountCodes = [];

    // Global discount code (applies to all products)
    const globalCode = await prisma.discountCode.create({
      data: {
        code: "WELCOME10",
        percentage: 10,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        shopId: shop.id,
        availableOnline: true,
        availableInStore: true,
        isActive: true,
        // No products or category = applies to all
      },
    });
    discountCodes.push(globalCode);
    console.log(`✓ Created global discount code: ${globalCode.code} (${globalCode.percentage}% off all products)`);

    // Multi-product discount code
    if (products.length >= 3) {
      const multiProductCode = await prisma.discountCode.create({
        data: {
          code: "MULTI15",
          percentage: 15,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          shopId: shop.id,
          availableOnline: true,
          availableInStore: false, // Online only
          isActive: true,
          products: {
            connect: [
              { id: products[0].id },
              { id: products[1].id },
              { id: products[2].id },
            ],
          },
        },
        include: {
          products: { select: { name: true } },
        },
      });
      discountCodes.push(multiProductCode);
      console.log(`✓ Created multi-product discount code: ${multiProductCode.code} (${multiProductCode.percentage}% off ${multiProductCode.products.length} products)`);
    }

    // Category-based discount code
    if (category) {
      const categoryCode = await prisma.discountCode.create({
        data: {
          code: "CATEGORY20",
          percentage: 20,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          shopId: shop.id,
          availableOnline: true,
          availableInStore: true,
          isActive: true,
          categoryId: category.id,
        },
        include: {
          category: { select: { name: true } },
        },
      });
      discountCodes.push(categoryCode);
      console.log(`✓ Created category discount code: ${categoryCode.code} (${categoryCode.percentage}% off ${categoryCode.category.name} category)`);
    }

    // POS-only discount code
    const posOnlyCode = await prisma.discountCode.create({
      data: {
        code: "STORE25",
        percentage: 25,
        startDate: new Date(),
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        shopId: shop.id,
        availableOnline: false,
        availableInStore: true, // POS/In-store only
        isActive: true,
      },
    });
    discountCodes.push(posOnlyCode);
    console.log(`✓ Created POS-only discount code: ${posOnlyCode.code} (${posOnlyCode.percentage}% off, in-store only)`);

    // Seasonal discount code
    const seasonalCode = await prisma.discountCode.create({
      data: {
        code: "WINTER2024",
        percentage: 30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        shopId: shop.id,
        availableOnline: true,
        availableInStore: true,
        isActive: true,
      },
    });
    discountCodes.push(seasonalCode);
    console.log(`✓ Created seasonal discount code: ${seasonalCode.code} (${seasonalCode.percentage}% off all products)`);

    // Variant-specific discount code
    if (products.length > 3 && products[3].variants.length > 0) {
      const variantCode = await prisma.discountCode.create({
        data: {
          code: "VARIANT30",
          percentage: 30,
          startDate: new Date(),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          shopId: shop.id,
          availableOnline: true,
          availableInStore: true,
          isActive: true,
          variants: {
            connect: [
              { id: products[3].variants[0].id },
              ...(products[3].variants.length > 1 ? [{ id: products[3].variants[1].id }] : [])
            ],
          },
        },
        include: {
          variants: {
            select: {
              name: true,
              product: { select: { name: true } }
            }
          },
        },
      });
      discountCodes.push(variantCode);
      console.log(`✓ Created variant-specific discount code: ${variantCode.code} (${variantCode.percentage}% off ${variantCode.variants.length} variants)`);
    }

    console.log(`\n✅ Discounts setup complete!`);
    console.log(`📊 Summary:`);
    console.log(`  • Product Discounts: ${discounts.length}`);
    console.log(`  • Discount Codes: ${discountCodes.length}`);
    console.log(`\n🎟️  Discount Codes Created:`);
    discountCodes.forEach(code => {
      const availability = [];
      if (code.availableOnline) availability.push('Online');
      if (code.availableInStore) availability.push('In-Store');
      console.log(`  • ${code.code}: ${code.percentage}% off (${availability.join(' & ')})`);
    });

    return { discounts, discountCodes };

  } catch (error) {
    console.error("Error in discounts fixture:", error);
    throw error;
  }
}

module.exports = { run };
