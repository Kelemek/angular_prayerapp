# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **Church Prayer Manager** — an Angular 21 web app with a Supabase backend (hosted). The frontend is the only service needed for local development; the Supabase backend runs remotely with credentials already committed in `src/environments/environment.ts`.

### Running the app

- **Dev server:** `npm start` (alias for `ng serve`) — serves on `http://localhost:4200`
- The app connects to a hosted Supabase project; no local database or Docker is needed.

### Testing

- **Unit tests:** `npx vitest --run` (106 test files, 5100+ tests). Do **not** use `npm test` without `--run` — it starts watch mode.
- **E2e tests:** `npm run e2e` (Playwright). Requires `npx playwright install` first.
- See `docs/DEVELOPMENT.md` § Testing for more commands and coverage.

### Code quality

- **Lint:** `npm run lint` calls `ng lint`, but the Angular project currently has no lint architect target in `angular.json`, and `eslint.config.js` imports React plugins that are not installed. Lint is a pre-existing gap — do not attempt to fix it unless asked.
- **TypeScript type-check:** Use `npx ng build --configuration development` to validate types (no standalone `type-check` script exists).
- **Build:** `npm run build` (production) or `npx ng build --configuration development` (dev).

### Key paths and scripts

- See `docs/DEVELOPMENT.md` § Useful Commands for the full script list.
- `src/environments/environment.ts` — dev Supabase credentials (already set).
- `supabase/functions/` — Edge Functions (Deno); only needed if modifying backend logic.
