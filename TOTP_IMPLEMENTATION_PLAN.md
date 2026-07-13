# Option E — Real Entra Auth in Internal UI E2E: Implementation Plan

## Revision 6 — Add real-API guardrail + deterministic seeding

Reference implementation for Playwright MFA setup:

- https://iamguidozam.blog/2025/12/17/automate-microsoft-mfa-login-using-playwright/
- https://github.com/GuidoZam/espc-spfx-session-demo/blob/mfa-support/tests/mfa.setup.ts

---

## Executive Summary

- Current E2E auth is mock-based in this repo. `NODE_ENV=test` in `src/infrastructure/express/routes/index.ts` switches auth to `MockAuthAdaptor` and mounts `test.router.ts` to seed session state.
- To prove real auth, remove the mock path entirely:
  - delete `src/adaptors/source/auth/MockAuth.adaptor.ts`
  - delete `src/infrastructure/express/routes/test.router.ts`
  - delete `tests/playwright/factories/mockOAuthServer.ts`
  - remove `seedAuthSession` usage in `tests/playwright/fixtures/index.ts`
- Add Playwright setup-project login with TOTP (`otpauth`) and persist `storageState` into `tests/playwright/.auth/provider.json`.
- Update session/token handling for internal caseworker claims:
  - `EntraAuthAdaptor` returns access token and decoded claim values needed by internal UI (`firmCode`, `officeId`)
  - `Auth.adaptor.ts` callback stores these fields in `req.session`
- Keep architecture boundaries: ports in `src/ports/auth`, source adaptor in `src/adaptors/source/auth`, presenter adaptor in `src/adaptors/presenter/auth`, route wiring in `src/infrastructure/express/routes/index.ts`.
- CI workflow file referenced in earlier draft (`.github/workflows/e2e-tests.yaml`) does not currently exist in this repo; add it (or equivalent in your CI system) as part of rollout.

---

## 1. Current State (Verified in this repository)

### 1.1 Auth wiring

| Concern                    | File                                                                            | Current behavior                                                                                |
| -------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Auth source selection      | `src/infrastructure/express/routes/index.ts`                                    | `createAuthSource()` uses `MockAuthAdaptor` when `NODE_ENV === "test"`, else `EntraAuthAdaptor` |
| Test session seeding route | `src/infrastructure/express/routes/test.router.ts`                              | `GET /test/auth-session` writes fake session data                                               |
| Callback/session write     | `src/adaptors/presenter/auth/Auth.adaptor.ts`                                   | Callback stores only `user` and `userName` in session                                           |
| Entra token mapping        | `src/adaptors/source/auth/EntraAuth.adaptor.ts`                                 | Returns `idTokenClaims` + name; does not map caseworker claims                                  |
| Auth contract              | `src/ports/auth/Auth.port.ts` + `src/adaptors/source/auth/models/Auth.types.ts` | `AuthTokenResult` currently only includes `user` and `userName`                                 |
| Config                     | `src/infrastructure/config/config.ts`                                           | Includes `MOCK_OAUTH_URL`                                                                       |

### 1.2 E2E test setup

| Concern             | File                                            | Current behavior                                     |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Playwright config   | `tests/playwright/playwright.config.ts`         | Sets `MOCK_OAUTH_URL`, no setup project/storageState |
| Auto-auth fixture   | `tests/playwright/fixtures/index.ts`            | Auto-calls `/test/auth-session` for each test        |
| Mock OAuth service  | `tests/playwright/factories/mockOAuthServer.ts` | Mock OAuth endpoint implementation                   |
| Auth E2E assertions | `tests/playwright/e2e/auth/auth.spec.ts`        | Asserts redirect to mock OAuth URL                   |
| Git ignore          | `.gitignore`                                    | No `tests/playwright/.auth/` entry yet               |

### 1.3 Important repo mismatch from previous draft

- Actual presenter folder is `src/adaptors/presenter/` (singular), not `src/adaptors/presenters/`.
- Workflow files under `.github/workflows/` are not present in this repo at the moment.

---

## 2. Proposed Changes (Internal UI + Caseworker)

### 2.1 Dependency (requires team approval first)

```bash
yarn add otpauth
```

### 2.2 File-by-file implementation plan

