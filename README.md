# Legal Aid Agency - Inquests Internal UI

[![Standards Icon]][Standards Link]

![govuk-frontend 5.10.2](https://img.shields.io/badge/govuk--frontend%20version-5.10.2-005EA5?logo=gov.uk&style=flat)

## Full technical documentation

View the [full technical documentation here](https://ministryofjustice.github.io/laa-express-typescript-template/)

## Get Started

### Prerequisites

- node stable version [26.12.1](https://nodejs.org/en/blog/release/v26.12.1/)
- [Yarn 4.10.3](https://yarnpkg.com/) package manager (see installation instructions below)
- TypeScript 5.9.3

#### Installing Yarn

This project uses Yarn 4.10.3 managed by corepack (built into Node.js 16.10+). To ensure all team members use the same version, follow these installation steps:

1. **Enable corepack (if not already enabled):**

   ```shell
   corepack enable
   ```

2. **Install dependencies:**

   ```shell
   yarn install
   ```

3. **Verify the installation:**

   ```shell
   yarn --version
   # Should output: 4.10.3
   ```

**To Note:**

- Corepack automatically uses the Yarn version specified in the `packageManager` field of `package.json`. No additional setup is required once corepack is enabled
- Corepack is the preferred `yarn` way, to install the package manager, instead of `npm install -g yarn` in your ci/cd pipeline
- `yarn install --immutable` ensures that the lockfile (`yarn.lock`) is not modified during the installation process

### Start the application

#### Set local environment variables

Create your local config file `.env` from the template file:

```shell
cp .env.example ../.env.internal
```

The template includes `ENVIRONMENT` and `SENTRY_DSN`; see
[Sentry error monitoring](#sentry-error-monitoring).

#### Align to the Node Version specified for this project

If using Node Version Manager (nvm), use the following command to switch to the correct version:

```shell
nvm use
nvm install
```

#### Install dependencies and run application for development

```shell
yarn install
yarn build
yarn dev
```

Then, load http://localhost:3000/ in your browser to access the app.

#### Install dependencies and run application for production

```shell
yarn install
yarn build
yarn start
```

### Sentry error monitoring

Errors and traces are sent to Sentry. Configuration lives in
`src/infrastructure/config/sentry.ts` and is initialised by
`src/infrastructure/build/sentryInit.ts`.

| Variable      | Purpose                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_DSN`  | Sentry project DSN. **Required** when `NODE_ENV=production` (the app refuses to start without it). Optional locally and in tests; with no DSN nothing is sent. |
| `ENVIRONMENT` | Sentry environment tag: `dev`, `staging`, `prod` or `suppliertest`. Set by `deploy.sh`.                                                                        |

In deployed environments `SENTRY_DSN` comes from the `SENTRY_DSN` GitHub
secret, through the deploy action and `deploy.sh`. The deploy fails if it is empty.

`sentryInit.js` must be loaded **before** the app so Sentry can instrument
Express. Always start the built app with:

```shell
node --import ./public/sentryInit.js public/app.js
```

`yarn start`, `yarn dev`, the Dockerfile and `start-server.ts` already do this.
Without it, errors are still reported but route templates and Express spans
are missing.

All errors that pass through Express are reported, including expected ones
such as 401, 403 and 404 `ApplicationError`s. Traces are sampled at 2% and
profiles at 20% of sampled sessions.

#### What is (not) sent

Personal data must never reach Sentry: IP addresses, email addresses, names,
user IDs, usernames, tokens, credentials and file names. Case references
(`INQ-XXX-XXX`), claim references (`INQC-XXXX-XXXX`), firm codes and firm IDs
may be sent (they are only ever visible as part of a path/URL — there is no
separate reference-tagging mechanism).

- **Sent:** request and outbound-API URLs with their path (every route in
  this app takes only literal, developer-chosen words or a
  `:laaReference`/`:claimReference`/`:claimEvidenceId` reference code, so a
  matched route never carries user input); route templates as transaction
  names, set by Sentry's own Express instrumentation; the status text of
  Axios errors.
- **Never sent:** the user, cookies, headers, request bodies, query strings
  and fragments, local variables, logs and console/HTTP breadcrumbs (disabled
  outright, not scrubbed). Outbound requests to other services (such as
  Entra) keep only scheme and host, since their paths can carry tenant ids or
  signatures. Emails, IP addresses and tokens are redacted from exception
  messages as a generic fallback (`redactText` in `sentry.ts`) for errors
  raised by dependencies we don't control (Axios, Redis, Node internals).
  MSAL and Zod errors never reach Sentry at all: `EntraAuth.adaptor.ts` wraps
  every MSAL call and converts failures to `ApplicationError`, and schema
  validation must use `safeParse`, never `parse`.
- Do not add `Sentry.setUser`, `setExtra`, `setContext`, `setTag` or
  `addBreadcrumb` directly anywhere in application code.

### Initialize pre-commit hooks

Husky hooks are installed via the existing `prepare` script during `yarn install` or `yarn prepare`.

Install secret-scanning prerequisites:

```shell
brew install prek gitleaks
```

Then install prek hooks:

```shell
prek install
```

##### Node Version Manager

You may have to tell your local machine to use the latest version of node already installed on your device, before installing and running the application. Use the following command.

```shell
nvm install node
```

##### Running locally with docker

Prerequisites, Docker Desktop

- To run the docker image

  ```shell
  yarn docker
  ```

  (The application should be running at http://localhost:3000)

- To stop the container

  obtain the container id

  ```shell
  docker ps
  ```

  stop the container

  ```shell
  docker stop {container_id}
  ```

## Cookies Footer Navigation

The cookies footer link includes the current request path and query string as
an encoded `returnTo` parameter. The `setupNavigationData` middleware exposes
this link as `cookiesHref` to templates. This stage only generates the link;
it does not validate or use `returnTo` in the cookies handlers or persist it
through the preferences form.

## Application History Notes

Submitting an empty note on the application overview displays an error summary
and an inline error on the History tab. Selecting History or following the error
summary link keeps those errors visible. Switching to another overview tab clears
the note errors, including their error-related accessibility references, without
discarding draft text. Returning to History does not restore the cleared errors;
submitting another invalid note displays fresh validation errors.

The note-added success banner also clears when leaving History and does not
reappear when returning to the tab. Other success banners are unaffected.

## Claim Status Tags

The claim overview displays one GOV.UK status tag (IDDS-913):

- **Submitted** (blue): the claim is awaiting assessment.
- **Pay in full** (green): the caseworker has selected pay in full.
- **Rejected** (red): the caseworker has rejected the claim.

The claim decision takes precedence over its status. A claim with neither a
decision nor a status displays Submitted rather than a dash.

Both Claims tab tables display columns in this order: Claim reference, Date,
Type of claim, Total amount, Status. Submitted, Pay in full, and Rejected
statuses use the same blue, green, and red GOV.UK tags as the claim overview.

## GitHub Actions

- These have been disabled in this GitHub template repo. Make sure you enable them when setting up your project.

## Licence

[Licence](./LICENSE)

[Standards Link]: https://operations-engineering-reports.cloud-platform.service.justice.gov.uk/public-report/govuk-frontend-express "Change this to point at your repo. Also needs changing in the url in the icon below."
[Standards Icon]: https://img.shields.io/endpoint?labelColor=231f20&color=005ea5&style=for-the-badge&label=MoJ%20Compliant&url=https%3A%2F%2Foperations-engineering-reports.cloud-platform.service.justice.gov.uk%2Fapi%2Fv1%2Fcompliant_public_repositories%2Fendpoint%2Fgovuk-frontend-express&logo=data:image/png;base64,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
