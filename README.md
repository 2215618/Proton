# Stitch CRM Clone

Full-stack Real Estate CRM.

## Setup

1. **Supabase:**
   - Create a new project.
   - Run the SQL in `supabase/schema.sql` in the SQL Editor.
   - Create a test user in Auth.
   - Manually insert an Org and link the user in `profiles` table to bypass invite flow for MVP.

2. **Environment:**
   - Copy `.env.example` to `.env.local` and fill in keys.

3. **Run:**
   ```bash
   npm install
   npm run dev
   ```

## Stack
- Next.js (App Router)
- Tailwind CSS
- Supabase

## Deploy (Vercel)
- Build command: `npm run build`
- Output: (Next.js default)
- Env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
