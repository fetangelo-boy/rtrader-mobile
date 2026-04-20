# RTrader Mobile - Manual Database Setup Guide

Because Docker is unavailable in the development environment, we cannot use `supabase db push`. Instead, apply the database schema manually via the Supabase Dashboard.

## Prerequisites

- Supabase project created and linked to the app
- User `cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd` exists in Supabase Auth (test user)
- Access to Supabase Dashboard

## Step 1: Apply Database Migrations

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your RTrader project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy and Paste Migrations**
   - Open the file: `supabase/MIGRATIONS_CONSOLIDATED.sql`
   - Copy the entire content
   - Paste into the SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)

4. **Verify Success**
   - You should see no errors
   - The query should complete successfully
   - All 6 tables should be created: `profiles`, `chats`, `chat_participants`, `messages`, `chat_settings`, `subscriptions`

## Step 2: Verify Schema Creation

1. **Check Tables in Database**
   - Go to **Table Editor** in the left sidebar
   - You should see all 6 tables listed:
     - `profiles`
     - `chats`
     - `chat_participants`
     - `messages`
     - `chat_settings`
     - `subscriptions`

2. **Verify RLS is Enabled**
   - Click on each table
   - Scroll down to **Security** section
   - Confirm **RLS** is **Enabled** (green toggle)

## Step 3: Apply Seed Data

1. **Create Test User Profile**
   - Go back to **SQL Editor**
   - Click **New Query**
   - Copy and paste the first section of `supabase/SEED_CORRECTED.sql` (Insert test profile):
   ```sql
   INSERT INTO profiles (id, username, avatar_url, created_at)
   VALUES (
     'cf0d0cc4-cb26-4adf-9b49-69fbc4cec7dd',
     'testuser',
     'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser',
     NOW()
   ) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
   ```
   - Click **Run**

2. **Insert 8 Chats**
   - Click **New Query**
   - Copy the "Insert 8 test chats" section from `supabase/SEED_CORRECTED.sql`
   - Click **Run**

3. **Add Test User as Participant**
   - Click **New Query**
   - Copy the "Add test user as participant" section from `supabase/SEED_CORRECTED.sql`
   - Click **Run**

4. **Insert Test Messages**
   - Click **New Query**
   - Copy the "Insert test messages" section from `supabase/SEED_CORRECTED.sql`
   - Click **Run**

5. **Insert Subscription**
   - Click **New Query**
   - Copy the "Insert test subscription" section from `supabase/SEED_CORRECTED.sql`
   - Click **Run**

6. **Insert Chat Settings**
   - Click **New Query**
   - Copy the "Insert test chat settings" section from `supabase/SEED_CORRECTED.sql`
   - Click **Run**

## Step 4: Verify Seed Data

1. **Check Chats Table**
   - Go to **Table Editor**
   - Click on **chats** table
   - You should see 8 rows:
     - 5 with `type = 'interactive'`
     - 3 with `type = 'info_only'`

2. **Check Messages**
   - Click on **messages** table
   - You should see 17 messages across all chats

3. **Check Subscriptions**
   - Click on **subscriptions** table
   - You should see 1 row with `plan = 'premium'` and `status = 'active'`

## Step 5: Test the App

1. **Start the Dev Server**
   ```bash
   cd /home/ubuntu/rtrader-mobile
   pnpm dev
   ```

2. **Open the App**
   - Web: `https://8081-...manus.computer`
   - Mobile: Scan QR code with Expo Go

3. **Test Login**
   - Email: `test@rtrader.com`
   - Password: `TestPassword123!`

4. **Verify Chat List**
   - You should see all 8 chats listed
   - Interactive chats should have message input enabled
   - Info-only chats should be read-only

## Troubleshooting

### Error: "relation 'profiles' does not exist"
- **Cause**: Migrations were not applied
- **Solution**: Go back to Step 1 and apply `MIGRATIONS_CONSOLIDATED.sql`

### Error: "permission denied for schema public"
- **Cause**: RLS policies are blocking access
- **Solution**: Verify you are logged in with the test user account

### Error: "new row violates unique constraint"
- **Cause**: Seed data was already inserted
- **Solution**: This is normal if you run the seed twice. The `ON CONFLICT` clause handles duplicates.

### Messages not showing in chat
- **Cause**: User is not a participant in the chat
- **Solution**: Verify `chat_participants` table has entries for the test user in all chats

### Info-only chats allow messaging
- **Cause**: RLS policy is not enforced
- **Solution**: Check that the `messages` INSERT policy includes the `chats.type = 'interactive'` check

## Next Steps

After manual setup is complete:

1. **Test UI Features**
   - Verify all 8 chats load in the app
   - Test sending messages in interactive chats
   - Verify info-only chats are read-only
   - Test mute/unmute functionality
   - Check subscription status on Account screen

2. **Implement Missing Features**
   - Reply UI (long-press to quote)
   - Photo attachments
   - Mute/Unmute visual indicators
   - Account screen subscription management

3. **Run E2E Tests**
   - Login → Chat → Reply → Photo → Mute → Account → Logout

## Files Reference

- **Migrations**: `supabase/MIGRATIONS_CONSOLIDATED.sql`
- **Seed Data**: `supabase/SEED_CORRECTED.sql`
- **Original Migrations**: `supabase/migrations/` (6 individual files)
- **App Config**: `app.config.ts` (Supabase credentials)
- **Chat Router**: `server/routers/chat.ts` (TRPC API)
- **Chat Screen**: `app/(tabs)/chats.tsx` (UI)
