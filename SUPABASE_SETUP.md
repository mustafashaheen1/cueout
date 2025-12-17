# Supabase Setup Guide for CueOut App

This guide will help you connect your CueOut app to Supabase.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- The app code (already in this directory)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Project Name**: CueOut
   - **Database Password**: (create a strong password and save it)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait for it to initialize

## Step 2: Run the Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Open the `supabase-migration.sql` file from this project
4. Copy the entire contents
5. Paste into the Supabase SQL Editor
6. Click **Run** (or press Cmd+Enter)
7. Wait for it to complete - you should see "Success. No rows returned"

## Step 3: Get Your API Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Find these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 4: Configure Your App

1. In your project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Save the file

## Step 5: Update .gitignore

Make sure `.env` is in your `.gitignore` file (it already should be):
```
.env
.env.local
```

## Step 6: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. Open the browser console (F12)
4. You should NOT see any Supabase connection errors

## Step 7: Enable Authentication (Optional)

### Email/Password Auth (Already enabled by default)
No additional setup needed!

### Apple Sign-In (Optional)

1. In Supabase, go to **Authentication** > **Providers**
2. Enable **Apple**
3. Follow Supabase's guide to configure Apple OAuth

## Step 8: Set Up Row Level Security (RLS)

The migration has already set up RLS policies, but verify:

1. In Supabase, go to **Authentication** > **Policies**
2. You should see policies for all tables
3. All tables should show "RLS enabled"

## Database Schema Overview

Your database now has these tables:

- **users** - User profiles
- **voices** - Available voice options
- **personas** - Call personas (Manager, Friend, etc.)
- **persona_configs** - Persona customizations
- **caller_ids** - Custom caller IDs
- **upcoming_calls** - Scheduled calls
- **call_history** - Completed calls
- **quick_schedules** - Quick action presets
- **subscriptions** - User subscription info
- **call_usage** - Usage tracking

## API Functions Available

All API functions are in `src/api/`:

```javascript
import {
  // Auth
  signUp,
  signIn,
  signOut,
  getCurrentUser,

  // Personas
  getPersonas,
  createPersona,
  updatePersona,

  // Calls
  getUpcomingCalls,
  createUpcomingCall,
  getCallHistory,

  // And many more...
} from './api';
```

## Troubleshooting

### "Invalid API key" error
- Check that your `.env` file has the correct credentials
- Make sure you copied the **anon** key, not the service_role key
- Restart your dev server after creating/editing `.env`

### "relation does not exist" error
- The migration didn't run successfully
- Go back to Step 2 and run it again

### RLS errors
- Make sure you're authenticated
- Check that RLS policies were created (Step 8)

### App still uses localStorage
- The app gracefully falls back to localStorage if not authenticated
- Sign in to use Supabase backend

## Next Steps

1. **Authentication**: Implement sign up/sign in pages
2. **Real-time updates**: Use Supabase realtime for live updates
3. **Storage**: Use Supabase Storage for voice files/attachments
4. **Edge Functions**: Create serverless functions for AI call generation

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Check the app repository

---

**Your app is now connected to Supabase!** 🎉
