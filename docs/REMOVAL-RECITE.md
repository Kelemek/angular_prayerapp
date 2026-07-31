# Removing Memorization Recite (beta)

Verse Recite is isolated so you can delete it without untangling the core memorization flow. Search the repo for **`@removal-recite`** to find every integration point.

## 1. Delete feature files

```bash
rm -rf src/app/memorization-recite
rm -rf src/app/components/memorization-recite-settings
rm -f src/app/services/memorization-recite.service.ts
rm -f src/app/services/memorization-recite.service.spec.ts
rm -f src/app/services/memorization-recite-settings.service.ts
rm -f src/app/services/memorization-recite-settings.service.spec.ts
rm -f src/app/lib/memorization/memorizationReciteAlignment.ts
rm -f src/app/lib/memorization/memorizationReciteAlignment.spec.ts
rm -f src/app/lib/memorization/isWhisperReciteSupported.ts
rm -rf supabase/functions/transcribe-audio
rm -rf supabase/functions/get-openai-org-usage
```

Optional: remove `src/app/lib/debug-session-log.ts` if it was only added for Recite debugging.

## 2. Revert migrations (production)

If migrations were applied, add a new migration that drops Recite objects (adjust names if your schema differs):

- `admin_settings.memorization_recite_enabled` column
- `memorization_recite_usage` table
- `get_memorization_recite_usage_summary` RPC (and MFA variant)

Or restore from backup if Recite never shipped.

## 3. Frontend integration (grep `@removal-recite`)

| File | What to remove |
|------|----------------|
| `memorization-practice-session.component.ts` | Recite imports, settings state, `ViewChild` practice component, `beginRecitePractice`, close/start-over hooks, `displayPracticeErrors` branch |
| `memorization-practice-session.component.html` | `<app-memorization-recite-practice>`, mode-picker Recite button/copy, hint condition for recite |
| `memorization-practice-session.component.spec.ts` | `describe('recite mode')` block and recite mocks |
| `admin.component.ts` | `MemorizationReciteSettingsComponent` import + template |
| `types/memorization.ts` | `'recite'` from `MemorizationPracticeMode` and Recite-related types |
| `parse-scripture-reference.ts` | `isSingleVerseScriptureReference` if unused elsewhere |
| `android/app/src/main/AndroidManifest.xml` | `RECORD_AUDIO` if not needed elsewhere |
| `ios/App/App/Info.plist` | Microphone usage string if not needed elsewhere |
| `scripts/deploy-functions.sh` | `transcribe-audio`, `get-openai-org-usage` entries |

## 4. Docs and changelog

Remove Recite sections from `docs/CHANGELOG.md`, `docs/DEVELOPMENT.md`, and `docs/SETUP.md`.

## 5. Verify

```bash
npm run pre-handoff
rg -i recite src/ supabase/   # should return nothing (or only unrelated matches)
```

## 6. Supabase secrets (optional)

Unset `OPENAI_ADMIN_KEY` and `OPENAI_API_KEY_ID` if they were only used for the admin usage panel. Keep `OPENAI_API_KEY` if other features use it.
