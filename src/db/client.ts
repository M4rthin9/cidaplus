import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * A small pool on purpose. One Next.js process does not need 50 connections,
 * and every idle backend reserves work_mem on a 6 GB box (SPEC.md §2).
 */
const POOL_MAX = 10;

declare global {
  var __cidaSql: ReturnType<typeof postgres> | undefined;
}

function createClient(url: string) {
  return postgres(url, { max: POOL_MAX, prepare: false });
}

/** Reused across HMR reloads in dev so `next dev` does not exhaust the pool. */
const sql =
  globalThis.__cidaSql ??
  createClient(process.env.DATABASE_URL ?? "postgres://localhost:5432/postgres");

if (process.env.NODE_ENV !== "production") globalThis.__cidaSql = sql;

export const db = drizzle(sql, { schema });
export { sql, schema };
export type Database = typeof db;
