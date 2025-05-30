// prisma/fixtures/systemLimits.js

async function run(prisma) {
  try {
    console.log("Creating/updating system limits...");

    // System limits configuration
    const systemLimits = [
      // Standard Plan Limits
      {
        codeName: 'STANDARD_DISCOUNTS_LIMIT',
        name: 'Standard Plan - Product Discounts Limit',
        description: 'Maximum number of active product discounts for Standard plan',
        value: 3,
        category: 'DISCOUNTS',
        planType: 'STANDARD',
        isActive: true,
      },
      {
        codeName: 'STANDARD_DISCOUNT_CODES_LIMIT',
        name: 'Standard Plan - Discount Codes Limit',
        description: 'Maximum number of active discount codes for Standard plan',
        value: 15,
        category: 'DISCOUNT_CODES',
        planType: 'STANDARD',
        isActive: true,
      },
      
      // Advanced Plan Limits
      {
        codeName: 'ADVANCED_DISCOUNTS_LIMIT',
        name: 'Advanced Plan - Product Discounts Limit',
        description: 'Maximum number of active product discounts for Advanced plan',
        value: 15,
        category: 'DISCOUNTS',
        planType: 'ADVANCED',
        isActive: true,
      },
      {
        codeName: 'ADVANCED_DISCOUNT_CODES_LIMIT',
        name: 'Advanced Plan - Discount Codes Limit',
        description: 'Maximum number of active discount codes for Advanced plan',
        value: 15,
        category: 'DISCOUNT_CODES',
        planType: 'ADVANCED',
        isActive: true,
      },
      
      // Premium Plan Limits (Unlimited = -1)
      {
        codeName: 'PREMIUM_DISCOUNTS_LIMIT',
        name: 'Premium Plan - Product Discounts Limit',
        description: 'Maximum number of active product discounts for Premium plan',
        value: -1, // -1 means unlimited
        category: 'DISCOUNTS',
        planType: 'PREMIUM',
        isActive: true,
      },
      {
        codeName: 'PREMIUM_DISCOUNT_CODES_LIMIT',
        name: 'Premium Plan - Discount Codes Limit',
        description: 'Maximum number of active discount codes for Premium plan',
        value: -1, // -1 means unlimited
        category: 'DISCOUNT_CODES',
        planType: 'PREMIUM',
        isActive: true,
      },

      // Future extensible limits
      {
        codeName: 'STANDARD_PRODUCTS_LIMIT',
        name: 'Standard Plan - Products Limit',
        description: 'Maximum number of products for Standard plan',
        value: 100,
        category: 'PRODUCTS',
        planType: 'STANDARD',
        isActive: true,
      },
      {
        codeName: 'ADVANCED_PRODUCTS_LIMIT',
        name: 'Advanced Plan - Products Limit',
        description: 'Maximum number of products for Advanced plan',
        value: 1000,
        category: 'PRODUCTS',
        planType: 'ADVANCED',
        isActive: true,
      },
      {
        codeName: 'PREMIUM_PRODUCTS_LIMIT',
        name: 'Premium Plan - Products Limit',
        description: 'Maximum number of products for Premium plan',
        value: -1, // Unlimited
        category: 'PRODUCTS',
        planType: 'PREMIUM',
        isActive: true,
      },
    ];

    // Check for existing system limits
    const existingLimits = await prisma.systemLimit.findMany();

    if (existingLimits.length > 0) {
      console.log("Updating existing system limits...");
      
      // Update or create each system limit
      for (const limit of systemLimits) {
        await prisma.systemLimit.upsert({
          where: {
            codeName: limit.codeName,
          },
          update: {
            name: limit.name,
            description: limit.description,
            value: limit.value,
            category: limit.category,
            planType: limit.planType,
            isActive: limit.isActive,
          },
          create: limit,
        });
        console.log(`✓ Updated/Created system limit: ${limit.codeName} (${limit.value === -1 ? 'Unlimited' : limit.value})`);
      }
    } else {
      console.log("Creating new system limits...");
      
      // Create all system limits
      for (const limit of systemLimits) {
        await prisma.systemLimit.create({
          data: limit,
        });
        console.log(`✓ Created system limit: ${limit.codeName} (${limit.value === -1 ? 'Unlimited' : limit.value})`);
      }
    }

    // Get all created/updated limits for return
    const allLimits = await prisma.systemLimit.findMany({
      orderBy: [
        { planType: 'asc' },
        { category: 'asc' },
      ],
    });

    console.log(`✅ System limits setup complete! Total limits: ${allLimits.length}`);
    
    // Group by plan for summary
    const limitsByPlan = allLimits.reduce((acc, limit) => {
      const plan = limit.planType || 'GLOBAL';
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(limit);
      return acc;
    }, {});

    console.log('\n📊 System Limits Summary:');
    Object.entries(limitsByPlan).forEach(([plan, limits]) => {
      console.log(`\n${plan} Plan:`);
      limits.forEach(limit => {
        console.log(`  • ${limit.category}: ${limit.value === -1 ? 'Unlimited' : limit.value}`);
      });
    });

    return allLimits;

  } catch (error) {
    console.error("Error in systemLimits fixture:", error);
    throw error;
  }
}

module.exports = { run };
