# User settings and theme

Signed-in users open Settings from home to manage profile, notifications, display theme (light/dark/system), and related preferences.

## Sub-features

- **settings-modal** — opens from home header / gear affordance.
- **theme-preference** — light, dark, or follow system.
- **notification-toggles** — email preferences where exposed to the member.

## How to get to it (user POV)

- Home (signed in) → open Settings.
- Change theme; UI should reflect `dark:` Tailwind tokens without reload errors.

## Driving it with Playwright (npx)

Preconditions:

- MFA session on test Supabase only.

Steps:

- **Not automated** — modal is behind auth. Operator captures settings sheet with theme section visible.
- Public shell check does not cover settings (see [Home route gate](./home-gate.md)).

## Gotchas

- Theme may persist in `localStorage` / Preferences on native; web verify uses isolated Playwright context each run.
- Capacitor/iOS layout differs; this skill targets `ng serve` web unless operator records native separately.
