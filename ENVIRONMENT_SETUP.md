# Environment Setup Guide

## Required Environment Variables

Your Angular app needs these Supabase credentials to work. They should already be configured in your Vercel project.

### Supabase Credentials

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Local Development Setup

For local development, you have a few options:

### Option 1: Direct in Environment Files (Quick & Easy)

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key-here'
};
```

### Option 2: Environment Variables (Recommended for Teams)

1. Create a `.env` file in the project root (already gitignored):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Update `src/environments/environment.ts` to read from process.env:

```typescript
export const environment = {
  production: false,
  supabaseUrl: process.env['VITE_SUPABASE_URL'] || '',
  supabaseAnonKey: process.env['VITE_SUPABASE_ANON_KEY'] || ''
};
```

### Option 3: Vercel Environment Variables (Production)

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. These will be injected at build time

## Optional Third-Party Services

### Sentry (Error Tracking)

```
VITE_SENTRY_DSN=your-sentry-dsn
```

Add to `src/lib/sentry.ts` when ready to implement.

### Microsoft Clarity (Session Replay)

```
VITE_CLARITY_PROJECT_ID=your-clarity-id
```

Add to `src/lib/clarity.ts` when ready to implement.

## Vercel Deployment

Your `vercel.json` is already configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/prayerapp/browser",
  "framework": "angular"
}
```

When you deploy to Vercel:
1. Connect your GitHub repo
2. Vercel will detect it's an Angular project
3. Environment variables from your Vercel project will be used
4. Build will run automatically

## Testing Environment Setup

To verify your environment is configured correctly:

```bash
# Start the dev server
npm start

# Check the browser console - you should NOT see errors about missing Supabase credentials
# If you see errors, your environment variables aren't set correctly
```

## Common Issues

### Issue: "Missing Supabase environment variables"
**Solution**: Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in your environment

### Issue: App loads but no data appears
**Solution**: Check browser console for Supabase errors. Verify your credentials are correct.

### Issue: Real-time updates don't work
**Solution**: Make sure your Supabase project has real-time enabled for the prayers table

## Security Notes

- ✅ The anon key is safe to expose (it's meant for client-side use)
- ✅ Row Level Security (RLS) in Supabase protects your data
- ✅ Admin actions require authentication
- ❌ Never commit `.env` to git (it's already gitignored)
- ❌ Never expose service role keys in client code

## Quick Start

If you already have Supabase set up from the React app:

1. The same environment variables work for Angular
2. The same database schema is used
3. The same RLS policies apply
4. No backend changes needed!

Simply ensure your credentials are in `src/environments/environment.ts` or environment variables, and you're good to go!
