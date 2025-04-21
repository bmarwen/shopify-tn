// prisma/fixtures/run.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Create a single Prisma client instance
const prisma = new PrismaClient();
