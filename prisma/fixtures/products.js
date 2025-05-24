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
      price: 999.99,
      inventory: 50,
      images: ["/assets/images/products/smartphone-x.jpg"],
      categories: ["Smartphones"],
      variants: [
        {
          name: "Black / 128GB",
          inventory: 20,
          options: { color: "Black", storage: "128GB" },
          price: 999.99,
        },
        {
          name: "Black / 256GB",
          inventory: 15,
          options: { color: "Black", storage: "256GB" },
          price: 1099.99,
        },
        {
          name: "White / 128GB",
          inventory: 10,
          options: { color: "White", storage: "128GB" },
          price: 999.99,
        },
        {
          name: "White / 256GB",
          inventory: 5,
          options: { color: "White", storage: "256GB" },
          price: 1099.99,
        },
      ],
    },
    {
      name: "Laptop Pro",
      description: "Powerful laptop for professionals.",
      price: 1499.99,
      inventory: 30,
      images: ["/assets/images/products/laptop-pro.jpg"],
      categories: ["Laptops", "Business"],
      variants: [
        {
          name: "Silver / i5 / 8GB / 256GB",
          inventory: 15,
          options: {
            color: "Silver",
            processor: "i5",
            ram: "8GB",
            storage: "256GB",
          },
          price: 1499.99,
        },
        {
          name: "Silver / i7 / 16GB / 512GB",
          inventory: 10,
          options: {
            color: "Silver",
            processor: "i7",
            ram: "16GB",
            storage: "512GB",
          },
          price: 1899.99,
        },
        {
          name: "Space Gray / i5 / 8GB / 256GB",
          inventory: 5,
          options: {
            color: "Space Gray",
            processor: "i5",
            ram: "8GB",
            storage: "256GB",
          },
          price: 1499.99,
        },
      ],
    },
    {
      name: "Wireless Headphones",
      description: "Premium wireless headphones with noise cancellation.",
      price: 249.99,
      inventory: 100,
      images: ["/assets/images/products/headphones.jpg"],
      categories: ["Audio"],
      variants: [
        {
          name: "Black",
          inventory: 50,
          options: { color: "Black" },
          price: 249.99,
        },
        {
          name: "White",
          inventory: 30,
          options: { color: "White" },
          price: 249.99,
        },
        {
          name: "Blue",
          inventory: 20,
          options: { color: "Blue" },
          price: 259.99,
        },
      ],
    },
    {
      name: "T-Shirt Basic",
      description: "Comfortable cotton t-shirt for everyday wear.",
      price: 24.99,
      inventory: 200,
      images: ["/assets/images/products/tshirt.jpg"],
      categories: ["Men", "Women"],
      variants: [
        {
          name: "White / S",
          inventory: 30,
          options: { color: "White", size: "S" },
          price: 24.99,
        },
        {
          name: "White / M",
          inventory: 40,
          options: { color: "White", size: "M" },
          price: 24.99,
        },
        {
          name: "White / L",
          inventory: 30,
          options: { color: "White", size: "L" },
          price: 24.99,
        },
        {
          name: "Black / S",
          inventory: 30,
          options: { color: "Black", size: "S" },
          price: 24.99,
        },
        {
          name: "Black / M",
          inventory: 40,
          options: { color: "Black", size: "M" },
          price: 24.99,
        },
        {
          name: "Black / L",
          inventory: 30,
          options: { color: "Black", size: "L" },
          price: 24.99,
        },
      ],
    },
    {
      name: "Coffee Table",
      description: "Modern coffee table for your living room.",
      price: 199.99,
      inventory: 15,
      images: ["/assets/images/products/coffee-table.jpg"],
      categories: ["Furniture"],
      variants: [
        {
          name: "Oak",
          inventory: 8,
          options: { material: "Oak" },
          price: 199.99,
        },
        {
          name: "Walnut",
          inventory: 7,
          options: { material: "Walnut" },
          price: 219.99,
        },
      ],
    },
    {
      name: "Yoga Mat",
      description: "Premium non-slip yoga mat for your practice.",
      price: 39.99,
      inventory: 80,
      images: ["/assets/images/products/yoga-mat.jpg"],
      categories: ["Fitness"],
      variants: [
        {
          name: "Purple",
          inventory: 30,
          options: { color: "Purple" },
          price: 39.99,
        },
        {
          name: "Blue",
          inventory: 30,
          options: { color: "Blue" },
          price: 39.99,
        },
        {
          name: "Green",
          inventory: 20,
          options: { color: "Green" },
          price: 39.99,
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
        price: productData.price,
        inventory: productData.inventory,
        images: productData.images,
        shopId: shop.id,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
      },
    });

    products.push(product);
    console.log(`Created product: ${product.name}`);

    // Create variants if they exist
    if (productData.variants && productData.variants.length > 0) {
      for (const variantData of productData.variants) {
        const variant = await prisma.productVariant.create({
          data: {
            name: variantData.name,
            price: variantData.price,
            inventory: variantData.inventory,
            options: variantData.options,
            productId: product.id,
          },
        });
        console.log(`  - Created variant: ${variant.name}`);
      }
    }
  }

  return products;
}

module.exports = { run };
