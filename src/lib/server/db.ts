import "server-only";
import postgres from "postgres";
import { env } from "./env";

/**
 * A single lazily-created Postgres client. Works with Neon (Vercel
 * Marketplace), Supabase, or any Postgres — use the pooled connection
 * string on serverless hosts. No connection is opened at build time.
 */

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __dashbordSql?: Sql };

export function hasDatabase(): boolean {
  return Boolean(env.databaseUrl);
}

export function db(): Sql {
  const url = env.databaseUrl;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!globalForDb.__dashbordSql) {
    globalForDb.__dashbordSql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // compatible with transaction-mode poolers (Neon/Supabase)
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
  }
  return globalForDb.__dashbordSql;
}

/** The single personal account. The schema keys everything by user id so a
 * multi-user model can be added later without migrations of existing rows. */
export const OWNER_ID = "owner";
