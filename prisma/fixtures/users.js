// prisma/fixtures/users.js
const bcrypt = require("bcryptjs");

async function run(prisma) {
  // Get the shop
  const shop = await prisma.shop.findFirst({
    where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
  });

  if (!shop) {
    throw new Error("Shop not found. Run shop fixtures first.");
  }

  try {
    console.log("Creating users (skipping clearing - handled by clear-all.js)...");
  } catch (error) {
    console.warn("⚠️ Warning: Failed to delete existing data. Continuing...");
    console.error(error);
  }

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  let admin;
  try {
    admin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        password: adminPassword,
        name: "Admin User",
        role: "SHOP_ADMIN",
        shopId: shop.id,
      },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
  } catch (error) {
    if (error.code === 'P2002') {
      // User already exists, find them
      admin = await prisma.user.findUnique({
        where: { email: "admin@example.com" }
      });
      console.log(`⚠️ Admin user already exists: ${admin.email}`);
    } else {
      throw error;
    }
  }

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 10);
  let staff;
  try {
    staff = await prisma.user.create({
      data: {
        email: "staff@example.com",
        password: staffPassword,
        name: "Staff User",
        role: "SHOP_STAFF",
        shopId: shop.id,
      },
    });
    console.log(`✅ Created staff user: ${staff.email}`);
  } catch (error) {
    if (error.code === 'P2002') {
      staff = await prisma.user.findUnique({
        where: { email: "staff@example.com" }
      });
      console.log(`⚠️ Staff user already exists: ${staff.email}`);
    } else {
      throw error;
    }
  }

  // Create customer users
  const customerPassword = await bcrypt.hash("customer123", 10);
  const customers = [];
  
  for (let i = 1; i <= 5; i++) {
    const email = `customer${i}@example.com`;
    let customer;
    
    try {
      customer = await prisma.user.create({
        data: {
          email,
          password: customerPassword,
          name: `Customer ${i}`,
          role: "CUSTOMER",
          shopId: shop.id,
        },
      });
      console.log(`✅ Created customer user: ${customer.email}`);
    } catch (error) {
      if (error.code === 'P2002') {
        customer = await prisma.user.findUnique({
          where: { email }
        });
        console.log(`⚠️ Customer user already exists: ${customer.email}`);
      } else {
        throw error;
      }
    }
    
    customers.push(customer);

    // Create address for customer (check if exists first)
    const existingAddress = await prisma.address.findFirst({
      where: { userId: customer.id }
    });
    
    if (!existingAddress) {
      await prisma.address.create({
        data: {
          userId: customer.id,
          name: `Customer ${i}`,
          line1: `${100 + i} Customer Street`,
          city: "Customertown",
          state: "CS",
          postalCode: `1000${i}`,
          country: "Customerland",
          isDefault: true,
        },
      });
      console.log(`✅ Created address for customer ${i}`);
    }
  }

  console.log(`✅ Created/verified ${customers.length} customer users`);

  return { admin, staff, customers };
}

module.exports = { run };
