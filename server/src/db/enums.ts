import { approvalStatusEnum } from './schema';

/** Type guards for request values that must match a Postgres enum (anything else would fail in the database). */

export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];

export const isApprovalStatus = (value: unknown): value is ApprovalStatus =>
  typeof value === 'string' && (approvalStatusEnum.enumValues as readonly string[]).includes(value);
