# Memorization Recite (beta)

Optional feature: Whisper-backed verse recitation practice and admin controls.

**To remove this feature**, follow [docs/REMOVAL-RECITE.md](../../docs/REMOVAL-RECITE.md).

## Layout

| Path | Role |
|------|------|
| `integration.ts` | Mode constant + availability helper |
| `memorization-recite-practice.component.*` | Practice UI + recording (used by practice session) |
| `../components/memorization-recite-settings/` | Admin settings card |
| `../services/memorization-recite*.ts` | Client services |
| `../lib/memorization/memorizationReciteAlignment.ts` | Alignment engine |
| `../lib/memorization/isWhisperReciteSupported.ts` | Platform guard |
| `../../supabase/functions/transcribe-audio/` | Whisper edge function |
| `../../supabase/migrations/20260721120000_memorization_recite_mode.sql` | DB schema |

Integration in the main app is marked with `// @removal-recite` comments.
