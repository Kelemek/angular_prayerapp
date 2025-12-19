# Environment Setup - IMPORTANT! ⚠️

## Blank Page Issue Fix

If you're seeing a blank page when running the dev server, it's because the Supabase environment variables are not configured.

## Quick Fix

1. **Create a `.env` file** in the project root:

```bash
cp .env.example .env
```

2. **Add your Supabase credentials** to the `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Restart the dev server:**

```bash
npm run dev
```

## Where to Find Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Click on the **Settings** icon in the sidebar
4. Go to **API** section
5. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **Project API keys** → **anon/public** key → Use as `VITE_SUPABASE_ANON_KEY`

## Environment Variables Explained

### Required:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public API key

### Optional:
- `VITE_SENTRY_DSN` - Sentry error tracking DSN (for production monitoring)
- `VITE_CLARITY_PROJECT_ID` - Microsoft Clarity analytics ID

## Production Deployment

For Vercel deployment, add these environment variables in your project settings:

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add the same variables without the `VITE_` prefix in Vercel, or keep them as-is

## Security Notes

⚠️ **NEVER commit your `.env` file to version control!**

The `.env` file is already in `.gitignore` to prevent accidental commits.

## Troubleshooting

### "Missing Supabase environment variables" Error

This means your `.env` file is either:
- Not created
- Not in the correct location (must be in project root)
- Missing required variables
- Dev server needs to be restarted after creating/editing `.env`

### Variables not loading

1. Make sure the `.env` file is in the project root (same folder as `package.json`)
2. Variable names must start with `VITE_` for Vite to load them
3. Restart the dev server after editing `.env`
4. Check that there are no spaces around the `=` sign

### Still seeing blank page

1. Open browser DevTools (F12)
2. Check the Console tab for errors
3. Look for "Supabase environment variables missing" error
4. Verify your Supabase credentials are correct

## Example .env File

```env
# Copy this to .env and fill in your actual values
VITE_SUPABASE_URL=https://eqiafsygvfaifhoaewxi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWFmc3lndmZhaWZob2Fld3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4Mzc0MTksImV4cCI6MjAyNTQxMzQxOX0.abc123...
```

## Next Steps After Setup

Once your `.env` file is configured:

1. Start the dev server: `npm run dev`
2. Open http://localhost:4200/
3. You should see the prayer app loading
4. Check that prayers are loading from Supabase

---

**Last Updated:** December 18, 2024
