import { NextResponse } from 'next/server';

/**
 * Response envelope helpers for Next.js route handlers, matching the
 * `{ success, data|items, message }` contract already used by the Express
 * API (see server/src/utils/apiResponse.ts) so the frontend's
 * `extractResponseData` helper works unchanged against either backend.
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export function sendSuccess(data: unknown, message = 'Success', status: number = HTTP_STATUS.OK) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export function sendPaginated(items: unknown[], pagination: PaginationMeta, message = 'Success') {
  return NextResponse.json({ success: true, items, pagination, message }, { status: HTTP_STATUS.OK });
}

export function sendError(message = 'Error', status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'SERVER_ERROR') {
  return NextResponse.json({ success: false, message, code }, { status });
}

export function sendAuthError(message = 'Authentication required') {
  return sendError(message, HTTP_STATUS.UNAUTHORIZED, 'AUTH_ERROR');
}

export function sendForbiddenError(message = 'Insufficient permissions') {
  return sendError(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN_ERROR');
}

export function sendNotFoundError(message = 'Resource not found') {
  return sendError(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND_ERROR');
}

export function sendValidationError(message = 'Validation failed', errors?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    { success: false, message, code: 'VALIDATION_ERROR', ...(errors && { errors }) },
    { status: HTTP_STATUS.BAD_REQUEST }
  );
}

export function sendConflictError(message = 'Resource already exists') {
  return sendError(message, HTTP_STATUS.CONFLICT, 'CONFLICT_ERROR');
}

/** Parses `page`/`limit` query params the same way the Express pagination middleware does. */
export function parsePagination(searchParams: URLSearchParams) {
  const DEFAULT_LIMIT = 10;
  const MAX_LIMIT = 100;

  let page = parseInt(searchParams.get('page') || '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  return { page, limit, offset: (page - 1) * limit };
}

export function paginationMeta(page: number, limit: number, totalItems: number): PaginationMeta {
  return { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) };
}
