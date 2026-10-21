---
name: internal-ui-logging
description: Rules for adding and updating logs in laa-inquests-internal-ui. Use this when changing logger middleware, request/correlation id handling, route or use case logging, adapter logging, or error boundary logging.
---

# internal-ui-logging

Use this skill whenever logging is added or changed in `laa-inquests-internal-ui`.

NOTE: Keep internal and external logger behavior aligned.

## Logger contract (must match external-ui)

- Keep shared helpers and level gating identical:
  - `validLogLevel(logLevel)`
  - `getConfiguredLogLevel()`
  - `shouldLog(eventLevel, configuredLevel)`
- Keep named-object logger API only:
  - `logger.logDebug({ ... })`
  - `logger.logInfo({ ... })`
  - `logger.logWarn({ ... })`
  - `logger.logError({ ... })`
- Never introduce positional signatures like `logInfo(functionName, message, req)`.

## Request/correlation IDs

- Extract IDs from headers first:
  - `x-request-id`
  - `x-correlation-id`
- Handle `string | string[] | undefined` safely.
- Fallback policy:
  - `request_id`: UUID when missing
  - `correlation_id`: request_id when missing
- Never derive correlation IDs from token/auth/session payloads.

## Layer boundaries

- Domain and schemas: no logs where PII-rich data is handled.
- Inbound adapters (routes/presenters): log request milestones and user actions.
- Inbound adapters (routes/presenters): log semantic business success outcomes
  after the awaited use case succeeds.
- Use cases: do not import the concrete logger or emit logs directly.
- Outbound adapters: log external call boundaries and durations.
- Error middleware:
  - `route_not_found` as warn
  - `http_request_failed` as error

## Error event ownership

Follow the `error-handling` skill for the complete event catalogue.

- Outbound adapters emit `outbound_api_call`, `outbound_api_not_found`, or
  `outbound_api_request_failed` with operation, route template, method,
  duration, classification, retryability, and safe status.
- Error middleware emits one final `http_request_failed`,
  `auth_session_expired`, or `api_forbidden` request outcome.
- Do not duplicate the same technical exception in a use case or presenter.
- Presenters retain semantic success events such as `history_note_added`,
  `application_decision_granted`, `application_decision_refused`,
  `claim_rejected`, and `public_authorities_updated`.

## Levels and defaults

Allowed levels: `debug`, `info`, `warn`, `error`, `fatal`.

Environment defaults:

- local: `info`
- dev: `info`
- staging: `info`
- prod: `warn`

If `LOG_LEVEL` is invalid/missing, fallback to `info` and emit one warning event:

- `event: log_level_invalid_fallback`
- include `configured_log_level` and `fallback_log_level`

## Redaction and safety

- Never log raw request bodies.
- Never log full objects likely to include PII.
- Never log tokens, authorization headers, upstream response bodies, query
  strings, session dumps, free text, SDK account objects, or SDK errors outside
  their owning outbound adapter.
- Include only minimal identifiers and operational metadata in `extraContext`.
- Keep event names `snake_case` and outcome-focused.

## Sentry

Sentry is a second sink for errors and must follow the same redaction rules as logs.

- May be sent: case references, claim references, firm codes and firm IDs (not
  as separate tags — there is no reference-tagging mechanism, they are only
  ever visible as part of a path/URL).
  Never sent: IP addresses, emails, names, user IDs, usernames, tokens,
  credentials, file names or other personal data.
- Configuration is in `src/infrastructure/config/sentry.ts`; do not call
  `Sentry.init` anywhere else. `src/instrument.ts` is loaded with `node --import`.
- Do not call `Sentry.setUser`, `setExtra`, `setContext`, `setTag` or
  `addBreadcrumb` directly anywhere in application code. All data Sentry sees
  must go through `scrubEvent`/`scrubSpan` in `sentry.ts`. If a feature needs
  to attach extra context, add an explicit allow-listed field and a scrubbing
  test there first.
- HTTP breadcrumbs are disabled outright (`Sentry.httpIntegration({
breadcrumbs: false })`), not scrubbed, so no breadcrumb data reaches Sentry.
- Do not log through `Sentry.logger`; logs stay in the JSON logger only.
- URL paths are sent as-is; only the query string and fragment are dropped
  (`URL.pathname`/the OTel `url.path` attribute already exclude them, so no
  separate path-sanitizing function is needed). Every route in this app takes
  only literal, developer-chosen words or a
  `:laaReference`/`:claimReference`/`:claimEvidenceId` reference code, so a
  matched route never carries user input. Do not add a route that accepts
  free-text path segments (e.g. a name or search term) without revisiting this.
- Sentry's own Express instrumentation renames spans/transactions to the
  matched route template as soon as a route matches; `sentry.ts` does not need
  to know the route template itself.
- Exception messages are sent after redaction of emails, IP addresses and
  tokens, which cannot catch names or file names. Do not put user input in
  `Error` or `ApplicationError` messages (use `operation`, `type`, `retryable`).
- `sentry.ts` has no MSAL- or Zod-specific handling — it relies on outbound
  adapters converting those upstream/auth errors to `ApplicationError` before
  they escape (`EntraAuth.adaptor.ts` wraps every MSAL call; schema validation
  must use `safeParse`, never `parse`, so a `ZodError` never reaches Sentry
  directly). Do not reintroduce an unguarded `.parse()` or a raw re-throw of an
  MSAL error.
- A new sensitive field or error type needs a scrubber update and a test in
  `tests/unit/src/infrastructure/config/sentry.spec.ts`.

## Extra context

laa_reference: <laaReference>
reason: TECHNICAL_FAILURE_REASONS.INVALID_INPUT_STATE,

## Examples

Good:

```typescript
logger.logInfo({
  functionName: "render_application_page",
  message: "Application overview requested",
  request: req,
  extraContext: {
    event: "application_overview_requested",
    laa_reference: req.params.laaReference,
  },
});
```

Bad:

```typescript
logger.logInfo({
  functionName: "render_application_page",
  message: "payload",
  extraContext: {
    event: "appEvent",
    full_request_body: req.body,
    session_dump: req.session,
  },
});
```

The bad example violates naming conventions and redaction requirements.
