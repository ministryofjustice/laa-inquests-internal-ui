# Session lifecycle logging

Session creation, session ID rotation, termination and authentication failures
are logged as audit events. They are emitted with `logger.logAudit`, so they
are written regardless of `LOG_LEVEL` and carry `log_type: "audit"`.

## Events

| Event                | Emitted by                                                          | Fields                                                                                                                 |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `session_id_rotated` | `AuthAdaptor.callback`                                              | `previous_session_hash`, `session_hash`, `trigger`, `previous_session_authenticated`                                   |
| `session_created`    | `AuthAdaptor.callback`, `/auth/test-login`                          | `session_hash`, `login_method` (`entra`, `test`), `idle_timeout_ms`, `absolute_timeout_ms`, `credential_expires_in_ms` |
| `session_terminated` | `AuthAdaptor.logout`, `sessionLifetimeGuard`, `handleApiAuthErrors` | `session_hash`, `reason`, `route`                                                                                      |
| `auth_login_failed`  | `AuthAdaptor.callback`                                              | `session_hash`, `reason`, `idp_error_code` (when Entra returns an error)                                               |

Termination reasons:

| Reason                | Trigger                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `user_logout`         | User signs out                                                                           |
| `idle_timeout`        | First request after the idle timeout                                                     |
| `absolute_timeout`    | First request after the absolute timeout                                                 |
| `credential_expiry`   | First request after the access token expiry (minus buffer)                               |
| `invalid_session`     | Signed-in session without lifetime data                                                  |
| `credential_rejected` | Inquests API returned 401, which covers password change and token revocation in Entra ID |

Authentication failure reasons: `idp_error`, `missing_code`,
`token_acquisition_failed`, `session_regeneration_failed`,
`invalid_credential_expiry`. `idp_error_code` is restricted to standard OAuth
error codes; anything else is logged as `other`.

## What is never logged

Raw session IDs, cookies, access tokens, authorisation codes, user IDs, user
names, email addresses, and any role information.

## Session hash

`session_hash` is `HMAC-SHA256(SESSION_LOG_HASH_SECRET, sessionId)` as hex. It
is recalculated from the session ID for each event, so every pod produces the
same value for the same session. The session ID changes at login, which is why
`session_id_rotated` records both the previous and the new hash.

`SESSION_LOG_HASH_SECRET` is separate from `SESSION_SECRET`. Express-session
signs the cookie with an HMAC of the session ID keyed by `SESSION_SECRET`, so
reusing that key would put the cookie signature in the logs.

## Secrets

Both `SESSION_SECRET` and `SESSION_LOG_HASH_SECRET` are stored in AWS Secrets
Manager, declared in `cloud-platform-environments` (`secret.tf`), synced into
the namespace as `session-secret-<env>` and `session-log-hash-secret-<env>`,
and read by the deployment with `secretKeyRef`.

- Rotating `SESSION_LOG_HASH_SECRET` changes the hash of sessions that are live
  at the time, so correlation breaks across the rotation only.
- Rotating `SESSION_SECRET` signs everyone out.

For local development set `SESSION_LOG_HASH_SECRET` in `../.env.internal` (see
`.env.example`).

## Investigating a session

1. Filter OpenSearch on `log_type:audit` and the `session_hash`.
2. Use the `request_id` and `correlation_id` on those events to find the
   related request logs. `session_hash` is never used as a request or
   correlation ID.

## Limitations

- IdP-initiated logout from Entra ID is not supported. There is no front-channel
  logout endpoint and the `SameSite=lax` cookie is not sent in the Entra iframe.
- Sessions that expire in Redis without the user returning are not logged.
- A password change is only detected when the Inquests API rejects the token
  (`credential_rejected`).
