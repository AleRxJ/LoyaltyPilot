/**
 * Helper functions for role-based authorization
 */

export type UserRole = "user" | "admin" | "regional-admin" | "super-admin";

/**
 * Check if a role has admin privileges
 * Includes: admin, regional-admin, super-admin
 */
export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "admin" || role === "regional-admin" || role === "super-admin";
}

/**
 * Check if a role is super-admin
 */
export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === "super-admin";
}

/**
 * Check if a role is regional-admin
 */
export function isRegionalAdmin(role: UserRole | undefined): boolean {
  return role === "regional-admin";
}
