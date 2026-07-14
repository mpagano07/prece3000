import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./neon/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_UNPOOLED_URL!,
  },
})
