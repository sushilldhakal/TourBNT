import { userRoleEnum } from '../db';

/**
 * Role strings allowed by the Postgres `user_role` enum.
 * This list is read from the shared schema so the API cannot accept a role
 * the database does not store.
 */
export const USER_ROLES = userRoleEnum.enumValues;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/** Collapse a string or a one-element array onto the enum, otherwise keep the current role. */
export function coerceUserRole(value: unknown, fallback: UserRole): UserRole {
  if (isUserRole(value)) return value;
  if (Array.isArray(value)) {
    const match = value.find(isUserRole);
    if (match) return match;
  }
  return fallback;
}
