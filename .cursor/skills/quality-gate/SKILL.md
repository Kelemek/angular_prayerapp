---
name: quality-gate
description: >-
  Run the Prayer App quality gate on the current branch diff versus the default
  base (origin/HEAD, else origin/main). Hard checks are npm run pre-handoff and
  npm run build, then thermo-nuclear review, one Bugbot attempt, and a
  verify-prayerapp pointer when the diff touches UI. Use when the user says
  quality gate, /quality-gate, or asks to check the working diff before a PR.
---

# Quality gate

One check for the diff on the current branch. It applies to whatever you are working on. It does not replace GitHub CI, and it does not merge.

The procedure lives in this file. Cloud agents do not need a skill installed outside the repo.

## When to use

- The user says quality gate, `/quality-gate`, or asks to check the working diff.
- Before opening a PR, on the branch you are about to hand off.

## Diff

From the repo root:

1. Default base: the branch `origin/HEAD` points at, otherwise `origin/main`. A base the user names wins.
2. `git fetch origin <base>` (continue with the local ref if the fetch fails).
3. Review all of:
   - `git diff origin/<base>...HEAD`
   - `git diff`
   - `git diff --cached`
4. If all three are empty, stop and say there is nothing to review.

```bash
BASE="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || true)"
BASE="${BASE#origin/}"
if [ -z "$BASE" ]; then
  BASE=main
fi
git fetch origin "$BASE" 2>/dev/null || true
git diff "origin/${BASE}...HEAD"
git diff
git diff --cached
```

`git symbolic-ref` prints `origin/main` when `origin/HEAD` is set. `git rev-parse --abbrev-ref origin/HEAD` prints `HEAD` when that ref is missing, so do not use it to detect the base.

## 1. Hard checks (required)

Never watch mode. Do not run `npm test` without `--run`.

```bash
npm run pre-handoff
npm run build
```

`npm run pre-handoff` (`scripts/pre-handoff.js`) is lint, typecheck, unit tests, and Edge Function Deno tests:

| Command | What it runs |
|---------|----------------|
| `npm run lint` | ESLint, errors only (`--quiet`) |
| `npm run verify` | `npm run typecheck` (`ng build --configuration development`), then `npm test -- --run` (Vitest, one shot) |
| `npm run test:deno` | Edge Function Deno tests with the frozen lockfile |

`pre-handoff` does not run production `npm run build` (`node scripts/write-web-build-info.mjs && ng build`). Run that second command as well.

After both commands:

- **ReadLints** on every file this diff created or edited. Fix errors. Fix warnings you introduced.
- **Logic review** from `.cursor/skills/pre-handoff/SKILL.md` and `.cursor/rules/verify-before-done.mdc`. Answer each row that applies to this diff.

Re-run the hard checks after every fix. If a check fails because this change broke it, fix it. If it fails for a reason unrelated to this diff, report the command and the failure. Do not claim the gate passed.

Do not add another test runner, a model checker, or a formal-verification pass.

## 2. Thermo-nuclear review

Start only after the hard checks pass. Do not claim **Approve** while they are failing.

1. Read the rubric. The plugin hash can change. Use the newest match:

   `~/.cursor/plugins/cache/cursor-public/677/*/skills/thermo-nuclear-code-quality-review/SKILL.md`

2. Review `git diff origin/<base>...HEAD` plus uncommitted changes against that rubric. On this image the subagent type `thermo-nuclear-code-quality-review` is valid. One review is enough: either launch that subagent with the diff, or apply the rubric yourself. Do not run both.
3. Verdict: **Approve** or **Not approve**.
4. **Not approve:** fix blockers and high-conviction structural issues this change introduced. Leave style-only nits and labeled follow-ups unless the user asked to fix everything.
5. After code fixes: hard checks, then this review again.

Stop at **Approve**, or after 5 iterations (report the remaining follow-ups and ask whether to continue).

## 3. Bugbot (try once)

Try once, after the hard checks pass and thermo-nuclear is **Approve**.

On these cloud agents, subagent type `bugbot` is invalid and `~/.cursor/skills-cursor/review-bugbot/SKILL.md` is not present. Launch **one** `bugbot` subagent (`run_in_background: false`) with:

```text
Full Repository Path: <repo root>
Diff: branch changes
```

Use `Diff: uncommitted changes` only when the review is limited to the dirty tree.

If the launch is rejected, record **Bugbot not available** and continue. That is not a gate failure. Do not retry. Do not invent findings.

If Bugbot does launch, summarize findings as Severity, Location, Finding. Fix valid bugs this change introduced. Dismiss false positives in one line. Re-run the hard checks after those fixes. One launch is enough. Do not loop until clean.

## 4. Browser drive (only when the diff needs it)

When the diff touches UI, routes, auth, or admin screens, say to run `.cursor/skills/verify-prayerapp/SKILL.md` for the affected feature. Do not block this gate on MFA admin login. Signed-in journeys stay operator-driven.

Docs-only diffs and pure-logic diffs skip the browser drive.

## 5. Report

| Gate | Result |
|------|--------|
| pre-handoff | pass / fail (command) |
| build | pass / fail |
| ReadLints | clean / findings |
| Logic review | rows that applied |
| Thermo-nuclear | Approve (iteration N) / Not approve |
| Bugbot | Bugbot not available, or findings from the single launch |
| Browser | skipped, or run verify-prayerapp for the affected feature |

List deferred follow-ups.

Commit and push only when the user asked in the same turn. Do not merge.

## Home-directory loop

A generic loop installed outside this repo may read `.cursor/skills/quality-gate-loop/overrides.md` for the same two commands. That file is a pointer. This skill is the procedure, and it stands alone without that loop.
