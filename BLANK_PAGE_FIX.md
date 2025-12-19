# 🚨 BLANK PAGE FIX - READ THIS FIRST!

## Problem: Blank Page on `npm run dev`

If you're seeing a blank page when running the development server, it's because **Supabase environment variables are not configured**.

## Quick Fix (2 Minutes)

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./setup-env.sh
```

Follow the prompts to enter your Supabase credentials.

### Option 2: Manual Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your credentials:**
   ```env
   VITE_SUPABASE_URL=https://eqiafsygvfaifhoaewxi.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Where to Get Your Supabase Credentials

### If you're the project owner:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (eqiafsygvfaifhoaewxi)
3. **Settings** → **API**
4. Copy:
   - **URL**: `https://eqiafsygvfaifhoaewxi.supabase.co`
   - **anon public key**: The long JWT token

### If you're a collaborator:

Ask the project owner to share the Supabase credentials securely (NOT in the repo!).

## Why This Happened

During the Angular migration, the app was converted from React's `import.meta.env` to Angular's environment files. However, the `.env` file with credentials wasn't committed to version control (for security), so you need to create it locally.

## Verification

After setup, you should see:

1. Dev server starts without errors
2. Browser shows the prayer app (not blank)
3. No "Missing Supabase environment variables" errors in console

## Still Having Issues?

Check the detailed troubleshooting guide:
- [docs/ENV_SETUP_FIX.md](docs/ENV_SETUP_FIX.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Security Note

⚠️ **NEVER commit your `.env` file to Git!**

The `.env` file is in `.gitignore` to protect your credentials.

---

**Updated:** December 18, 2024
