import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

let _sql: postgres.Sql | undefined;
let _db: Db | undefined;

/**
 * Lazily create the Postgres connection + Drizzle client.
 *
 * Lazy on purpose: DATABASE_URL is not set up yet (it will be provided
 * later), and both the Next.js app and the Express API need to be able to
 * boot / build without a live database. The connection is only opened the
 * first time a route handler or controller actually queries the database.
 */
function createDb(): Db {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it to your environment (see .env.example) — ' +
      'it should point at your Postgres instance, e.g. postgres://user:password@host:5432/tourbnt'
    );
  }

  if (!_sql) {
    _sql = postgres(connectionString, {
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  if (!_db) {
    _db = drizzle(_sql, { schema });
  }

  return _db;
}

/**
 * Proxy so `import { db } from '@tourbnt/db'` works everywhere, while the
 * real connection is only established on first use (see createDb above).
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = createDb();
    return Reflect.get(instance as object, prop, receiver);
  },
}) as Db;

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = undefined;
    _db = undefined;
  }
}

export async function pingDb(): Promise<boolean> {
  const instance = createDb();
  await instance.execute(/* sql */ 'select 1');
  return true;
}

export type { Db };
