import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { db } from "./db"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import * as schema from "./db/schema"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
  plugins: [
    admin(),
  ],
})

export type Session = typeof auth.$Infer.Session
