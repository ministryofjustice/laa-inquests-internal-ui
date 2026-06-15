---
name: snyk-ignore-cleanup
description: Audit the .snyk ignore list against live Snyk vulnerability data and remove entries whose affected version ranges no longer cover the installed versions in yarn.lock.
---

# snyk-ignore-cleanup

Use this skill to audit `.snyk` and remove ignore entries for vulnerabilities that have already been fixed by current dependencies.

## Purpose

Over time, vulnerabilities get patched and dependencies get upgraded. Ignore entries in `.snyk` that were added as temporary workarounds should be removed once the installed version satisfies the fix threshold. This skill automates that audit and produces a clean `.snyk`.

## When to use

Use this skill when the user asks to:

- audit or review `.snyk` ignores
- remove fixed or resolved Snyk vulnerabilities
- clean up the `.snyk` file
- check which Snyk ignores are still needed

Trigger phrases include:

- "clean up .snyk"
- "remove fixed snyk ignores"
- "which snyk vulnerabilities have been fixed?"
- "audit our snyk ignore list"

## Required workflow

### 1. Parse `.snyk`

Read `.snyk` and extract the full list of ignored vulnerability IDs and their stated reasons.

### 2. Read installed versions from `yarn.lock`

For every ignored vulnerability ID, determine the affected package by fetching `https://security.snyk.io/vuln/<ID>` (done in step 3) and reading the package name from the page title or overview. Do not maintain a hardcoded list — derive the package name dynamically for every entry found in `.snyk`.

Once the package name is known, search `yarn.lock` for all resolved versions of that package. Note all resolved versions — some packages appear multiple times under different semver ranges.

If the package is not present in `yarn.lock` at all (e.g. Alpine OS packages, packages bundled inside npm itself), classify it as **Cannot assess** and note the blocker.

### 3. Fetch fix thresholds from Snyk

For each ignored ID, fetch `https://security.snyk.io/vuln/<ID>` and extract:

- **Affected versions** (the vulnerable range)
- **Fix version** (the minimum safe version from the "How to fix?" section)

### 4. Classify each entry

For each ignore entry, determine:

- **Fixed**: every resolved version in `yarn.lock` is ≥ the fix threshold → safe to remove.
- **Partially fixed**: some resolved versions are fixed, others are not → keep with updated reason.
- **Still open**: all resolved versions remain in the vulnerable range → keep as-is.
- **Cannot assess** (e.g. Alpine OS packages, npm-bundled packages not in `yarn.lock`) → keep as-is, note the blocker.

An entry is only classified as **Fixed** if **all** resolved versions of that package in `yarn.lock` satisfy the fix threshold. If any copy of the package is still in the vulnerable range, the entry must be kept.

### 5. Report findings

Present a summary table before making any changes:

| ID            | Package | Fix threshold | Installed version(s) | Status   |
| ------------- | ------- | ------------- | -------------------- | -------- |
| `SNYK-JS-...` | `qs`    | `>= 6.14.2`   | `6.15.1`             | ✅ Fixed |
| ...           | ...     | ...           | ...                  | ...      |

### 6. Apply changes

Remove only the entries classified as **Fixed**. Do not modify entries that are still open, partially fixed, or cannot be assessed.

Edit `.snyk` directly. Preserve the `version: v1.5.0` header and all remaining entries exactly as they appear — including whitespace and comments.

### 7. Verify

After editing, re-read `.snyk` and confirm:

- The removed entries are gone.
- All remaining entries are intact and valid YAML.
- The `version:` header is unchanged.

## Guardrails

- Never remove an entry unless the installed version is confirmed to be ≥ the fix threshold.
- Never remove entries for Alpine/OS-level CVEs — these cannot be verified from `yarn.lock`.
- Never remove entries for npm-bundled packages (minimatch, tar, picomatch, pacote, brace-expansion when noted as "bundled with npm"). These packages are shipped inside the npm binary itself — Snyk scans npm's own internal dependency tree (e.g. `npm@x.y.z > ... > brace-expansion@5.0.4`), which is independent of what `yarn.lock` resolves. Even if `yarn.lock` shows a fixed version of the package, the npm-bundled copy may still be vulnerable. Only remove these entries once the npm version bundled in the project's Node/npm environment ships a fixed version of the affected package.
- If the Snyk page is unreachable for a given ID, skip that entry and note it in the report.
- Do not alter the `.snyk` structure, indentation, or YAML format beyond removing resolved blocks.
- Default operating mode is `guided` — present the findings table and wait for confirmation before editing the file, unless the user explicitly says to apply.
