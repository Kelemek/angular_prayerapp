# Setup & Deployment Guide

Complete guide to setting up, configuring, and deploying the Prayer App.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Email Configuration](#email-configuration)
5. [Planning Center Integration](#planning-center-integration)
6. [Deployment](#deployment)
7. [Post-Deployment](#post-deployment)

---

## Local Development Setup

### Prerequisites

- Node.js **22.22.3+** (Angular 22 minimum; Node 20 is not supported) and npm 9+
- Git
- Supabase account (free tier available)
- Microsoft 365 account (for email)
- Planning Center account (optional, for contact lookup)

### Installation

```bash
# Clone repository
git clone https://github.com/cp-church/angular_prayerapp.git
cd angular_prayerapp

# Install dependencies (use Node 22.22.3+ — `nvm use` reads `.nvmrc`; see nvm/fnm if `ng` reports a Node version error)
npm install

# Start development server
npm run dev

# Navigate to http://localhost:5173
```

### Database Migrations

Migrations are run automatically. To manually migrate:

```bash
# Using Supabase CLI
supabase db push

# Or through Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Run migration files in supabase/migrations/
```

### PWA Icons & Favicon

The app uses a PWA (Progressive Web App) with custom icons. To regenerate icons:

1. **Prepare source image**
   - Save your image as `public/icon-source.png`
   - Should be square and at least 1024px × 1024px

2. **Install sharp** (if not already installed):
   ```bash
   npm install --save-dev sharp
   ```

3. **Generate icons**
   ```bash
   npm run generate-icons
   ```

This creates the following files:
- `public/icons/icon-192.png` - PWA home screen icon
- `public/icons/icon-512.png` - PWA splash screen icon
- `public/icons/maskable-icon-512.png` - Maskable PWA icon
- `public/apple-touch-icon.png` - iOS home screen icon
- `public/favicon-32.png` - Standard favicon
- `public/favicon-16.png` - Alternative favicon

The PWA manifest (`public/manifest.json`) and `src/index.html` reference these files automatically.

---

## Environment Configuration

### Create `.env.local`

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Azure/Microsoft
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_AZURE_CLIENT_ID=your-client-id

# Planning Center (optional)
VITE_PLANNING_CENTER_API_TOKEN=your-token

# Analytics (PostHog — session replay, product analytics, error tracking)
VITE_POSTHOG_KEY=phc_your_project_api_key
# First-party reverse proxy (ingestion); must forward to us.i.posthog.com with Host header set
VITE_POSTHOG_HOST=https://t.cp-church.org
# PostHog app UI (toolbar, replay player in dashboard) — not proxied
VITE_POSTHOG_UI_HOST=https://us.posthog.com
```

### GitHub Secrets

For GitHub Actions to work, add these secrets (still required for workflows that invoke Supabase, e.g. `process-email-queue`, backup/restore):

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
AZURE_TENANT_ID
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
MAIL_SENDER_ADDRESS
GITHUB_PAT (for workflow dispatch)
VAPID_PUBLIC_KEY (for push notifications, if enabled)
VAPID_PRIVATE_KEY
```

---

## Database Setup

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save connection string and API keys
4. Copy to `.env.local`

### Run Migrations

```bash
# Option 1: Via Supabase CLI
npm install -g supabase
supabase db push

# Option 2: Via Supabase Dashboard
# SQL Editor > Run migrations manually
```

### User prayer / memorization / per-prayer reminders (Vault + pg_cron)

Migration `20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql` upgrades Settings prayer and memorization slots to **15-minute** matching, reschedules jobs **`invoke-user-hourly-prayer-reminders`** and **`invoke-user-hourly-memorization-reminders`** to **`*/15 * * * *` UTC**, adds **`invoke-user-prayer-item-reminders`** for per-prayer reminders (Edge Function `send-user-prayer-item-reminders`, including latest-update email HTML), and installs triggers that remove per-prayer reminder rows when a prayer is deleted, archived, or answered. It is **safe to re-run** in the SQL editor. Apply **`20260805120000_reminder_item_followups.sql`** after that (idempotent): prompt reminders, purge RPC lockdown, unique schedule indexes, per-channel delivery columns, and partial-retry due-now RPC. Redeploy `send-user-prayer-item-reminders` after applying.

Vault secrets (unchanged names):

| Secret name | Value |
|---------------|--------|
| `project_url` | Your project API URL, e.g. `https://YOUR_PROJECT_REF.supabase.co` (no trailing slash) |
| `service_role_key` | **service_role** JWT from **Settings → API** (same value as GitHub secret `SUPABASE_SERVICE_KEY`) |

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_JWT', 'service_role_key');
```

If these already exist from another setup, do not duplicate them—only the names must match.

**Extensions**: If `supabase db push` fails on `CREATE EXTENSION`, enable **pg_net** and **pg_cron** in the Dashboard (**Database → Extensions**) and re-run the migration or apply the SQL from the migration file manually.

Deploy Edge Functions after applying the migration:

```bash
supabase functions deploy send-user-hourly-prayer-reminders
supabase functions deploy send-user-hourly-memorization-reminders
supabase functions deploy send-user-prayer-item-reminders
```

Verify schedules: `select jobname, schedule from cron.job where jobname like 'invoke-user-%reminder%';` (expect `*/15 * * * *`).

**Admin → Settings → Email** still controls prayer/memorization **email templates** (spotlight vs simple). Per-prayer reminders use template key **`user_prayer_item_reminder`**.

### Community prayer reminders (`send-prayer-reminders`)

Migration `20260317120000_schedule_send_prayer_reminders_cron.sql` registers a **daily** job (`invoke-send-prayer-reminders`, **`0 10 * * *` UTC**) that POSTs to the Edge Function **`send-prayer-reminders`** (reminder emails + auto-archive per `admin_settings`). Uses the **same Vault secrets** as above (`project_url`, `service_role_key`).

**Verify manually** (after secrets exist):

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
    || '/functions/v1/send-prayer-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 300000
);

select id, status_code, content, error_msg
from net._http_response
order by created desc
limit 5;
```

Check **Edge Functions → send-prayer-reminders → Logs**. Confirm schedule: `select * from cron.job where jobname = 'invoke-send-prayer-reminders';`

### Device token cleanup (`cleanup-device-tokens`)

Migration `20260318120000_schedule_cleanup_device_tokens_cron.sql` registers a **daily** job (`invoke-cleanup-device-tokens`, **`0 3 * * *` UTC**) that POSTs to the Edge Function **`cleanup-device-tokens`** (stale `device_tokens` and old `push_notification_log` rows). Uses the **same Vault secrets** (`project_url`, `service_role_key`).

**Verify manually** (after secrets exist):

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
    || '/functions/v1/cleanup-device-tokens',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
);

select id, status_code, content, error_msg
from net._http_response
order by created desc
limit 5;
```

Confirm schedule: `select * from cron.job where jobname = 'invoke-cleanup-device-tokens';`

### Database Tables

Key tables created by migrations:

- `prayers` - Prayer requests
- `prayer_updates` - Prayer status updates
- `prayer_deletion_requests` - Deletion requests
- `email_subscribers` - Email opt-in/out and per-user preferences (including `show_pray_for_button` and `show_praying_count` for Prayer Encouragement card UI; see [CHANGELOG](CHANGELOG.md))
- `email_queue` - Email processing queue
- `admin_users` - Admin access list
- `admin_settings` - App configuration
- `email_templates` - Email HTML templates

---

## Email Configuration

### Microsoft 365 Setup

1. **Register Azure App**
   - Go to [Azure Portal](https://portal.azure.com)
   - Azure Active Directory > App Registrations > New registration
   - Name: "Prayer App"
   - Redirect: (leave blank for backend)
   - Click Register

2. **Create Client Secret**
   - Certificates & Secrets > New client secret
   - Expiry: 24 months
   - Copy secret value to `AZURE_CLIENT_SECRET`

3. **Grant Mail Permissions**
   - API Permissions > Add permission
   - Microsoft Graph > Application permissions
   - Search "Mail.Send"
   - Grant admin consent

4. **Configure in App**
   - Copy `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` to `.env.local`
   - Email sender address to `MAIL_SENDER_ADDRESS`

### Email Templates

Templates are stored in Supabase `email_templates` table (keys such as `approved_prayer`, `denied_prayer`, `prayer_answered`, `subscriber_welcome`, `verification_code`, hourly reminder keys, admin notifications, and account-access templates). Edit them in **Admin → Settings → Email Templates**, or via SQL migrations that `UPDATE` `html_body`.

**Outlook desktop (Windows)**: The Word HTML engine ignores CSS gradients and often strips `<style>` blocks, so headers and buttons can look broken in desktop Outlook while Outlook on the web looks fine. Migration [`20260710120000_email_templates_outlook_desktop_safe.sql`](../supabase/migrations/20260710120000_email_templates_outlook_desktop_safe.sql) rewrites `html_body` for all current template keys with solid colors + nested tables + inline styles. Subjects and plain-text bodies are unchanged.

**Apply order (required):**
1. Apply the migration to a **test** Supabase project (or restore a DB backup into a scratch project).
2. Send sample emails for a few keys (`verification_code`, `approved_prayer`, `admin_invitation`, `subscriber_welcome`) and open them in **Outlook desktop**, Outlook web, and Gmail/Apple Mail.
3. Only then apply the same migration to **production**.

Do not rely on Admin UI paste alone for a full rollout — the migration is the source of truth for the Outlook-safe shells.

### Email Queue Processing

Email queue is processed by GitHub Actions workflow:

```yaml
# .github/workflows/process-email-queue.yml
# Runs every 5 minutes
# Processes up to 20 emails per run
# Respects Microsoft Graph rate limits
```

---

## Planning Center Integration

### Setup

1. Get Planning Center API token
   - Sign in to Planning Center
   - Settings > API Tokens
   - Create new token
   - Copy token to `VITE_PLANNING_CENTER_API_TOKEN`

2. The app will automatically:
   - Look up contacts when user enters email
   - Auto-populate name and phone from Planning Center
   - Link prayers to Planning Center contacts

### Members List Mapping

The app supports mapping email subscribers to Planning Center lists. This allows users to view prayers filtered by specific list members.

**How it works:**

1. **Admin Configuration** (Admin > Planning Center List Mapping):
   - Search for an email subscriber
   - Select a Planning Center list (e.g., "Small Group A")
   - Map subscriber to list
   - Subscriber can now filter prayers by list members

2. **User Experience**:
   - If mapped, user sees member avatars in presentation mode
   - Can filter to show only prayers from their list members
   - Members are sorted alphabetically by last name
   - Handles suffixes (Jr., Sr., III) correctly

3. **Presentation Mode**:
   - Select "Members" content type to show member prayer updates
   - Select "All" to include members along with other prayers
   - Member updates appear in chronological order

**Edge Function Required:**
```bash
supabase functions deploy planning-center-lists
```

**Database Schema:**
```sql
-- email_subscribers table includes:
planning_center_list_id TEXT  -- Maps subscriber to PC list
```

### Disable (Optional)

If you don't use Planning Center, set token to empty string. App will work without it.

---

## ESV API and API.Bible (Memorize tab)

The **Memorize** tab loads passage text from the [Crossway ESV API](https://api.esv.org/) and, for additional translations, [API.Bible](https://api.bible/). **Listen** mode uses ESV passage audio only; other translations are text-only.

### ESV (required for ESV passages and listen)

```bash
supabase secrets set ESV_API_TOKEN=your_token_here
```

### API.Bible (KJV, NASB, LSB, NIV, NLT, CSB)

Register at [API.Bible](https://api.bible/), then set your API key and each text Bible ID (from `GET /v1/bibles` on the REST API):

```bash
supabase secrets set API_BIBLE_KEY=your_api_bible_key
supabase secrets set API_BIBLE_BIBLE_ID_KJV=...
supabase secrets set API_BIBLE_BIBLE_ID_NASB=...
supabase secrets set API_BIBLE_BIBLE_ID_LSB=...
supabase secrets set API_BIBLE_BIBLE_ID_NIV=...
supabase secrets set API_BIBLE_BIBLE_ID_NLT=...
supabase secrets set API_BIBLE_BIBLE_ID_CSB=...
```

Optional: `API_BIBLE_BASE_URL` (default `https://rest.api.bible`), `API_BIBLE_CACHE_TTL_DAYS` (default **14**).

Deploy after setting secrets:

```bash
supabase functions deploy scripture
supabase functions deploy scripture-audio
```

Each function’s [`deno.json`](../supabase/functions/scripture/deno.json) sets **`verify_jwt": false`** so MFA/localStorage logins (anon key only) can fetch passages. Re-deploy after changing that file.

Apply migration [`20260707120000_memorization_esv.sql`](../supabase/migrations/20260707120000_memorization_esv.sql) before testing (`supabase db push`). For admin-curated Memorize recommendations, also apply [`20260710200000_memorization_recommendations.sql`](../supabase/migrations/20260710200000_memorization_recommendations.sql), [`20260710210000_memorization_recommendation_categories.sql`](../supabase/migrations/20260710210000_memorization_recommendation_categories.sql) (categories + required `category_id`; existing rows backfill to **General**), [`20260710220000_apply_memorization_recommendation_placements.sql`](../supabase/migrations/20260710220000_apply_memorization_recommendation_placements.sql) (atomic verse move/reorder RPC), [`20260710230000_reorder_memorization_recommendation_categories.sql`](../supabase/migrations/20260710230000_reorder_memorization_recommendation_categories.sql) (atomic category reorder RPC), [`20260717120000_memorization_recommendations_multi_translation.sql`](../supabase/migrations/20260717120000_memorization_recommendations_multi_translation.sql) (allow non-ESV `translation` on curated recommendations), and [`20260711120000_seed_ibcd_memorization_recommendations.sql`](../supabase/migrations/20260711120000_seed_ibcd_memorization_recommendations.sql) (optional seed: IBCD counseling topics + verse references for the **Recommended** modal; categories A→Z by `display_order`), plus [`20260711130000_sort_ibcd_recommendation_categories_alpha.sql`](../supabase/migrations/20260711130000_sort_ibcd_recommendation_categories_alpha.sql) if the seed was already applied with topic-list order. Optional Edge Function secrets:

| Secret | Default | Purpose |
|--------|---------|---------|
| `ESV_CACHE_TTL_DAYS` | **7** | Drop stale `scripture_cache` rows older than this many days (ESV) |
| `API_BIBLE_CACHE_TTL_DAYS` | **14** | TTL for API.Bible cached passages |
| `ESV_CACHE_MAX_VERSES` | **500** | LRU verse budget across cached passages (oldest `cached_at` evicted first) |

Without `ESV_API_TOKEN`, ESV passages and listen mode fail until the secret is set. Without `API_BIBLE_KEY` and Bible IDs, non-ESV translations fail at fetch time; users can still manage lists in other translations if passages were previously cached.

### OpenAI API (Memorize Recite mode)

Recite mode uses server-side **Whisper** transcription. Apply migration [`20260721120000_memorization_recite_mode.sql`](../supabase/migrations/20260721120000_memorization_recite_mode.sql) (includes `is_admin` fix, usage ledger, and admin usage RPC). The SQL is **idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP … IF EXISTS`).

**Already applied?** `supabase db push` skips migrations recorded in `schema_migrations`. To upgrade an older deploy (e.g. RPC still required `mfa_session_start`), re-run the file manually:

```bash
supabase db execute -f supabase/migrations/20260721120000_memorization_recite_mode.sql
```

Or paste the file into the Supabase SQL editor. Safe to run multiple times.

If production briefly had a separate `20260721130000_recite_subscriber_mfa_auth` migration applied, its changes are merged into `120000`; you may mark that version reverted: `supabase migration repair --status reverted 20260721130000`.

Then:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_project_api_key
# Optional: API-key spend in Admin → Memorization Recite Mode (last 30 days, Whisper key only)
supabase secrets set OPENAI_ADMIN_KEY=your_openai_admin_api_key
supabase secrets set OPENAI_API_KEY_ID=your_openai_api_key_id
./scripts/deploy-functions.sh transcribe-audio
./scripts/deploy-functions.sh get-openai-org-usage
```

### Personal prayer Pray For

Apply migration [`20260726120000_personal_prayer_prayed_for_count.sql`](../supabase/migrations/20260726120000_personal_prayer_prayed_for_count.sql) for personal **`prayed_for_count`**, per-user **`personal_prayer_cooldown_hours`**, and RPC **`increment_personal_prayed_for_count`**. The SQL is **idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP … IF EXISTS`).

**Fresh local DB:** `supabase db reset` (or `supabase db push` on a new project).

**Already applied incremental `20260727120000`–`20260727150000` files?** Those were consolidated into `20260726120000`. Mark them reverted so `db push` does not look for missing files:

```bash
supabase migration repair --status reverted 20260727120000 20260727130000 20260727140000 20260727150000
```

**Re-run the final schema** (safe any time):

```bash
supabase db execute -f supabase/migrations/20260726120000_personal_prayer_prayed_for_count.sql
```

Or paste the file into the Supabase SQL editor.

---

Enable the feature under **Admin → Settings → Content → Memorization Recite Mode**. **`OPENAI_API_KEY`** powers Whisper transcription (`transcribe-audio`). **`OPENAI_ADMIN_KEY`** (a separate [Admin API key](https://platform.openai.com/settings/organization/admin-keys)) and **`OPENAI_API_KEY_ID`** (the id of the Whisper key from [API keys](https://platform.openai.com/api-keys), not the `sk-…` secret) are optional and power the API-key spend line in admin (last 30 days for that key only). App-tracked usage (attempts, minutes, estimated cost) is stored in `memorization_recite_usage` without the admin secrets.

---

## Deployment

### Vercel Deployment

#### Step 1: Connect to Vercel

```bash
npm install -g vercel
vercel login
vercel link
```

#### Step 2: Configure Environment

1. Go to Vercel dashboard
2. Project settings > Environment Variables
3. Add all variables from `.env.local` (without VITE_ prefix)

Example:
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
AZURE_TENANT_ID=...
# etc
```

#### Step 3: Configure Build

Node.js: use **`24.x`** on Vercel (`engines.node` in [`package.json`](../package.json)). Vercel’s **`22.x`** runtime was **22.22.2**, which is below Angular 22’s minimum (**22.22.3**). Local dev can stay on **22.22.3** via [`.nvmrc`](../.nvmrc).

```bash
# Build command
npm run build

# Output directory
dist
```

#### Step 4: Deploy

```bash
# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

### GitHub Actions Automation

Push to `main` branch automatically deploys to Vercel via GitHub Actions.

---

## Post-Deployment

### Verify Installation

- [ ] App loads at your domain
- [ ] Can submit prayer request
- [ ] Admin can login and approve
- [ ] Email notifications send

### Configure Domain

1. Go to Vercel project settings
2. Domains > Add domain
3. Point your domain to Vercel nameservers

### SSL Certificate

Vercel automatically provides free SSL. No additional setup needed.

### Monitoring

- **PostHog**: Product analytics, session replay, web vitals, and error tracking at [posthog.com](https://posthog.com). Set `posthogKey`, `posthogHost` (first-party proxy, e.g. `https://t.cp-church.org`), and `posthogUiHost` (`https://us.posthog.com` for US Cloud). See [`src/lib/posthog.ts`](../src/lib/posthog.ts). Vercel Analytics / Speed Insights are not used.
- **Supabase**: Monitor database at project dashboard; admin **Site Analytics** uses first-party page-view data in Postgres.

### Backups

Supabase backs up daily. To restore:

1. Go to Supabase project
2. Database > Backups
3. Select backup and restore

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json .next dist
npm install
npm run build
```

### Email Not Sending

1. Check email queue: `SELECT * FROM email_queue WHERE status = 'failed'`
2. Check logs: GitHub Actions > process-email-queue workflow
3. Verify Microsoft 365 credentials in `.env`
4. Check email templates exist in database

---

## Next Steps

- Read [FEATURES.md](FEATURES.md) to learn all features
- Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Read [DEVELOPMENT.md](DEVELOPMENT.md) if you'll be coding
