---
name: review-bugbot-ship
description: >-
  Ship-focused Bugbot review with invariant-driven Custom Instructions. Groups
  findings by root cause and classifies ship-blocker vs harden-later vs ignore.
  Use when the user runs /review-bugbot-ship, wants fewer Bugbot fix cycles,
  or asks for a pre-ship review with invariants instead of open-ended Bugbot.
disable-model-invocation: true
---

# Review Bugbot (ship-focused)

Use this skill when the user asks to run `/review-bugbot-ship`, `/review-bugbot-ship verify`, or wants Bugbot results tuned for **shipping** (fewer cycles, grouped findings, invariant-based).

This skill wraps the same `bugbot` subagent as `review-bugbot`, but adds **invariants**, **ship-blocker filtering**, and **grouped output**. Do **not** fix findings unless the user explicitly asks (e.g. "fix ship blockers").

## Modes

| User says | Mode | Purpose |
|-----------|------|---------|
| `/review-bugbot-ship` | **initial** | First pass before batched fixes |
| `/review-bugbot-ship verify` | **verify** | Second pass after fixes; only new/regression issues |
| `/review-bugbot-ship verify` + pasted invariants | **verify** | Confirms specific invariants still hold |

Default to **initial** when mode is unclear.

## Before launching Bugbot

### 1. Determine scope

- **Repository path**: active workspace root (absolute path).
- **Diff** (same rules as `review-bugbot`):
  - Default: `branch changes`
  - Dirty working tree only: `uncommitted changes`
  - Diff unavailable: `natural language` + `Change Description` (last resort)
- **Base Branch**: only when reviewing against a non-default base (same as `review-bugbot`).
- **Checkout**: if user named a PR/branch, ensure that branch is checked out before launching (same stash/confirm rules as `review-bugbot`).

### 2. Derive invariants (required)

Produce **4–8 testable invariants** for the feature area in this diff. Sources, in order:

1. User-provided invariants in the message (use verbatim)
2. Prior conversation context for this feature
3. Infer from diff + `docs/CHANGELOG.md` / `docs/DEVELOPMENT.md` when this repo changed behavior
4. For this repo, also skim [`.cursor/rules/verify-before-done.mdc`](../../rules/verify-before-done.mdc) logic-review rows that apply (session/cache, rollback, empty vs missing, regression tests)

Write each invariant as a single falsifiable sentence, e.g. "Personal prayer is answered iff `category === 'Answered'`."

**Show the invariant list to the user** in the final summary (brief numbered list).

### 3. Build Custom Instructions

Append the block below to the Bugbot prompt. Fill `{MODE}`, `{INVARIANTS}`, and optional `{PRIOR_GROUPS}`.

**Initial mode** — use when `/review-bugbot-ship` (no `verify`):

```text
Ship-focused review. Report findings only; do not propose code changes unless critical.

Feature invariants (evaluate every write path in the diff against these):
{INVARIANTS}

Rules:
- Group findings by ROOT CAUSE (one row per group, not one row per symptom).
- For each group assign: Ship blocker? (yes | no) and Classification (ship-blocker | harden-later | ignore).
- Ship blocker = wrong user-visible state, data loss, silent corruption, or broken happy path without refresh.
- Harden-later = rare failure paths, partial rollback, theoretical ordering; user can recover via refresh/retry.
- Ignore = style, naming, docs-only nits, or issues outside the invariant list unless ship-breaking.
- Skip findings that duplicate the same root cause already listed under another group.
- Map each group to the invariant ID(s) it violates (e.g. I3).
- Do NOT report medium issues that cannot affect normal happy-path usage unless they violate an invariant.
```

**Verify mode** — use when `/review-bugbot-ship verify`:

```text
Verification pass after fixes. Report findings only.

Invariants to verify (must still hold):
{INVARIANTS}

Previously addressed finding groups (do NOT re-report unless regressed or still present):
{PRIOR_GROUPS}

Rules:
- Report ONLY: (1) new ship-blocking issues, (2) regressions against the invariant list, (3) fixes that introduced a new bug class.
- If a prior issue was "harden-later", mention it only if the latest diff made it worse or it is now user-visible.
- Group by root cause. Classification required: ship-blocker | harden-later | ignore.
- If all invariants hold and no new ship blockers: say so explicitly.
```

If the user did not provide `{PRIOR_GROUPS}` in verify mode, use "None provided — treat as first verify pass against invariants only."

## Launch Bugbot

Launch exactly one `bugbot` subagent:

- `run_in_background: false` unless user asked for background
- `description: "Bugbot ship review"`
- `subagent_type: "bugbot"`

Prompt shape (same as `review-bugbot`, with **Custom Instructions** always included):

```text
Full Repository Path: <absolute repository path>
Diff: <branch changes | uncommitted changes | natural language>
Base Branch: <only when needed>
Change Description: <only when Diff is natural language>
Custom Instructions: <initial or verify block from above, with invariants filled in>
```

Do **not** compute the diff yourself before launching.

### Failure handling

Same as `review-bugbot`:

1. Fix incorrect invocation → retry once immediately.
2. Diff could not be computed → retry once with `Diff: natural language` + `Change Description`.
3. Other failures → retry once with same prompt; if still failing, stop and report the blocker.

## After Bugbot finishes

### Summary structure (required)

1. **One-line verdict**: e.g. "Ready to ship" / "Fix N ship blockers before merge" / "No diff to review".
2. **Invariants checked** (numbered list you derived).
3. **Findings table** — one row per **group** (not per symptom), sorted: ship-blocker first, then harden-later, then ignore:

| Classification | Invariant | Location | Finding |
|----------------|-----------|----------|---------|

- **Location**: primary `file:line` or `file:line–line` for the group.
- **Finding**: one sentence; mention affected paths if multiple files share a root cause.

4. **Recommended next step** (pick one):
   - **Ship** — no ship blockers; optional harden-later called out as follow-ups.
   - **Batch fix** — list ship-blocker groups only; say "fix all groups in one pass, add regression tests, run pre-handoff, then `/review-bugbot-ship verify`."
   - **Design simplify** — if ≥2 groups share the same theme (e.g. dual source of truth), suggest simplifying the model instead of another Bugbot cycle.

### Do not

- Fix code unless the user explicitly asks.
- Run a second Bugbot pass in the same turn unless the first failed and you are retrying per failure handling.
- Chase zero `harden-later` / `ignore` findings before ship.

## Suggested user workflow (mention briefly when helpful)

1. `/review-bugbot-ship` — initial pass with grouped ship-blocker table.
2. Fix **all ship-blocker groups** in one batch + regression tests + `npm run pre-handoff`.
3. `/review-bugbot-ship verify` — paste prior ship-blocker groups if you want regression checking.
4. **Stop** after verify unless a new ship blocker appears.

## Examples

**User:** `/review-bugbot-ship`

Agent derives invariants from the personal-answered diff, launches Bugbot with **initial** Custom Instructions, returns grouped table with classifications.

**User:** `/review-bugbot-ship verify`

Agent reuses invariants from conversation, launches Bugbot with **verify** Custom Instructions, reports only new/regression issues.

**User:** `/review-bugbot-ship` with invariants in the message

Agent uses those invariants verbatim in Custom Instructions (do not paraphrase).

**User:** `/review-bugbot-ship` then "fix ship blockers"

After the review table, implement only rows where Classification = ship-blocker; then run pre-handoff and suggest verify pass.
