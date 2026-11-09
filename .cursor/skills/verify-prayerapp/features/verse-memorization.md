# Verse memorization

Home **Memorize** filter shows memorized passages, practice flow, and add-verse affordances tied to `MemorizationService` (RLS on memorized items).

## Sub-features

- **memorize-tab** — `/?filter=memorize` or Memorize chip selects the panel.
- **add-verse** — add memorized passage (translation selection).
- **practice-flow** — practice modal / keyboard bridge for typed recall.

## How to get to it (user POV)

- Home → **Memorize** filter (or deep link `/?filter=memorize`).
- Add verse, open practice on an existing item.

## Driving it with Playwright (npx)

Preconditions:

- Signed-in user on test project `jcdhajfqtzipltvfslhu`.
- Scripture attributions on `/privacy` are public; see [Privacy page](./privacy.md) for marketing/legal shell only.

Steps:

- **Not automated** — memorized items are JWT-scoped. Operator screenshot after MFA showing Memorize tab (`data-testid="memorize-keyboard-bridge"` may appear when practice opens).
- Deep link check: after login, manually open `/?filter=memorize` and confirm panel loads (unit tests cover routing; agents still need visual proof for handoff).

## Gotchas

- ESV / API.Bible attribution strings live on privacy page; memorization content is not proven via `/info` alone.
- Practice mode uses hidden inputs for keyboard focus; empty list states are valid — distinguish “loaded empty” from RLS errors.
