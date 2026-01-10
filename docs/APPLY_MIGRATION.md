# Steps to Apply Email Queue RLS Policy

## For Existing Database

Since the `email_queue` table already exists in your Supabase database, you need to manually run the RLS policy update:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Go to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Create New Query**
   - Click "New Query"

4. **Paste the Migration SQL**
   - Copy the entire contents of: `supabase/migrations/20260109_update_email_queue_rls.sql`
   - Paste it into the SQL editor

5. **Run the Query**
   - Click "Run" button or press Ctrl+Enter

6. **Verify Success**
   - You should see "Success" message
   - Check that the policies were updated: `SELECT * FROM pg_policies WHERE tablename = 'email_queue';`

## What This Does

The migration:
- **Temporarily** allows all authenticated users to insert into email_queue
- Enables service_role (background processor) to read and update queue items
- This lets us test if the code is working before locking it down to admins only

## Next Steps

Once you confirm emails are appearing in the queue table:

1. Check browser console for any error messages
2. Verify subscriber count (make sure there are active subscribers)
3. Monitor the email_queue table to see if rows are being added
4. Once working, we can update the policy to restrict to admins only

## Checking if Migration Worked

In Supabase SQL Editor, run:
```sql
-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'email_queue';

-- Check table structure
SELECT * FROM email_queue LIMIT 5;

-- Check subscriber counts
SELECT COUNT(*) as total_subscribers, 
       COUNT(*) FILTER (WHERE optout = false AND blocked = false) as active_subscribers
FROM email_subscribers;
```
