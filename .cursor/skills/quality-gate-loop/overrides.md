# Prayer App command overrides

The procedure is [`.cursor/skills/quality-gate/SKILL.md`](../quality-gate/SKILL.md). This file only names the commands a generic loop should run in this repo.

## Hard checks

Never watch mode. Do not run `npm test` without `--run`.

```bash
npm run pre-handoff
npm run build
```

`npm run pre-handoff` already runs lint, `ng build --configuration development`, `npm test -- --run`, and `npm run test:deno`. Production `npm run build` is separate. Do not add another test runner.

If `bugbot` cannot launch, record **Bugbot not available** and continue. Do not fail the gate for that. Every other rule is in the skill.
