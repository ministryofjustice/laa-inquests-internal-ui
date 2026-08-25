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
- Use cases: log outcome events and safe state transitions.
- Outbound adapters: log external call boundaries and durations.
- Error middleware:
  - `route_not_found` as warn
  - `http_request_failed` as error

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
- Include only minimal identifiers and operational metadata in `extraContext`.
- Keep event names `snake_case` and outcome-focused.

## Extra context

laa_reference: <applicationid>
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
    laa_reference: req.params.applicationId,
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
