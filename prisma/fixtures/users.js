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
    await prisma.user.deleteMany({});
  } catch (error) {
    console.warn("⚠️ Warning: Failed to delete existing users. Continuing...");
    console.error(error);
  }

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPassword,
      name: "Admin User",
      role: "SHOP_ADMIN",
      shopId: shop.id,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 10);
  const staff = await prisma.user.create({
    data: {
      email: "staff@example.com",
      password: staffPassword,
      name: "Staff User",
      role: "SHOP_STAFF",
      shopId: shop.id,
    },
  });

  console.log(`Created staff user: ${staff.email}`);

  // Create customer users
  const customerPassword = await bcrypt.hash("customer123", 10);

  const customers = [];
  for (let i = 1; i <= 5; i++) {
    const customer = await prisma.user.create({
      data: {
        email: `customer${i}@example.com`,
        password: customerPassword,
        name: `Customer ${i}`,
        role: "CUSTOMER",
        shopId: shop.id,
      },
    });
    customers.push(customer);

    // Create address for customer
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
  }

  console.log(`Created ${customers.length} customer users`);

  return { admin, staff, customers };
}

module.exports = { run };
