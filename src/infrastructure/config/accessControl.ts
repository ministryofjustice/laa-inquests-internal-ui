import { EMPTY_ARR_LENGTH } from "#src/infrastructure/locales/constants.js";

/**
 * Central role-based access-control (RBAC) configuration for Internal UI.
 *
 * This module is the single source of truth for:
 * - the exact Entra role display names recognised by the service,
 * - the public / infrastructure routes that bypass authorisation,
 * - the page-level route policy matrix (for future enforcement),
 * - path matching and policy lookup helpers.
 *
 * Adding a new protected top-level route requires adding a policy entry to
 * ROUTE_POLICIES. Matching is segment-safe: `/apply` and `/apply/...` match
 * the Apply policy, while `/application` does not.
 */

export const INTERNAL_CASEWORKER_ROLES = {
  APPLICATIONS_CASEWORKER: "Inquests - Applications caseworker",
  CLAIMS_CASEWORKER: "Inquests - Claims caseworker",
  CUSTOMER_SERVICE_AGENT: "Inquests - Customer service agent",
  ASSURANCE: "Inquests - Assurance",
  APPLICATION_WORKFLOW_REPORTING: "Inquests - Application workflow reporting",
  CLAIM_WORKFLOW_REPORTING: "Inquests - Claim workflow reporting",
  POLICY: "Inquests - Policy",
  FINANCE: "Inquests - Finance",
};

export type CaseworkerRole =
  (typeof INTERNAL_CASEWORKER_ROLES)[keyof typeof INTERNAL_CASEWORKER_ROLES];

export const RECOGNISED_ROLES: readonly CaseworkerRole[] = Object.values(
  INTERNAL_CASEWORKER_ROLES,
);

export const ROLE_CLAIM_KEY = "LAA_APP_ROLES";

export interface RoutePolicy {
  readonly prefix: string;
  readonly allowedRoles: readonly CaseworkerRole[];
}

export const ROUTE_POLICIES: readonly RoutePolicy[] = [];

const PUBLIC_EXACT_PATHS: readonly string[] = ["/health", "/status", "/error"];

const PUBLIC_PREFIXES: readonly string[] = ["/auth"];

export function isRecognisedRole(value: unknown): value is CaseworkerRole {
  return typeof value === "string" && RECOGNISED_ROLES.includes(value);
}

export function normaliseRoles(values: readonly unknown[]): CaseworkerRole[] {
  const rawRoles: string[] = [];

  for (const value of values) {
    if (typeof value === "string") {
      // Handle comma-separated roles
      const parts = value.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed !== "") {
          rawRoles.push(trimmed);
        }
      }
    }
  }

  const recognised: CaseworkerRole[] = [];
  for (const role of rawRoles) {
    if (!isRecognisedRole(role)) {
      throw new Error(`Unknown role in token claims: "${String(role)}"`);
    }
    recognised.push(role);
  }

  return [...new Set(recognised)];
}

export function matchesPrefix(path: string, prefix: string): boolean {
  if (prefix === "/") {
    return path === "/";
  }
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isPublicPath(path: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(path)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

export function findRoutePolicy(path: string): RoutePolicy | undefined {
  return ROUTE_POLICIES.find((policy) => matchesPrefix(path, policy.prefix));
}

export function hasAllowedRole(
  userRoles: readonly CaseworkerRole[],
  policy: RoutePolicy,
): boolean {
  return userRoles.some((role) => policy.allowedRoles.includes(role));
}

export function validateRolesNotEmpty(roles: readonly CaseworkerRole[]): void {
  if (roles.length === EMPTY_ARR_LENGTH) {
    throw new Error(
      "User has no caseworker roles assigned. Authentication denied.",
    );
  }
}
