import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The database transaction a request runs in when row-level security is on for it (see
 * middlewares/rowLevelSecurity.ts). While a scope is open, the shared `db` sends every query
 * through `tx`, so the policies see who is asking. `done` is set once the transaction has
 * finished: work a handler leaves running after its response falls back to the plain pool.
 */
export interface RequestDbScope {
  tx: unknown;
  done: boolean;
}

export const requestDbScope = new AsyncLocalStorage<RequestDbScope>();
