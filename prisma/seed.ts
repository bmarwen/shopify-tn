import { PrismaClient, PlanType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create the shop
  const shop = await prisma.shop.upsert({
    where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
    update: {},
    create: {
      name: "Para Shop",
      subdomain: process.env.SHOP_SUBDOMAIN || "para",
      description: "Your description here",
      planType: PlanType.STANDARD,
      logo: "/assets/logo.svg",
    },
  });

  // Create shop settings
  await prisma.shopSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      currency: "DT",
      language: "en",
      timezone: "UTC",
      lowStockThreshold: 5,
      contactEmail: "contact@example.com",
      contactPhone: "+1234567890",
      address: "123 Main St, New York, NY 10001",
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash("adminpassword", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
      role: "SHOP_ADMIN",
      shopId: shop.id,
    },
  });

  // Create a sample customer
  const customerPassword = await bcrypt.hash("customerpassword", 10);
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      password: customerPassword,
      name: "Sample Customer",
      role: "CUSTOMER",
      shopId: shop.id,
    },
  });

  // Create sample categories
  const category1 = await prisma.category.upsert({
    where: {
      shopId_slug: {
        shopId: shop.id,
        slug: "electronics",
      },
    },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
      description: "Electronic products and gadgets",
      shopId: shop.id,
    },
  });

  const category2 = await prisma.category.upsert({
    where: {
      shopId_slug: {
        shopId: shop.id,
        slug: "clothing",
      },
    },
    update: {},
    create: {
      name: "Clothing",
      slug: "clothing",
      description: "Apparel and accessories",
      shopId: shop.id,
    },
  });

  // Create sample subcategory
  const subcategory = await prisma.category.upsert({
    where: {
      shopId_slug: {
        shopId: shop.id,
        slug: "smartphones",
      },
    },
    update: {},
    create: {
      name: "Smartphones",
      slug: "smartphones",
      description: "Mobile phones and accessories",
      shopId: shop.id,
      parentId: category1.id,
    },
  });

  // Create sample products
  const product1 = await prisma.product.upsert({
    where: {
      shopId_slug: {
        shopId: shop.id,
        slug: "smartphone-x",
      },
    },
    update: {},
    create: {
      name: "Smartphone X",
      slug: "smartphone-x",
      description: "The latest smartphone with amazing features.",
      price: 999.99,
      inventory: 50,
      images: ["/assets/images/products/smartphone-x.jpg"],
      shopId: shop.id,
      categories: {
        connect: [{ id: subcategory.id }],
      },
    },
  });

  const product2 = await prisma.product.upsert({
    where: {
      shopId_slug: {
        shopId: shop.id,
        slug: "t-shirt-basic",
      },
    },
    update: {},
    create: {
      name: "Basic T-Shirt",
      slug: "t-shirt-basic",
      description: "Comfortable cotton t-shirt for everyday wear.",
      price: 24.99,
      inventory: 100,
      images: ["/assets/images/products/tshirt.jpg"],
      shopId: shop.id,
      categories: {
        connect: [{ id: category2.id }],
      },
    },
  });

  // Create product variants
  await prisma.productVariant.upsert({
    where: { id: "variant-tshirt-red-m" },
    update: {},
    create: {
      id: "variant-tshirt-red-m",
      name: "Red / Medium",
      price: 24.99,
      inventory: 30,
      options: { color: "Red", size: "M" },
      productId: product2.id,
    },
  });

  await prisma.productVariant.upsert({
    where: { id: "variant-tshirt-blue-m" },
    update: {},
    create: {
      id: "variant-tshirt-blue-m",
      name: "Blue / Medium",
      price: 24.99,
      inventory: 25,
      options: { color: "Blue", size: "M" },
      productId: product2.id,
    },
  });

  await prisma.productVariant.upsert({
    where: { id: "variant-tshirt-red-l" },
    update: {},
    create: {
      id: "variant-tshirt-red-l",
      name: "Red / Large",
      price: 24.99,
      inventory: 25,
      options: { color: "Red", size: "L" },
      productId: product2.id,
    },
  });

  await prisma.productVariant.upsert({
    where: { id: "variant-tshirt-blue-l" },
    update: {},
    create: {
      id: "variant-tshirt-blue-l",
      name: "Blue / Large",
      price: 24.99,
      inventory: 20,
      options: { color: "Blue", size: "L" },
      productId: product2.id,
    },
  });

  console.log("Database has been seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
