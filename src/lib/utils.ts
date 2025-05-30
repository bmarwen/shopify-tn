// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "DT", symbol?: string): string {
  // Default symbols for common currencies
  const currencySymbols: Record<string, string> = {
    DT: "DT", // Tunisian Dinar
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    CHF: "CHF",
    CNY: "¥",
    INR: "₹",
  };

  const currencySymbol = symbol || currencySymbols[currency] || currency;
  
  // Format number with 2 decimal places
  const formattedAmount = Number(amount).toFixed(2);
  
  // For DT, put symbol after the amount
  if (currency === "DT") {
    return `${formattedAmount} ${currencySymbol}`;
  }
  
  // For other currencies, put symbol before
  return `${currencySymbol}${formattedAmount}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `ORD-${year}${month}${day}-${random}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

export function getInitials(name: string): string {
  if (!name) return "";

  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * Convert an image key/path to a full S3 URL
 * Handles various formats: S3 keys, full URLs, relative paths
 */
export function getImageUrl(image: string): string {
  if (!image) return '/images/placeholder.svg';
  
  // If it's already a full URL, use it
  if (image.startsWith('http')) {
    return image;
  }
  
  // If it's a relative path starting with /assets/ (old format), use placeholder
  if (image.startsWith('/assets/') || image.startsWith('./assets/') || image.startsWith('../assets/')) {
    return '/images/placeholder.svg';
  }
  
  // If it's an S3 key (like products/filename), build full URL
  if (image.includes('/') && !image.startsWith('/')) {
    return `https://shopify-tn-images-dev.s3.eu-west-3.amazonaws.com/${image}`;
  }
  
  // Fallback: assume it's in products folder
  return `https://shopify-tn-images-dev.s3.eu-west-3.amazonaws.com/products/${image}`;
}
