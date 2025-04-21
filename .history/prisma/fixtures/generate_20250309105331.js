// prisma/fixtures/generate.js
const fs = require("fs");
const path = require("path");

// Get fixture name from command line
const fixtureName = process.argv[2];

if (!fixtureName) {
  console.error("Please provide a fixture name");
  console.log("Usage: node prisma/fixtures/generate.js <fixtureName>");
  process.exit(1);
}

// Convert to camelCase and sanitize
const sanitizedName = fixtureName
  .toLowerCase()
  .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());

// Template for fixture file
const fixtureTemplate = `// prisma/fixtures/${sanitizedName}.js

/**
 * Fixture for ${fixtureName}
 */
async function run(prisma) {
  // Get the shop
  const shop = await prisma.shop.findFirst({
    where: { subdomain: process.env.SHOP_SUBDOMAIN || 'para' },
  });
  
  if (!shop) {
    throw new Error('Shop not found. Run shop fixtures first.');
  }
  
  // Clear existing data
  await prisma.${sanitizedName}.deleteMany({});
  
  // Create your fixture data here
  const items = [];
  
  // Example item
  const item = await prisma.${sanitizedName}.create({
    data: {
      // Add your model fields here
      shopId: shop.id,
    },
  });
  
  items.push(item);
  console.log(\`Created ${sanitizedName}: \${item.id}\`);
  
  return items;
}

module.exports = { run };
`;

// Write the file
const filePath = path.join(__dirname, `${sanitizedName}.js`);

try {
  fs.writeFileSync(filePath, fixtureTemplate);
  console.log(`✅ Fixture template created at: ${filePath}`);
  console.log(`🚀 Edit the file to add your ${fixtureName} fixture data`);
} catch (error) {
  console.error(`❌ Error creating fixture file:`, error);
  process.exit(1);
}