| #   | File                                                              | Change                                                                                                                                                                    | Must-have |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | `src/adaptors/source/auth/MockAuth.adaptor.ts`                    | Delete                                                                                                                                                                    | Must      |
| 2   | `src/infrastructure/express/routes/test.router.ts`                | Delete                                                                                                                                                                    | Must      |
| 3   | `tests/playwright/factories/mockOAuthServer.ts`                   | Delete                                                                                                                                                                    | Must      |
| 4   | `src/infrastructure/express/routes/index.ts`                      | Remove `NODE_ENV=test` auth branch and test-router mount; always build `EntraAuthAdaptor`                                                                                 | Must      |
| 5   | `src/adaptors/source/auth/models/Auth.types.ts`                   | Extend `AuthTokenResult` with `accessToken`, `firmCode`, `officeId` (nullable where needed)                                                                               | Must      |
| 6   | `src/adaptors/source/auth/EntraAuth.adaptor.ts`                   | Extract `accessToken` + caseworker claims from token (`FIRM_CODE`, `ACCOUNTS`) and return in `AuthTokenResult`                                                            | Must      |
| 7   | `src/adaptors/presenter/auth/Auth.adaptor.ts`                     | In callback, persist `accessToken`, `firmCode`, `officeId` to `req.session` along with existing fields                                                                    | Must      |
| 8   | `src/infrastructure/config/config.ts`                             | Remove `MOCK_OAUTH_URL` config                                                                                                                                            | Must      |
| 9   | `src/infrastructure/config/config.types.ts`                       | Remove `MOCK_OAUTH_URL` type property                                                                                                                                     | Must      |
| 10  | `tests/playwright/fixtures/index.ts`                              | Remove `seedAuthSession` auto fixture                                                                                                                                     | Must      |
| 11  | `tests/playwright/constants/AuthFile.ts` (new)                    | Add storage state path constant                                                                                                                                           | Must      |
| 12  | `tests/playwright/setup/mfa.setup.ts` (new)                       | Add setup project that performs real Entra login + TOTP and saves storage state                                                                                           | Must      |
| 13  | `tests/playwright/playwright.config.ts`                           | Add setup project + `storageState`, remove mock OAuth env, pass real Entra env vars                                                                                       | Must      |
| 14  | `tests/playwright/e2e/auth/auth.spec.ts`                          | Replace mock URL assertions with real Entra domain assertion                                                                                                              | Must      |
| 15  | `.env.example`                                                    | Add `E2E_PROVIDER_USERNAME`, `E2E_PROVIDER_PASSWORD`, `E2E_PROVIDER_MFA_TOTP_SECRET`; remove `MOCK_OAUTH_URL`                                                             | Must      |
| 16  | `.gitignore`                                                      | Add `tests/playwright/.auth/`                                                                                                                                             | Must      |
| 17  | `.github/workflows/e2e-tests.yaml` (new, if using GitHub Actions) | Add job env for `AUTH_*` + `E2E_PROVIDER_*`, create `.auth` folder before run                                                                                             | Must      |
| 18  | `tests/playwright/factories/handlers/api.ts`                      | **Real-API guardrail:** for target Option E journeys, use passthrough (or no handler) for required API calls and fail fast if any mocked handler is used for those routes | Must      |
| 19  | `tests/playwright/setup/seedApplication.setup.ts` (new/updated)   | **Deterministic seed:** seed data from real API responses only (no hardcoded UAT IDs), and make seeding idempotent                                                        | Must      |
| 20  | `package.json` + CI workflow                                      | Run seed once per run (avoid duplicate `seed-app` + full `test:e2e` double-seed behavior)                                                                                 | Must      |

---

## 3. Code-Level Adaptation Notes

### 3.1 `createAuthSource()` in `src/infrastructure/express/routes/index.ts`

Make this function always return `EntraAuthAdaptor`. Remove mock imports and the `if (process.env.NODE_ENV === "test")` block. Also remove test-router mounting block.

### 3.2 Caseworker claims in `EntraAuth.adaptor.ts`

`acquireTokenByCode` currently returns minimal data. For internal UI parity, include:

- `accessToken` from MSAL response
- `firmCode` from custom claim `FIRM_CODE`
- `officeId` from custom claim `ACCOUNTS` (first account or mapped value as required)

Keep claim parsing here (source adaptor), not in routes.

### 3.3 Session write in `Auth.adaptor.ts`

In callback handler, write enriched fields to session:

- `req.session.user`
- `req.session.userName`
- `req.session.accessToken`
- `req.session.firmCode`
- `req.session.officeId`

Do not throw on missing claim data; handle safely and continue with controlled behavior (redirect/render as per existing pattern).

### 3.4 Playwright setup project files

Create `tests/playwright/constants/AuthFile.ts`:

```typescript
export const AUTH_FILE = "tests/playwright/.auth/provider.json" as const;
```

Create `tests/playwright/setup/mfa.setup.ts` using `otpauth` to generate TOTP and save storage state. Keep selectors resilient where possible because Microsoft login UI can change.

### 3.5 Playwright config migration

In `tests/playwright/playwright.config.ts`:

