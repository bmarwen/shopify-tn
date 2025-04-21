// prisma/fixtures/categories.js
const { slugify } = require("../../src/lib/utils");

async function run(prisma) {
  // Get the shop
  const shop = await prisma.shop.findFirst({
    where: { subdomain: process.env.SHOP_SUBDOMAIN || "para" },
  });

  if (!shop) {
    throw new Error("Shop not found. Run shop fixtures first.");
  }

  // Clear existing data
  await prisma.category.deleteMany({});

  // Define categories
  const categoriesData = [
    { name: "Electronics", description: "Electronic devices and accessories" },
    { name: "Clothing", description: "Apparel and fashion accessories" },
    {
      name: "Home & Kitchen",
      description: "Products for your home and kitchen",
    },
    { name: "Books", description: "Books, e-books, and audiobooks" },
    { name: "Sports", description: "Sporting goods and equipment" },
  ];

  // Create categories
  const categories = [];
  for (const categoryData of categoriesData) {
    const category = await prisma.category.create({
      data: {
        name: categoryData.name,
        slug: slugify(categoryData.name),
        description: categoryData.description,
        shopId: shop.id,
      },
    });
    categories.push(category);
    console.log(`Created category: ${category.name}`);
  }

  // Define subcategories
  const subcategoriesData = [
    {
      parentName: "Electronics",
      name: "Smartphones",
      description: "Mobile phones and accessories",
    },
    {
      parentName: "Electronics",
      name: "Laptops",
      description: "Laptop computers and accessories",
    },
    {
      parentName: "Electronics",
      name: "Audio",
      description: "Headphones, speakers, and audio equipment",
    },
    {
      parentName: "Clothing",
      name: "Men",
      description: "Men's clothing and accessories",
    },
    {
      parentName: "Clothing",
      name: "Women",
      description: "Women's clothing and accessories",
    },
    {
      parentName: "Clothing",
      name: "Kids",
      description: "Children's clothing and accessories",
    },
    {
      parentName: "Home & Kitchen",
      name: "Furniture",
      description: "Home and office furniture",
    },
    {
      parentName: "Home & Kitchen",
      name: "Appliances",
      description: "Kitchen and home appliances",
    },
    {
      parentName: "Sports",
      name: "Fitness",
      description: "Fitness and exercise equipment",
    },
    {
      parentName: "Sports",
      name: "Outdoor",
      description: "Outdoor and camping gear",
    },
  ];

  // Create subcategories
  const subcategories = [];
  for (const subcategoryData of subcategoriesData) {
    const parentCategory = categories.find(
      (c) => c.name === subcategoryData.parentName
    );
    if (parentCategory) {
      const subcategory = await prisma.category.create({
        data: {
          name: subcategoryData.name,
          slug: slugify(subcategoryData.name),
          description: subcategoryData.description,
          shopId: shop.id,
          parentId: parentCategory.id,
        },
      });
      subcategories.push(subcategory);
      console.log(
        `Created subcategory: ${subcategory.name} (under ${parentCategory.name})`
      );
    }
  }

  // Create a third level of categories for demonstration
  const thirdLevelData = [
    {
      parentName: "Smartphones",
      name: "Android",
      description: "Android smartphones",
    },
    { parentName: "Smartphones", name: "iOS", description: "iOS smartphones" },
    { parentName: "Laptops", name: "Gaming", description: "Gaming laptops" },
    {
      parentName: "Laptops",
      name: "Business",
      description: "Business laptops",
    },
  ];

  for (const categoryData of thirdLevelData) {
    const parentCategory = subcategories.find(
      (c) => c.name === categoryData.parentName
    );
    if (parentCategory) {
      const category = await prisma.category.create({
        data: {
          name: categoryData.name,
          slug: slugify(categoryData.name),
          description: categoryData.description,
          shopId: shop.id,
          parentId: parentCategory.id,
        },
      });
      console.log(
        `Created third-level category: ${category.name} (under ${parentCategory.name})`
      );
    }
  }

  return { categories, subcategories };
}

module.exports = { run };
