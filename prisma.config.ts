import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrate/studio) uses the direct, non-pooled connection when available.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: url ?? "" },
});
