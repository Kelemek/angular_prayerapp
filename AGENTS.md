# Agent instructions (Prayer App)

Before marking work **complete**, follow the **pre-handoff** workflow:

1. Run **`npm run pre-handoff`** (lint + typecheck + unit tests + Edge Function Deno tests). **Required** — a Cursor **`stop` hook** (`.cursor/hooks.json`) will auto-continue the agent with a reminder if `src/app`, `src/lib`, or `supabase/migrations` changed and pre-handoff has not passed for the current diff.
2. **`ReadLints`** on all touched files.
3. Complete the **logic review** checklist (session/RxJS, cache invalidation, async races, regression tests).

| Resource | Purpose |
|----------|---------|
| [`.cursor/skills/pre-handoff/SKILL.md`](.cursor/skills/pre-handoff/SKILL.md) | Full end-of-task workflow |
| [`.cursor/rules/verify-before-done.mdc`](.cursor/rules/verify-before-done.mdc) | Always-on rules + logic review table |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#verify-before-merge-or-agent-handoff) | Commands for humans and CI |

**`npm run verify` alone is not enough** — it does not catch logout/re-login dedupe bugs, missing cache invalidation, or race conditions. Bug fixes need regression tests in the same change.
