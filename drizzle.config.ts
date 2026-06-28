import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit leest standaard alleen .env, niet .env.local — expliciet inladen.
config({ path: ".env.local" });

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
