import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DbType = NeonHttpDatabase<typeof schema> & {
  $client: NeonQueryFunction<false, false>;
};

// Create a lazy-initialized database connection
// This allows the build to succeed even without DATABASE_URL
function createDb(): DbType {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Please set it in your .env.local file or Vercel environment variables."
    );
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

// Lazy singleton pattern
let _db: DbType | null = null;

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    if (!_db) {
      _db = createDb();
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export * from "./schema";