- add `setup` project (`testDir: "./setup"`, `testMatch: /mfa\.setup\.ts/`)
- make main browser project depend on `setup`
- set `storageState: AUTH_FILE`
- remove `MOCK_OAUTH_URL`
- pass `AUTH_*`, `INQUESTS_API_*`, and `E2E_PROVIDER_*` through `webServer.env`

### 3.6 Real-API guardrail in Playwright/MSW

To avoid false confidence where auth is real but API is still mocked:

- Define a small required route list for Option E journeys (for example: create/search/submit operations actually exercised).
- Ensure those routes are passthrough in MSW (or not intercepted at all).
- Add a fail-fast check in test setup/logging so if one of those routes is mocked, setup fails with a clear message.

### 3.7 Deterministic seed strategy

To avoid flaky seeding and environment-coupled IDs:

- Do not depend on hardcoded IDs known from UAT.
- Seed by creating prerequisites through API endpoints in the same run and use returned IDs.
- Keep seeding idempotent (safe to call once per run, no assumptions about existing records).
- Keep seed execution single-path in CI/local (one explicit seed stage before the main E2E project).

---

## 4. Local Runbook (Internal UI)

### 4.1 Required env vars

Add to your local env file:

```bash
AUTH_DIRECTORY_URL=https://login.microsoftonline.com/<tenant-id>
AUTH_CLIENT_ID=<ui-app-client-id>
AUTH_CLIENT_SECRET=<ui-app-client-secret>
AUTH_REDIRECT_URI=http://localhost:3000/auth/callback
AUTH_POST_LOGOUT_URI=http://localhost:3000

INQUESTS_API_CLIENT_ID=<api-app-client-id>
INQUESTS_API_URL=http://localhost:8027

E2E_PROVIDER_USERNAME=<caseworker-test-username>
E2E_PROVIDER_PASSWORD=<caseworker-test-password>
E2E_PROVIDER_MFA_TOTP_SECRET=<caseworker-totp-secret>

SESSION_SECRET=local-dev-secret
SESSION_NAME=sessionId
NODE_ENV=test
```

### 4.2 Run steps

```bash
yarn add otpauth
mkdir -p tests/playwright/.auth
yarn test:e2e
```

---

## 5. CI/CD Adaptation

If this repo uses GitHub Actions, add `.github/workflows/e2e-tests.yaml` with:

- secret env vars: `AUTH_*`, `INQUESTS_API_CLIENT_ID`, `E2E_PROVIDER_*`
- pre-step: `mkdir -p tests/playwright/.auth`
- `yarn test:e2e`

If CI is not GitHub Actions, apply the same env contract and pre-step in the existing CI platform.

---

## 6. Testing Impact

### 6.1 Tests to update

- `tests/playwright/e2e/auth/auth.spec.ts`: redirect assertion should target `login.microsoftonline.com`.
- `tests/playwright/fixtures/index.ts`: remove `/test/auth-session` calls.

### 6.2 Additional cases to include

- Real caseworker TOTP login reaches home page.
- Authenticated caseworker can complete a representative internal journey backed by API.
- Logout clears session and forces re-auth.
- Expired/invalid session returns to login path.

### 6.3 Guardrail checks to add

- A setup assertion that verifies required Option E API routes were not served by mocks.
- A seed assertion that confirms created IDs come from current-run responses.
- A CI assertion that seed step executes once per run.

---

## 7. Risks and Controls

| Risk                                   | Severity | Control                                                            |
| -------------------------------------- | -------- | ------------------------------------------------------------------ |
| TOTP secret leakage                    | High     | Store in secret stores only; never log; rotate if exposed          |
| `storageState` committed               | High     | Add `tests/playwright/.auth/` to `.gitignore` before first run     |
| MFA code expiry boundary               | Medium   | Add one retry in setup test to regenerate TOTP once                |
| Entra selector drift                   | Medium   | Use robust locator strategy and clear setup-stage failure messages |
| API not validating bearer tokens       | High     | Confirm API auth validation is enabled before relying on Option E  |
| Real auth but mocked API still passing | High     | Add explicit required-route passthrough + fail-fast mock guardrail |
| Duplicate or non-deterministic seeding | Medium   | Run seed once, use runtime-created IDs only, keep seed idempotent  |

---

## 8. Open Questions (Caseworker/Internal UI)

1. Which exact claims does internal UI require from Entra for all caseworker journeys (`FIRM_CODE`, `ACCOUNTS`, others)?
2. How should `ACCOUNTS` map to `officeId` when multiple values exist?
3. Which CI platform is authoritative for this repo if `.github/workflows/` is absent?
4. Should `mfa.setup.ts` include a fallback path if Microsoft login presents alternate challenge screens?
5. Has the team approved adding `otpauth`?
