// prisma/fixtures/run.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function runFixtures() {
  console.log("🔧 Running all fixtures...");

  // Get all fixture files excluding this runner
  const fixtureFiles = fs
    .readdirSync(__dirname)
    .filter((file) => file !== "run.js" && file.endsWith(".js"));

  // Run fixtures sequentially in a specific order
  // This is important because some fixtures might depend on others
  const fixtureOrder = [
    "shops.js",
    "users.js",
    "categories.js",
    "products.js",
    "orders.js",
    // Add other fixtures in the order they should run
  ];

  // Filter out files that don't exist
  const orderedFixtures = fixtureOrder.filter((file) =>
    fixtureFiles.includes(file)
  );

  // Add any remaining fixtures not explicitly ordered
  const remainingFixtures = fixtureFiles.filter(
    (file) => !orderedFixtures.includes(file)
  );

  const allFixtures = [...orderedFixtures, ...remainingFixtures];

  for (const file of allFixtures) {
    const fixtureName = file.replace(".js", "");
    console.log(`📦 Running ${fixtureName} fixture...`);

    try {
      // Import and run the fixture
      const fixture = require(path.join(__dirname, file));
      await fixture.run(prisma);
      console.log(`✅ ${fixtureName} fixture completed`);
    } catch (error) {
      console.error(`❌ Error in ${fixtureName} fixture:`, error);
      // Continue with other fixtures even if one fails
    }
  }

  console.log("✨ All fixtures completed!");
  await prisma.$disconnect();
}

runFixtures().catch((e) => {
  console.error("Error running fixtures:", e);
  prisma.$disconnect();
  process.exit(1);
});
