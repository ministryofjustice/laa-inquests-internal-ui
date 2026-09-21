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

export type CaseworkerRole =
  (typeof INTERNAL_CASEWORKER_ROLES)[keyof typeof INTERNAL_CASEWORKER_ROLES];

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface RoutePolicy {
  readonly prefix: string;
  readonly allowedRoles: readonly CaseworkerRole[];
}

export const ROLE_CLAIM_KEY = "LAA_APP_ROLES";

const PUBLIC_EXACT_PATHS: readonly string[] = ["/health", "/status", "/error"];

const PUBLIC_PREFIXES: readonly string[] = ["/auth"];

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

export const RECOGNISED_ROLES: readonly CaseworkerRole[] = Object.values(
  INTERNAL_CASEWORKER_ROLES,
);

export const PERMISSIONS = {
  VIEW_CLAIMS_TAB: "viewClaimsTab",
  MAKE_APPLICATION_DECISION: "makeAssessment",
  VIEW_APPLICATIONS_OVERVIEW_PAGE: "viewApplicationsOverviewPage",
  VIEW_CLAIMS_DETAILS: "viewClaimsDetails",
  MAKE_CLAIM_DECISION: "makeClaimDecision",
};

const RECOGNISED_PERMISSIONS: readonly Permission[] =
  Object.values(PERMISSIONS);

export const PERMISSION_ROLE_MAP: Readonly<
  Record<Permission, readonly CaseworkerRole[]>
> = {
  [PERMISSIONS.VIEW_CLAIMS_TAB]: [
    INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
    INTERNAL_CASEWORKER_ROLES.CUSTOMER_SERVICE_AGENT,
    INTERNAL_CASEWORKER_ROLES.ASSURANCE,
  ],
  [PERMISSIONS.VIEW_CLAIMS_DETAILS]: [
    INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
    INTERNAL_CASEWORKER_ROLES.CUSTOMER_SERVICE_AGENT,
    INTERNAL_CASEWORKER_ROLES.ASSURANCE,
  ],
  [PERMISSIONS.VIEW_APPLICATIONS_OVERVIEW_PAGE]: [
    INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
    INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
    INTERNAL_CASEWORKER_ROLES.CUSTOMER_SERVICE_AGENT,
    INTERNAL_CASEWORKER_ROLES.ASSURANCE,
  ],
  [PERMISSIONS.MAKE_APPLICATION_DECISION]: [
    INTERNAL_CASEWORKER_ROLES.APPLICATIONS_CASEWORKER,
  ],
  [PERMISSIONS.MAKE_CLAIM_DECISION]: [
    INTERNAL_CASEWORKER_ROLES.CLAIMS_CASEWORKER,
  ],
};

export const ROUTE_POLICIES: readonly RoutePolicy[] = [
  {
    prefix: "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/overview",
    allowedRoles:
      PERMISSION_ROLE_MAP[PERMISSIONS.VIEW_APPLICATIONS_OVERVIEW_PAGE],
  },
  {
    prefix: "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/decision",
    allowedRoles: PERMISSION_ROLE_MAP[PERMISSIONS.MAKE_APPLICATION_DECISION],
  },
  {
    prefix: "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/[0-9]+/",
    allowedRoles: PERMISSION_ROLE_MAP[PERMISSIONS.VIEW_CLAIMS_DETAILS],
  },
  {
    prefix: "/applications/INQ-[A-Z0-9]{3}-[A-Z0-9]{3}/claims/[0-9]+/.+",
    allowedRoles: PERMISSION_ROLE_MAP[PERMISSIONS.MAKE_CLAIM_DECISION],
  },
];

export function isRecognisedRole(value: unknown): value is CaseworkerRole {
  return typeof value === "string" && RECOGNISED_ROLES.includes(value);
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && RECOGNISED_PERMISSIONS.includes(value);
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
  return path === prefix || path.match(`^${prefix}`) !== null;
}

export function isPublicPath(path: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(path)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

export function findRoutePolicy(path: string): RoutePolicy | undefined {
  // Pick the most specific (longest prefix) match so sub-routes aren't shadowed by a broader parent policy.
  return ROUTE_POLICIES.filter((policy) =>
    matchesPrefix(path, policy.prefix),
  ).reduce<RoutePolicy | undefined>(
    (longest, policy) =>
      longest === undefined || policy.prefix.length > longest.prefix.length
        ? policy
        : longest,
    undefined,
  );
}

export function hasAllowedRole(
  userRoles: readonly CaseworkerRole[],
  policy: RoutePolicy,
): boolean {
  return userRoles.some((role) => policy.allowedRoles.includes(role));
}

export function hasPermission(
  userRoles: readonly CaseworkerRole[],
  permission: unknown,
): boolean {
  if (!isPermission(permission)) {
    return false;
  }

  return userRoles.some((role) =>
    PERMISSION_ROLE_MAP[permission].includes(role),
  );
}

export function validateRolesNotEmpty(roles: readonly CaseworkerRole[]): void {
  if (roles.length === EMPTY_ARR_LENGTH) {
    throw new Error(
      "User has no caseworker roles assigned. Authentication denied.",
    );
  }
}
