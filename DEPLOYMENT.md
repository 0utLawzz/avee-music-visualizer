# Deployment & Database Architecture Guide (Vercel + Supabase)

This document provides a guide for deploying **PulseCraft Studio** to **Vercel** and adding persistent cloud user storage, user authentication, and project saving using **Supabase**.

---

## 1. Deploying to Vercel (Step-by-Step)

### Option A: Via Vercel Web Dashboard (Recommended)

1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "feat: PulseCraft Studio technical edition"
   git push origin main
   ```
2. Log into [vercel.com](https://vercel.com) and click **"Add New..."** > **"Project"**.
3. Select your GitHub repository from the list.
4. Vercel will automatically detect the **Vite** framework. Confirm the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**.
6. The repository includes a `vercel.json` file that ensures client-side routing rewrites work properly without 404 errors when reloading subpages.

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 2. Database & Auth Recommendation: Why Supabase?

The user asked:
> *"it will be deploy on vercel so what other thing we may need. database? tell me what will be good. supabase and auth for user keep some of hir record.."*

### Why Supabase is the Top Recommendation for Vercel:

| Feature | Supabase | Firebase | Neon / Prisma |
|---|---|---|---|
| **Vercel Integration** | Official 1-click Vercel Integration (syncs env vars automatically) | Requires GCP Service Account JSON keys | SQL database only, requires separate Auth provider |
| **Authentication** | Built-in (Email, Google, GitHub, Magic Links, Passkeys) | Built-in Auth | None (requires NextAuth or Clerk) |
| **Database Type** | PostgreSQL (Relational, SQL, ACID compliant, JSONB support) | NoSQL Firestore | PostgreSQL |
| **Asset Storage** | Built-in S3-compatible Storage (for audio files, logos, exports) | Firebase Cloud Storage | None |
| **Free Tier** | 500 MB database, 1 GB file storage, 50,000 monthly active users | 1 GB Firestore | 500 MB database |
| **Frontend Integration** | Lightweight client SDK (`@supabase/supabase-js`) | Heavy SDK (~200KB+) | Needs backend API routes |

**Verdict**: **Supabase** is the optimal choice. It gives you PostgreSQL, User Auth, and File Storage in a single dashboard that links with Vercel in 1 click.

---

## 3. Recommended Supabase Database Schema

To store user records, marked clips, custom format presets, and export history, run this SQL script in the **Supabase SQL Editor**:

```sql
-- 1. Profiles Table (Automatically synced on User Sign-Up)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  plan_tier text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. Projects Table (Audio tracks, 60+ min DJ mixes)
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  artist text default 'Unknown Artist',
  duration_seconds numeric not null,
  bpm integer default 128,
  audio_storage_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = user_id);

-- 3. Marked Clips Table (Individual parts cut from long audio)
create table public.marked_clips (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  start_time numeric not null,
  end_time numeric not null,
  aspect_ratio text default '9:16',
  template text default 'phonk_crown',
  fps integer default 60,
  bitrate_bps integer default 12000000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.marked_clips enable row level security;
create policy "Users manage own marked clips" on public.marked_clips
  for all using (auth.uid() = user_id);

-- 4. Custom Format Presets Table
create table public.user_format_presets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  aspect_ratio text not null,
  fps integer not null,
  bitrate_bps integer not null,
  template text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_format_presets enable row level security;
create policy "Users manage own format presets" on public.user_format_presets
  for all using (auth.uid() = user_id);

-- 5. Export History Vault Table
create table public.export_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  clip_name text not null,
  filename text not null,
  start_time numeric not null,
  end_time numeric not null,
  duration numeric not null,
  aspect_ratio text not null,
  template text not null,
  fps integer not null,
  file_size_mb numeric,
  cloud_download_url text,
  exported_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.export_history enable row level security;
create policy "Users view own export history" on public.export_history
  for all using (auth.uid() = user_id);
```

---

## 4. How to Connect Supabase in Code

### Step 1: Install the Supabase JS Client
```bash
npm install @supabase/supabase-js
```

### Step 2: Add Environment Variables in Vercel & `.env`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### Step 3: Initialize Supabase Client (`src/services/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Step 4: Simple Auth Usage (Email & Google OAuth)
```typescript
// Sign Up
await supabase.auth.signUp({
  email: 'dj@example.com',
  password: 'securePassword123'
});

// Sign In with Google
await supabase.auth.signInWithOAuth({
  provider: 'google'
});

// Check current user session
const { data: { user } } = await supabase.auth.getUser();

// Save a marked clip to database
await supabase.from('marked_clips').insert({
  project_id: projectId,
  user_id: user?.id,
  name: 'Part 01: Festival Drop',
  start_time: 14.5,
  end_time: 44.5,
  aspect_ratio: '9:16',
  template: 'phonk_crown',
  fps: 60
});
```

---

## 5. Performance Checklist for Vercel
- **Zero Server Overhead**: The audio analysis, canvas rendering, and video recording all execute in the client's Web Audio / Canvas thread. Vercel only serves static JS/CSS bundles, keeping hosting costs $0 / month on the Vercel Hobby plan.
- **Large Audio Handling**: Files are decoded in chunks or streamed via HTML5 `<audio>` elements, meaning Vercel does not need to handle multi-gigabyte audio uploads through serverless functions.
