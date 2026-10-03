import type { NextFunction, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { poolDb } from '../db';
import { requestDbScope, type RequestDbScope } from '../db/requestScope';

/** Off unless DB_RLS=on, so the policies can be rolled out (and rolled back) without a deploy. */
export function rowLevelSecurityEnabled(): boolean {
  return process.env.DB_RLS === 'on';
}

/**
 * Runs the rest of a signed-in request in one transaction, as the restricted `tourbnt_app` role, with the
 * caller's id and admin flag set — so the database's row-level policies (drizzle/0021_row_level_security.sql)
 * apply on top of the API's own checks. Mount it after `authenticate`.
 *
 * The transaction commits before the response is sent, so a client that refetches right away sees its write.
 * Anything a handler leaves running after its response goes back to the plain pool.
 *
 * Only for routes whose handlers never need rows the caller can't see (no capacity counts across other
 * people's bookings, no public listings, no shared caches filled from the result).
 */
export function withRowLevelSecurity(req: Request, res: Response, next: NextFunction) {
  if (!rowLevelSecurityEnabled() || !req.user) return next();

  let handlerDone!: () => void;
  const finished = new Promise<void>((resolve) => { handlerDone = resolve; });
  let started = false;
  let scope: RequestDbScope | undefined;

  // Hold the response until the transaction has committed.
  const end = res.end.bind(res) as (...args: unknown[]) => Response;
  let ending = false;
  res.end = ((...args: unknown[]) => {
    if (ending) return res;
    ending = true;
    handlerDone();
    committed.then(
      () => end(...args),
      (err) => {
        console.error('Row-level security transaction failed:', (err as Error).message);
        // Nothing was saved (a failed query aborts the whole transaction), so the handler's reply is wrong.
        if (res.headersSent) return end();
        const body = JSON.stringify({ success: false, message: 'Internal server error' });
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.removeHeader('ETag');
        return end(body);
      },
    );
    return res;
  }) as Response['end'];
  // A dropped connection never reaches res.end; don't leave the transaction open.
  res.on('close', () => handlerDone());

  const committed = poolDb()
    .transaction(async (tx) => {
      await tx.execute(sql`select
        set_config('role', 'tourbnt_app', true),
        set_config('app.user_id', ${req.user!.id}, true),
        set_config('app.is_admin', ${req.user!.roles.includes('admin') ? 'on' : 'off'}, true)`);
      scope = { tx, done: false };
      started = true;
      requestDbScope.run(scope, () => next());
      await finished;
      // From here on, queries go to the pool: nothing new may be queued behind the COMMIT.
      scope.done = true;
    })
    .finally(() => {
      if (scope) scope.done = true;
    });

  // If the transaction couldn't even start, the handler never ran: report it the usual way.
  committed.catch((err) => {
    if (started) return;
    res.end = end as Response['end'];
    next(err);
  });
}
