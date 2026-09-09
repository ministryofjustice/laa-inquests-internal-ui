---
name: error-handling
description: Rules for designing, implementing, testing, logging, or reviewing errors, exceptions, failure results, Axios/MSAL failures, presenter error responses, and Express error middleware in laa-inquests-internal-ui.
user-invocable: false
---

# Error Handling

Use this skill whenever changing or reviewing an error path. Existing hybrid
error handling is legacy code and is not precedent for new or migrated paths.

## Failure Model

Classify failures before choosing a representation:

| Failure                                                                   | Representation                                      | Owner                     |
| ------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| Form validation                                                           | Validation result with error summaries              | Inbound adapter/validator |
| Expected absence, such as a missing certificate                           | Use-case-specific result or `undefined` at the port | Use case/port             |
| Business outcome or invalid application state                             | Use-case-specific result                            | Use case                  |
| External authentication, authorization, availability, or response failure | Sanitized `ApplicationError`                        | Outbound adapter          |
| Programmer or framework error                                             | Original exception                                  | Generic error middleware  |

Do not represent the same failure as both a result and an exception within one
operation.

## Application Errors

- Define the application error contract in the application layer, outside
  `src/ports/` because ports contain interfaces only.
- Use stable kinds such as `AUTHENTICATION_REQUIRED`, `FORBIDDEN`,
  `UPSTREAM_UNAVAILABLE`, `UPSTREAM_REJECTED`, and
  `INVALID_UPSTREAM_RESPONSE`.
- Include only stable, non-sensitive policy fields: `kind`, `operation`, and
  `retryable`.
- Never attach Axios, MSAL, Express, ORM, SDK, response, request, token, or
  payload objects through `cause` or another property.
- Expected not-found outcomes are values, not technical exceptions.

## Outbound Adapters

- Catch infrastructure-client errors at the adapter boundary.
- Log the raw failure once with safe transport metadata.
- Translate it to `ApplicationError` before it crosses the boundary.
- Validate responses inside the adapter and translate schema failures to
  `INVALID_UPSTREAM_RESPONSE`.
- Missing credentials must prevent the external call and become a classified
  application error.
- Never return `cause?: unknown` in a port-facing result.

## Use Cases

- Let translated technical exceptions propagate unchanged.
- Do not catch an exception merely to log, rename, wrap, or return
  `TECHNICAL_FAILURE`.
- Do not import the concrete logger or any infrastructure module.
- Keep expected validation, not-found, and business outcomes in
  use-case-specific result types.
- Do not emit logging events directly. HTTP-driven business success events are
  emitted by presenters after the use case succeeds.

## Inbound Adapters and Middleware

- Presenters map expected outcomes to HTTP responses.
- Presenters must not render a generic 500 response or log a technical
  exception before propagating it.
- Presenters emit semantic success events only after the awaited use case
  succeeds and before redirecting or rendering.
- Routes pass rejected presenter promises to Express error middleware.
- Auth middleware maps `AUTHENTICATION_REQUIRED` and `FORBIDDEN` to the agreed
  redirect/403 behavior.
- Generic middleware sets the real HTTP 500 status before rendering.

## Logging Ownership

A failed external request may produce two complementary records:

1. `outbound_api_request_failed` in the outbound adapter, with transport detail.
2. `http_request_failed`, `auth_session_expired`, or `api_forbidden` at the
   final HTTP boundary, with request outcome detail.

Do not add use-case or presenter copies of the same technical failure.

Outbound events use:

- `outbound_api_call` at `info` for success;
- `outbound_api_not_found` at `warn` for expected absence;
- `outbound_api_request_failed` at `error` for translated failures.

Include `operation`, route template, method, duration, failure kind,
retryability, safe upstream status, request ID, correlation ID, and permitted
identifiers where relevant. Never log tokens, authorization headers, request or
response bodies, query strings, session dumps, free text, SDK account objects,
or upstream payloads.

Retain these presenter-owned business success events at `info`:

- `history_note_added`
- `application_decision_granted`
- `application_decision_refused`
- `claim_rejected`
- `public_authorities_updated`

Emit each exactly once after confirmed success and never on validation or
persistence failure.

## Required Tests

For each migrated vertical slice:

1. Start with the Playwright behavior and obtain approval before implementation.
2. Test adapter success, expected 404, 401, 403, timeout/network failure, 5xx,
   malformed response, missing credentials, logging cardinality, and redaction.
3. Test that the use case returns expected outcomes and propagates the exact
   `ApplicationError` instance unchanged.
4. Test that the presenter maps expected outcomes, emits success events once,
   emits none on failure, and propagates technical errors unchanged.
5. Test route forwarding once per distinct wrapper shape.
6. Test middleware status, redirect-loop prevention, rendering, event level,
   context, and redaction.
7. Test Playwright success, 401, 403, 404, generic 500, malformed response, and
   accessibility where relevant.

Axios and MSAL error objects may appear only in outbound adapter tests. Tests
above that boundary construct `ApplicationError` directly.

## Review Checklist

- No external client type or error escapes an outbound adapter.
- No SDK error is stored as an application-error cause.
- No use case imports infrastructure or logs directly.
- No presenter renders a generic 500 or duplicates a technical error log.
- Expected outcomes are not generic exceptions.
- HTTP status is set, not only passed to a template.
- Semantic success events occur only after confirmed success.
- Logs contain required safe context and exclude sensitive data.
- Negative and accessibility tests cover the changed path.
- Migrated code does not copy `OutboundAdapterResult`, `UpstreamAuthError`,
  `throwUseCaseFailure`, or technical catch-and-wrap patterns from legacy code.
