# Caseworker role extraction and access-control pattern

## Current state: scaffolding only, no enforcement active

All routes remain accessible to any authenticated caseworker. Roles are
extracted, persisted, and exposed to templates and middleware, but
`ROUTE_POLICIES` is empty, so `globalAccessGuard` allows every authenticated
request through.

## Role constants and their Entra mappings

`src/infrastructure/config/accessControl.ts` is the single source of truth
for recognised roles. `INTERNAL_CASEWORKER_ROLES` maps a short key to the
exact Entra display name returned in the `LAA_APP_ROLES` token claim:

| Key                              | Entra display name                          |
| -------------------------------- | ------------------------------------------- |
| `APPLICATIONS_CASEWORKER`        | `Inquests - Applications Caseworker`        |
| `CLAIMS_CASEWORKER`              | `Inquests - Claims Caseworker`              |
| `CUSTOMER_SERVICE_AGENT`         | `Inquests - Customer Service Agent`         |
| `ASSURANCE`                      | `Inquests - Assurance`                      |
| `APPLICATION_WORKFLOW_REPORTING` | `Inquests - Application Workflow Reporting` |
| `CLAIM_WORKFLOW_REPORTING`       | `Inquests - Claim Workflow Reporting`       |
| `POLICY`                         | `Inquests - Policy`                         |
| `FINANCE`                        | `Inquests - Finance`                        |

`CaseworkerRole` is a union type of these display-name strings.
`RECOGNISED_ROLES` is the derived array used for validation.

## How roles are extracted and persisted

```
Entra ID
    ↓ (token with LAA_APP_ROLES claim)
EntraAuth.adaptor#extractRoles()
    ↓ (normaliseRoles e.g. deduplicating)
AuthTokenResult.roles: CaseworkerRole[]
    ↓ (auth callback)
Auth.adaptor#callback()
    ↓ (assigns roles to session)
req.session.roles: CaseworkerRole[]
    ↓ (makes roles available to all middleware/routes)
viewContext middleware → res.locals (for templates)
globalAccessGuard middleware → request routing (allow-all for now)
```

1. `EntraAuth.adaptor.ts` reads the `LAA_APP_ROLES` claim (`ROLE_CLAIM_KEY`)
   from the Entra token result and calls `normaliseRoles()`, which
   deduplicates values and throws if any role is not in `RECOGNISED_ROLES`.
   `validateRolesNotEmpty()` then rejects a token with no roles at all. Both
   failures are caught and rethrown as a sanitized `ApplicationError`, so an
   unauthenticated/invalid-role user never reaches the presenter.
2. `Auth.adaptor.ts` (presenter) copies the resulting `roles` onto
   `req.session.roles` during the auth callback, alongside the existing
   `req.session.user` data.
3. The `/test-login` route (test environment only) seeds
   `req.session.roles` with all `RECOGNISED_ROLES` so e2e/test flows have a
   fully-privileged session.

## Template usage

`viewContext` (`src/infrastructure/express/middleware/accessControl/viewContext.ts`)
is registered globally in `src/app.ts` and injects values into `res.locals`
on every request:

- `{{ userRoles }}` — the current caseworker's roles (`CaseworkerRole[]`,
  empty array if unauthenticated or no roles on session).
- `{{ appRoles }}` — the full `INTERNAL_CASEWORKER_ROLES` constants object,
  for referencing a specific role by key in a template.
- `{{ hasRole(role) }}` — a role introspection predicate. **This exists only
  for the `/user-roles` developer diagnostics page**
- `{{ permissions }}` — the `PERMISSIONS` constants object, for referencing a
  navigational permission by key in a template.
- `{{ hasPermission(permission) }}` — used for conditional
  rendering of navigational UI (tabs, nav links), backed by the central
  `PERMISSION_ROLE_MAP` in `accessControl.ts`, e.g.:

  ```njk
  {% if hasPermission(permissions.VIEW_CLAIMS_TAB) %}
    {# render the Claims tab #}
  {% endif %}
  ```

This controls what server-rendered HTML is sent to the browser.
Inquests API applies its own permission checks on every call, and those
remain authoritative for data access and state-changing actions.

## How to add a new route policy

Adding a new protected top-level route requires adding a corresponding
entry to the central route policy matrix in `accessControl.ts`. Authenticated
requests to routes missing from the policy return `403 Forbidden` by design.

Policy prefixes match whole path segments only: the `/help` policy covers
`/help` and `/help/...`, but not `/helps`. A path that merely shares a prefix
with a policy therefore has no policy and returns `403`, rather than passing
the guard and reaching the `404` page. A non-existent page under a prefix the
user is allowed to access (for example `/reports/does-not-exist`) still
returns `404`.

## How to add a new navigational permission

1. Add a key to `PERMISSIONS` in `accessControl.ts` (e.g. `VIEW_REPORTS_LINK`).
2. Add a matching entry to `PERMISSION_ROLE_MAP` listing the roles that grant
   it.
3. Use `{{ hasPermission(permissions.YOUR_KEY) }}` in the template.

## MI report placeholders (IDDS-822)

The Reports page shows User Audit Trail, Claim and Applications Processing,
and Costs links only to users with Assurance, Policy, or Finance roles. A user
with any one of these roles retains access when combined with other roles.
The entire link markup is omitted for users without MI reporting permission,
so hidden reports leave no placeholders or empty spacing.

These links use named `#PLACEHOLDER-FOR-...-LINK` fragments and
`aria-disabled="true"` and do not download CSVs. Replace each placeholder `href`
and remove `aria-disabled` when its report destination is ready.
The placeholder block is kept for now; the real report links are described in
the next section.

## Download reports page

The Reports page groups its links into Operations, Finance and Management
information sections. A link, and a section heading with no visible links, is
shown only when `hasPermission` allows it. Role mappings mirror the Inquests API
(no role changes):

| Report                                  | Route                                      | Permission                    | Roles                                    |
| --------------------------------------- | ------------------------------------------ | ----------------------------- | ---------------------------------------- |
| Claims workflow backlog                 | `/reports/claims/backlog`                  | `VIEW_CLAIMS_REPORTS`         | Claim workflow reporting                 |
| Applications workflow backlog           | `/reports/applications/backlog`            | `VIEW_APPLICATIONS_REPORTS`   | Application workflow reporting           |
| Payments extract                        | `/reports/payments-extract`                | `VIEW_PAYMENT_EXTRACT_REPORT` | Assurance, Finance                       |
| Cost estimation and forecasting         | `/reports/cost-estimation-and-forecasting` | `VIEW_COST_ESTIMATION_REPORT` | Finance, Policy                          |
| Claims and applications processing      | `/reports/claims-applications-processing`  | `VIEW_DECISIONS_REPORT`       | Application and Claim workflow reporting |
| Costs associated with other departments | `/reports/costs-for-other-departments`     | `VIEW_OGD_COSTS_REPORT`       | Finance, Policy                          |
| User audit trail                        | `/reports/user-audit-trail`                | `VIEW_AUDIT_TRAIL_REPORT`     | Assurance                                |

The payments extract, claims and applications processing, costs for other
departments and user audit trail pages all use the reusable
`views/reports/date-range-report.njk` template. Each report is described once in
`adaptors/presenter/reports/reportDefinitions.ts` (URL slug, maximum date range
in days, permission). The form page is `GET /reports/<slug>` and it submits to
`GET /reports/<slug>/download`, which shares the page's route policy prefix.
Adding another date range report means adding a definition, its locale content
under `pages.reports.dateRange`, an API route in `ReportsAPI.adaptor.ts` and a
route policy entry.
