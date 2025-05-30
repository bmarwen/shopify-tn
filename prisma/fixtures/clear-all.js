// Clear all data from database in proper order
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAll() {
  console.log('🗑️ Clearing all data from database...');
  
  try {
    // Clear in proper order to respect foreign key constraints
    const tables = [
      'invoice',
      'orderPayment', // New table
      'checkPayment',
      'orderItem',
      'order',
      'subscriptionPayment',
      'subscription', // Must be before users
      'cartItem',
      'cart',
      'review',
      'variantCustomFieldValue',
      'discount', // Clear discounts before variants and products
      'productVariant',
      'product',
      'customField',
      'discountCode',
      'address',
      'notification',
      'user', // After subscription
      'paymentMethod',
      'shippingMethod',
      'shopSettings',
      'category',
      'shop',
      'planPricing',
      'systemLimit' // Add system limits
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM \"${table}\";`);
        console.log(`✅ Cleared ${table}`);
      } catch (error) {
        if (error.code === 'P2021') {
          console.log(`⚠️ Table ${table} does not exist (this is normal for new tables)`);
        } else {
          console.log(`⚠️ Failed to clear ${table}: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  clearAll().catch(console.error);
}

module.exports = { clearAll };
