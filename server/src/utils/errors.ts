/**
 * Typed access to the parts of a thrown value we use. Anything can be thrown, so these take `unknown`.
 */

/** The message of an Error (or of anything carrying a string `message`). */
export const errorMessage = (err: unknown): string | undefined => {
  if (err instanceof Error) return err.message;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : undefined;
};

/** The HTTP status an error asks for (http-errors sets `status` and `statusCode`). */
export const errorStatus = (err: unknown): number | undefined => {
  const e = err as { status?: unknown; statusCode?: unknown } | null;
  const status = e?.statusCode ?? e?.status;
  return typeof status === 'number' ? status : undefined;
};

/** The fields of a Postgres error we use. */
export interface PostgresErrorFields {
  code?: string;
  detail?: string;
  constraint_name?: string;
}

/**
 * The Postgres error behind `err`: the error itself, or (as Drizzle reports them, "Failed query: ...")
 * the database error it wraps as `cause`.
 */
export const postgresErrorOf = (err: unknown): PostgresErrorFields | undefined => {
  for (let e: unknown = err, depth = 0; e && typeof e === 'object' && depth < 3; e = (e as { cause?: unknown }).cause, depth++) {
    const fields = e as PostgresErrorFields;
    if (typeof fields.code === 'string' && /^[0-9A-Z]{5}$/.test(fields.code)) return fields;
  }
  return undefined;
};

/** True for a unique-constraint violation (SQL state 23505). */
export const isUniqueViolation = (err: unknown): boolean => postgresErrorOf(err)?.code === '23505';
