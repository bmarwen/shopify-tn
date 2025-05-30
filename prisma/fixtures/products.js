// prisma/fixtures/products.js
const { slugify } = require("./utils");

async function run(prisma) {
  // Get the shop
  const shop = await prisma.shop.findFirst({
    where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
  });

  if (!shop) {
    throw new Error("Shop not found. Run shop fixtures first.");
  }

  // Get categories
  const categories = await prisma.category.findMany({
    where: { shopId: shop.id },
  });

  if (categories.length === 0) {
    throw new Error("No categories found. Run category fixtures first.");
  }

  // Clear existing products
  try {
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
  } catch (error) {
    console.warn("⚠️ Warning: Failed to delete existing products and products variants. Continuing...");
    console.error(error);
  }



  // Helper to find category by name
  const getCategoryByName = (name) => categories.find((c) => c.name === name);

  // Define products
  const productsData = [
    {
      name: "Smartphone X",
      description: "The latest smartphone with amazing features.",
      images: ["/assets/images/products/smartphone-x.jpg"],
      categories: ["Smartphones"],
      variants: [
        {
          name: "Black / 128GB",
          inventory: 20,
          price: 999.99,
          cost: 750.00,
          tva: 19,
          options: { color: "Black", storage: "128GB" },
        },
        {
          name: "Black / 256GB",
          inventory: 15,
          price: 1099.99,
          cost: 850.00,
          tva: 19,
          options: { color: "Black", storage: "256GB" },
        },
        {
          name: "White / 128GB",
          inventory: 10,
          price: 999.99,
          cost: 750.00,
          tva: 19,
          options: { color: "White", storage: "128GB" },
        },
        {
          name: "White / 256GB",
          inventory: 5,
          price: 1099.99,
          cost: 850.00,
          tva: 19,
          options: { color: "White", storage: "256GB" },
        },
      ],
    },
    {
      name: "Laptop Pro",
      description: "Powerful laptop for professionals.",
      images: ["/assets/images/products/laptop-pro.jpg"],
      categories: ["Laptops", "Business"],
      variants: [
        {
          name: "Silver / i5 / 8GB / 256GB",
          inventory: 15,
          price: 1499.99,
          cost: 1200.00,
          tva: 19,
          options: {
            color: "Silver",
            processor: "i5",
            ram: "8GB",
            storage: "256GB",
          },
        },
        {
          name: "Silver / i7 / 16GB / 512GB",
          inventory: 10,
          price: 1899.99,
          cost: 1500.00,
          tva: 19,
          options: {
            color: "Silver",
            processor: "i7",
            ram: "16GB",
            storage: "512GB",
          },
        },
        {
          name: "Space Gray / i5 / 8GB / 256GB",
          inventory: 5,
          price: 1499.99,
          cost: 1200.00,
          tva: 19,
          options: {
            color: "Space Gray",
            processor: "i5",
            ram: "8GB",
            storage: "256GB",
          },
        },
      ],
    },
    {
      name: "Wireless Headphones",
      description: "Premium wireless headphones with noise cancellation.",
      images: ["/assets/images/products/headphones.jpg"],
      categories: ["Audio"],
      variants: [
        {
          name: "Black",
          inventory: 50,
          price: 249.99,
          cost: 180.00,
          tva: 19,
          options: { color: "Black" },
        },
        {
          name: "White",
          inventory: 30,
          price: 249.99,
          cost: 180.00,
          tva: 19,
          options: { color: "White" },
        },
        {
          name: "Blue",
          inventory: 20,
          price: 259.99,
          cost: 190.00,
          tva: 19,
          options: { color: "Blue" },
        },
      ],
    },
    {
      name: "T-Shirt Basic",
      description: "Comfortable cotton t-shirt for everyday wear.",
      images: ["/assets/images/products/tshirt.jpg"],
      categories: ["Men", "Women"],
      variants: [
        {
          name: "White / S",
          inventory: 30,
          price: 24.99,
          cost: 15.00,
          tva: 19,
          options: { color: "White", size: "S" },
        },
        {
          name: "White / M",
          inventory: 40,
          price: 24.99,
          cost: 15.00,
          tva: 19,
          options: { color: "White", size: "M" },
        },
        {
          name: "White / L",
          inventory: 30,
          price: 24.99,
          cost: 15.00,
          tva: 19,
          options: { color: "White", size: "L" },
        },
        {
          name: "Black / S",
          inventory: 30,
          price: 24.99,
          cost: 15.00,
          tva: 19,
          options: { color: "Black", size: "S" },
        },
        {
          name: "Black / M",
          inventory: 40,
          price: 24.99,
          cost: 15.00,
          tva: 19,
          options: { color: "Black", size: "M" },
        },
        {
          name: "Black / L",
          inventory: 30,
          price: 24.99,
          cost: 15.00,
          tva: 19,
          options: { color: "Black", size: "L" },
        },
      ],
    },
    {
      name: "Coffee Table",
      description: "Modern coffee table for your living room.",
      images: ["/assets/images/products/coffee-table.jpg"],
      categories: ["Furniture"],
      variants: [
        {
          name: "Oak",
          inventory: 8,
          price: 199.99,
          cost: 120.00,
          tva: 19,
          options: { material: "Oak" },
        },
        {
          name: "Walnut",
          inventory: 7,
          price: 219.99,
          cost: 140.00,
          tva: 19,
          options: { material: "Walnut" },
        },
      ],
    },
    {
      name: "Yoga Mat",
      description: "Premium non-slip yoga mat for your practice.",
      images: ["/assets/images/products/yoga-mat.jpg"],
      categories: ["Fitness"],
      variants: [
        {
          name: "Purple",
          inventory: 30,
          price: 39.99,
          cost: 25.00,
          tva: 19,
          options: { color: "Purple" },
        },
        {
          name: "Blue",
          inventory: 30,
          price: 39.99,
          cost: 25.00,
          tva: 19,
          options: { color: "Blue" },
        },
        {
          name: "Green",
          inventory: 20,
          price: 39.99,
          cost: 25.00,
          tva: 19,
          options: { color: "Green" },
        },
      ],
    },
  ];

  // Create products
  const products = [];

  for (const productData of productsData) {
    // Find category IDs
    const categoryIds = productData.categories
      .map((categoryName) => {
        const category = getCategoryByName(categoryName);
        return category ? category.id : null;
      })
      .filter((id) => id !== null);

    // Create the product
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: slugify(productData.name),
        description: productData.description,
        images: productData.images,
        shopId: shop.id,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
      },
    });

    products.push(product);
    console.log(`Created product: ${product.name}`);

    // Create variants - required for all products now
    if (productData.variants && productData.variants.length > 0) {
      for (const variantData of productData.variants) {
        const variant = await prisma.productVariant.create({
          data: {
            name: variantData.name,
            price: variantData.price,
            cost: variantData.cost || null,
            tva: variantData.tva || 19,
            inventory: variantData.inventory,
            options: variantData.options,
            productId: product.id,
          },
        });
        console.log(`  - Created variant: ${variant.name}`);
      }
    } else {
      // If no variants defined, create a default variant
      const defaultVariant = await prisma.productVariant.create({
        data: {
          name: "Default",
          price: 0,
          tva: 19,
          inventory: 0,
          options: {},
          productId: product.id,
        },
      });
      console.log(`  - Created default variant: ${defaultVariant.name}`);
    }
  }

  return products;
}

module.exports = { run };
