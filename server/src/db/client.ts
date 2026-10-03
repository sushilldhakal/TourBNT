import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { requestDbScope } from './requestScope';

type Db = PostgresJsDatabase<typeof schema>;

let _sql: postgres.Sql | undefined;
let _db: Db | undefined;

/**
 * Lazily create the Postgres connection + Drizzle client.
 *
 * Lazy on purpose: DATABASE_URL is not set up yet (it will be provided
 * later), and the Express API needs to be able to
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
      // Opening a connection to the remote (Neon, us-east-2) database costs ~2.4s of TLS + auth
      // round trips, while a query on an open connection costs ~0.23s. Closing idle connections
      // after 20s meant almost every page after a short pause paid that 2.4s again (once per
      // parallel query). Keep them open; postgres.js still recycles each one after max_lifetime.
      idle_timeout: Number(process.env.DATABASE_IDLE_TIMEOUT_SECONDS || 0),
      max_lifetime: Number(process.env.DATABASE_MAX_LIFETIME_SECONDS || 60 * 30),
      connect_timeout: 10,
      // Opt-in profiling: DB_QUERY_LOG=/path/file appends one line per query (time, connection, SQL).
      ...(process.env.DB_QUERY_LOG
        ? {
            debug: (connection: number, query: string) => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('fs').appendFileSync(process.env.DB_QUERY_LOG!, `${Date.now()} c${connection} ${query.replace(/\s+/g, ' ').slice(0, 160)}\n`);
              } catch { /* ignore */ }
            },
          }
        : {}),
    });
  }

  if (!_db) {
    // Drizzle runs every query through postgres.js `unsafe()`, whose default is `prepare: false`.
    // Unprepared statements with parameters cost an extra round trip (Describe, then Execute) — on
    // this remote database that is ~230ms added to EVERY query. With `prepare: true` postgres.js
    // caches the statement per connection, so repeats are a single round trip. Neon's PgBouncer
    // pooler supports protocol-level prepared statements. Set DATABASE_PREPARE=false to disable.
    const base = _sql;
    const client =
      process.env.DATABASE_PREPARE === 'false'
        ? base
        : (new Proxy(base, {
            get(target, prop, receiver) {
              if (prop === 'unsafe') {
                return (query: string, params?: unknown[], options?: Record<string, unknown>) =>
                  (target.unsafe as any)(query, params, { prepare: true, ...options });
              }
              return Reflect.get(target, prop, receiver);
            },
          }) as postgres.Sql);
    _db = drizzle(client, { schema });
  }

  return _db;
}

/**
 * Proxy so `import { db } from './db'` works everywhere, while the
 * real connection is only established on first use (see createDb above).
 * Inside a request running under row-level security it is that request's transaction instead
 * (see requestScope.ts), so existing code needs no changes to be covered by the policies.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const scope = requestDbScope.getStore();
    const instance = (scope && !scope.done ? scope.tx : createDb()) as object;
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
}) as Db;

/** The pool itself, never a request's transaction. For starting a request's transaction. */
export function poolDb(): Db {
  return createDb();
}

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

/**
 * Opens `count` pool connections up front (parallel `select 1`s), so the first real requests
 * don't each pay the ~2.4s connection handshake. Best-effort: failures are only logged.
 */
export async function warmDb(count = 5): Promise<void> {
  createDb();
  const sql = _sql!;
  try {
    await Promise.all(Array.from({ length: Math.max(1, count) }, () => sql`select 1`));
  } catch (err) {
    console.error('DB warm-up failed:', (err as Error).message);
  }
}

/**
 * Keeps `count` connections (and the Neon compute) warm by re-running warmDb every `intervalMs`.
 * Note: this prevents Neon's scale-to-zero while the API is running. Returns a stop function.
 */
export function startDbKeepAlive(intervalMs = 60_000, count = 5): () => void {
  const timer = setInterval(() => { void warmDb(count); }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export type { Db };
