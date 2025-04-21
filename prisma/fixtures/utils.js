/**
 * Converts a string to a URL-friendly slug
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

/**
 * Generates a random order number
 */
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * Gets a random item from an array
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generates a random date in the past N days
 */
function getRandomDate(daysAgo = 30) {
  const now = new Date();
  const pastDays = Math.floor(Math.random() * daysAgo);
  const pastDate = new Date(now);
  pastDate.setDate(now.getDate() - pastDays);
  return pastDate;
}

module.exports = {
  slugify,
  generateOrderNumber,
  getRandomItem,
  getRandomDate,
};
