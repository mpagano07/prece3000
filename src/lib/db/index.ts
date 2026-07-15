import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

let _db: any = null

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_UNPOOLED_URL || process.env.DATABASE_URL
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    const sql = neon(url)
    _db = drizzle(sql, { schema })
  }
  return _db
}

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy({} as any, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})
