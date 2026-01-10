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

- Node.js 18+ and npm 9+
- Git
- Supabase account (free tier available)
- Microsoft 365 account (for email)
- Planning Center account (optional, for contact lookup)

### Installation

```bash
# Clone repository
git clone https://github.com/cp-church/angular_prayerapp.git
cd angular_prayerapp

# Install dependencies
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

# Analytics
VITE_CLARITY_PROJECT_ID=your-clarity-id

# Production only
VITE_SENTRY_DSN=https://...
```

### GitHub Secrets

For GitHub Actions to work, add these secrets:

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

### Database Tables

Key tables created by migrations:

- `prayers` - Prayer requests
- `prayer_updates` - Prayer status updates
- `prayer_deletion_requests` - Deletion requests
- `email_subscribers` - Email opt-in/out
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

Templates are stored in Supabase `email_templates` table:

- `prayer_submitted` - Confirmation when prayer submitted
- `prayer_approved` - Notification when admin approves prayer
- `prayer_denied` - Notification when admin denies prayer
- `prayer_answered` - Notification when prayer marked answered
- `update_approved` - Notification for approved updates
- `subscriber_welcome` - Welcome to email list

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

### Disable (Optional)

If you don't use Planning Center, set token to empty string. App will work without it.

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
- [ ] PWA installs on mobile
- [ ] Works offline

### Configure Domain

1. Go to Vercel project settings
2. Domains > Add domain
3. Point your domain to Vercel nameservers

### SSL Certificate

Vercel automatically provides free SSL. No additional setup needed.

### Monitoring

- **Clarity**: View analytics at [clarity.microsoft.com](https://clarity.microsoft.com)
- **Sentry**: View errors at [sentry.io](https://sentry.io) (if configured)
- **Supabase**: Monitor database at project dashboard

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

### PWA Not Installing

1. Clear browser cache
2. Serve over HTTPS (not localhost)
3. Check manifest.json is valid
4. Check service worker registration in console

---

## Next Steps

- Read [FEATURES.md](FEATURES.md) to learn all features
- Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Read [DEVELOPMENT.md](DEVELOPMENT.md) if you'll be coding
