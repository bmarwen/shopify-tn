// src/lib/serializer.ts

/**
 * Recursively transforms BigInt values to strings or numbers in an object
 * to make it safe for JSON serialization
 *
 * @param obj The object to transform
 * @returns A new object with BigInt values converted to strings or numbers
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle BigInt
  if (typeof obj === "bigint") {
    // Convert to number if it's within safe integer range, otherwise to string
    return Number.isSafeInteger(Number(obj)) ? Number(obj) : obj.toString();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  // Handle objects
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }

  // Return primitive values as is
  return obj;
}
