# GitHub Copilot Instructions — laa-inquests-internal-ui

## 1. Before Starting Any Feature

1. **Ask for the Jira ticket ID** (`IDDS-XXX`) if not provided.
2. **Clarify any ambiguous requirements** before writing code.
3. **Run the tests** to confirm a clean baseline: `yarn test`.
4. **Find the nearest analogous existing feature** (e.g. `ClientDetailsAdaptor`) and follow the same pattern exactly.

## 2. Workflow

- **Start by writing E2E tests.** Wait for approval before continuing.
- **Then develop one unit test at a time.** Write the test, make it pass with minimum code, wait for approval before the next.
- **Run tests after every change.** New tests must fail first, then pass after implementation. Fix code, not tests, if refactoring breaks them.
- **NEVER install a new dependency.** Stop and recommend a dependency for the user to install.
- **All code MUST match the architecture** — Ports and Adaptors (Hexagonal). Keep business logic out of routes and views.
- **When finished**, run all checks and update documentation.

### Checks before completing any task

```bash
yarn lint:fix
yarn lint   # ESLint + Prettier
yarn tsc    # TypeScript type check
yarn test   # RUN ALL tests, do NOT run yarn test:unit
```

### When editing existing files

- Make surgical changes only. Do not refactor unrelated code.
- Do not change test assertions without understanding why they were written that way.
- Fix linting failures — do not suppress rules unless unavoidable and justified.

If these instructions do not cover a specific case, stop and ask.

## 3. Architecture Rules

This project uses **Ports and Adaptors (Hexagonal Architecture)**:

- **Ports** (`src/ports/`) — TypeScript interfaces only. No implementation.
- **Source Adaptors** (`src/adaptors/source/`) — implement ports, contain Axios HTTP logic.
- **Presenter Adaptors** (`src/adaptors/presenters/`) — handle request/response, render views, delegate to validators and source adaptors.
- **Validators** (`[Feature].validator.ts`) — extend `FormValidator`, validation logic only.
- **Routes** (`src/infrastructure/express/routes/`) — route bindings only, no business logic, use `createXRouter` factory pattern.
- **Views** (`src/views/`) — Nunjucks templates, logic-free.

Wire all dependencies manually in `src/infrastructure/express/routes/index.ts`. Do not use a DI framework.

### Adding a new API operation

1. Define a port interface in `src/ports/source/inquests-api/[Operation].port.ts`.
2. Implement it in `src/adaptors/source/inquests-api/apply/[Operation]/[Operation].adaptor.ts`.
3. Define request/response types in `.../[Operation]/models/[Operation].types.ts`.
4. Define a Zod schema for the response in `src/adaptors/models/`.
5. Wire the adaptor in `src/infrastructure/express/routes/index.ts`.

Use Axios injected via the constructor. Never instantiate Axios inside an adaptor method.

## 4. Coding Conventions

- TypeScript throughout. Use ES modules (`import`/`export`), never `require()`.
- Always use the `#src/` path alias. Always include `.js` extensions in imports. Use `import type` for type-only imports.
- All user-facing strings in `src/infrastructure/locales/en.json`. Never hardcode UI copy in TypeScript.
- Magic numbers and strings → `src/infrastructure/locales/constants.ts`.
- No `console.log` in production code. Use the logger middleware.
- Validation errors must render the form with `errorSummaries` — never throw.
- Always handle rejected promises explicitly.
- Templates contain **no** business logic. Use GOV.UK Frontend macros for all standard components.
- Do not access `process.env` directly — use the typed `config` object in `src/infrastructure/config/config.ts`.

### Naming

| Thing                 | Convention                  | Example                         |
| --------------------- | --------------------------- | ------------------------------- |
| Files/folders         | `camelCase`                 | `clientDetails.router.ts`       |
| Classes               | `PascalCase`                | `ClientDetailsAdaptor`          |
| Interfaces            | `PascalCase`, no `I` prefix | `ClientDetailsFormData`         |
| Constants             | `UPPER_SNAKE_CASE`          | `EMPTY_ARR_LENGTH`              |
| Variables / params    | `camelCase`                 | `clientFirstName`               |
| Private class methods | `#camelCase`                | `#formatProceedingOptions`      |
| Nunjucks templates    | `kebab-case.njk`            | `name-and-dob.njk`              |
| URL paths             | `kebab-case`                | `/client-details/name-and-dob`  |
| HTML form field names | `kebab-case`                | `first-name`, `dob-day`         |
| Test files            | `[Name].spec.ts`            | `ClientDetails.adaptor.spec.ts` |

## 5. Testing Standards

### Unit Tests (Mocha + Sinon)

- Every adaptor method needs a happy path test and an error/validation path test.
- Test files mirror `src/` structure under `tests/unit/`.
- Use `import { strict as assert } from "assert"` for assertions.
- Use `stubInterface<T>()` from `ts-sinon` to stub `Request` and `Response`.
- Test names read as sentences: `it("redirects to nino form when name is valid")`.
- Test observable behaviour (redirects, renders, session writes) — not implementation details.
- Validators must have their own spec files, separate from adaptor specs.

### E2E Tests (Playwright)

Each journey step must cover:

- The happy path
- Each validation error
- Back and continue/submit buttons
- CSRF (if a form page)

Develop utility functions per step (e.g. functions in `form-validation-utils.js`).

## 6. Exploration

Always output exploration and plans as a markdown file in the session folder, not in the repo.
