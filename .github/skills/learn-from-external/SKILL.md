---
name: learn-from-external
description: Learn architecture and coding patterns from ministryofjustice/laa-inquests-external-ui, map them to this repo, and propose or apply aligned changes safely.
---

# learn-from-external

Use this skill to learn implementation and architecture patterns from `ministryofjustice/laa-inquests-external-ui` and apply equivalent patterns in this repository (`laa-inquests-internal-ui`).

## Purpose

When asked to "do it like external" or "match external architecture", this skill should:

1. Inspect external's implementation for the requested concern.
2. Distill reusable patterns (not copy/paste business specifics).
3. Map those patterns to internal equivalents.
4. Propose or apply scoped changes in internal.
5. Verify and report what changed and why.

## When to use

Use this skill when the user asks to:

- mirror, match, align with, or port from external
- compare internal vs external implementation
- adopt external's hexagonal architecture patterns
- replicate adaptor/port/presenter/infrastructure/test style from external

Trigger phrases include:

- "look at external and make the same change here"
- "use external's hexagonal architecture pattern"
- "how does external do this? apply it here"
- "align internal implementation with external"

## Inputs you should confirm

Before implementation, confirm these if unclear:

- feature scope (single endpoint/use case vs full flow)
- strictness (`advisory`, `guided`, `apply`)
- acceptable refactor breadth (minimal patch vs structural realignment)
- whether tests should be added/updated in same pass

If the user is explicit, proceed without extra questions.

## Operating mode

### `advisory`

- Analyze only.
- Provide mapping, recommendations, and risks.
- No code edits.

### `guided`

- Provide concrete patch plan and draft edits.
- Ask for confirmation before writing changes.

### `apply`

- Implement scoped changes directly in internal.
- Run relevant checks/tests.
- Report results and residual risks.

Default mode: `guided`.

## Required workflow

1. **Locate equivalents in both repos**
   - Find relevant modules in external and internal.
   - Start from external's architecture and discover corresponding internal touchpoints, even if they are currently structured differently.

2. **Extract external pattern**
   - Summarize the pattern as portable rules:
     - dependency direction
     - boundary responsibilities
     - data transformation placement
     - error handling strategy
     - naming conventions
     - test shape

3. **Map external -> internal**
   - Produce file-to-file or layer-to-layer mapping.
   - Highlight missing internal seams and structural differences.

4. **Delta assessment**
   - State current internal mismatch clearly.
   - Separate required architectural shifts from optional refinements.

5. **Implement alignment to external intent**
   - Prefer coherent end-to-end alignment with external patterns.
   - Apply structural refactors when needed to match requested parity.
   - Do not treat internal's existing layering as a design constraint.

6. **Verify**
   - Run all testing and linting.

7. **Report with evidence**
   - Include external evidence paths and internal changed paths.
   - Explain decisions and tradeoffs briefly.

## Guardrails

- Do not copy external business content verbatim.
- Transfer architecture/coding patterns, not environment-specific details.
- Keep external repository read-only for this task.
- Do not broaden scope without user consent.
- If multiple external patterns exist, choose the closest feature match and state why.
- If external cannot be accessed, state limitation and stop before architecture recommendations that rely on assumptions.

## External repo access (mirror mode)

Default to a temporary local mirror inside this workspace:

- Mirror path: `.external-mirror/laa-inquests-external-ui`
- Use mirror for read-only inspection only.
- Never edit files in the mirror.
- Never include mirror files in commits.

Cleanup rule (required after each task):

- Delete `.external-mirror/laa-inquests-external-ui` once analysis/changes are complete.
- Confirm outputs cite evidence paths before cleanup.

If mirror setup fails, fall back to remote read methods and report the fallback.

## Response format

Use this structure when returning results:

1. **Pattern found in external**
2. **Current state in internal**
3. **Proposed or applied changes** (files + intent)
4. **Risks / assumptions**
5. **Verification run** (what was executed, pass/fail)
6. **Next options** (small numbered choices)

## Evidence format

When citing source, include:

- repo (`external` or `internal`)
- file path
- symbol/function/class (if relevant)
- short reason it matters

Example:

- `external: src/adaptors/source/FooApiAdaptor.ts#mapError` - maps transport errors to domain-safe result type.

## Common task recipes

### Recipe: "Match external hexagonal architecture for this feature"

- Identify the external feature flow first.
- Find the internal implementation touchpoints for the same behavior.
- Align dependency direction and seam boundaries to external's model.
- Then align error/DTO mapping strategy.
- Finally align tests for the new architecture behavior.

### Recipe: "Port external API client pattern to internal"

- Compare external client port and adaptor split.
- Introduce or reshape internal contracts to match external boundaries.
- Refactor implementations to follow the external dependency model.
- Update wiring where dependencies are composed.
- Add unit tests around mapping/error handling at the new seams.

### Recipe: "Adopt external test pattern"

- Copy test shape and assertions strategy, not fixture literals.
- Mirror naming and scenario decomposition.
- Ensure failures remain actionable and deterministic.

## Example prompts this skill should handle

- "Look at the implementation of hexagonal architecture in external and make the same change here."
- "Compare how external structures ports/adaptors for the inquests API and align our internal flow."
- "Use external's presenter pattern for this page and update tests."
- "Show me where we diverge from external's boundary validation approach and patch only the critical differences."

## Definition of done

Task is complete when:

- requested pattern was found and evidenced from external,
- internal changes are scoped and aligned to that pattern,
- checks/tests for touched behavior were run (or constraints explained),
- response clearly states what changed, why, and what remains optional.
