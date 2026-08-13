# Backend Setup — Writers Portal

## Architecture

```
Browser (React SPA)
    │
    ├── Public submission form  ──► supabase.rpc('submit_novel')         ──► writers + submissions tables
    ├── Tracking page           ──► supabase.rpc('get_submission_by_code') ──► submissions (via DB function)
    ├── /writers page           ──► supabase.rpc('get_public_writers')   ──► writers WHERE is_public=true
    │
    ├── File inputs (manuscript/cover)
    │       │
    │       └── (if VITE_PORTAL_API_URL is set)
    │           Apps Script web app  ──►  Google Drive folder  ──► Drive URL saved in submissions row
    │
    └── /admin/* routes (authenticated)
            │
            └── supabase.from('submissions'/'writers') direct queries
                    ─── RLS: authenticated role has full access
```

**Supabase** stores all structured data (writers, submissions, status history, policies, timelines, FAQs).  
**Google Drive** stores actual files (manuscripts, cover images). Supabase stores only the Drive URL/file ID as text.

---

## Part 1 — Supabase Project

| Setting | Value |
|---|---|
| Project name | `writers-portal-UNB` |
| Region | Southeast Asia (Singapore) — lowest latency from Pakistan |
| Project URL | In `.env` as `VITE_SUPABASE_URL` |
| Anon/public key | In `.env` as `VITE_SUPABASE_ANON_KEY` |

### Environment variables

Copy `.env.example` → `.env` and fill in your credentials. The `.env` file is in `.gitignore` and is **never committed**.

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PORTAL_API_URL=   # optional: Apps Script URL for Drive file uploads
```

---

## Part 2 — Running the Database Migration

1. Open **Supabase Dashboard → SQL Editor → New Query**
2. Paste the entire contents of [`supabase/migrations/001_init.sql`](../supabase/migrations/001_init.sql)
3. Click **Run**

This creates:
- 6 tables: `writers`, `submissions`, `status_history`, `policies`, `timelines`, `faqs`
- 5 indexes for lookup performance
- 2 internal triggers (auto status_history, auto last_updated)
- 3 public SECURITY DEFINER functions (submit_novel, get_submission_by_code, get_public_writers)
- RLS enabled on all tables with policies described below

---

## Part 3 — Creating Your Admin User

> No public sign-up page exists. Admin access is granted only here.

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add user → Create new user**
3. Enter your email and a strong password
4. Click **Create user**

That's it. The user is created with email/password auth. Use these credentials at `/admin/login`.

---

## Part 4 — Row Level Security (RLS) — Plain Language Guide

All tables have RLS enabled. Here is exactly what each policy allows and blocks:

### Security Model for Anon Users

Anon users **have no direct table access at all**. Every public operation goes through a `SECURITY DEFINER` PostgreSQL function that runs as the database owner. This means:

- The RPC function can bypass RLS internally
- But it enforces its own logic (e.g., requires both code + email for tracking)
- Anon users cannot run arbitrary queries on any table

### `writers` table

| Who | What | Notes |
|---|---|---|
| Anon | **No access** | Inserts happen via `submit_novel()` function |
| Admin | Full SELECT + UPDATE | Can read email, WhatsApp, bio — private fields |

### `submissions` table

| Who | What | Notes |
|---|---|---|
| Anon | **No access** | Tracking via `get_submission_by_code()` function only |
| Admin | Full SELECT + UPDATE | Changing `current_status` auto-triggers `status_history` |

### `status_history` table

| Who | What | Notes |
|---|---|---|
| Anon | **Completely blocked** | Written only by DB trigger `fn_record_status_change` |
| Admin | Full SELECT | Read the full audit trail |

### `policies` table

| Who | What | Notes |
|---|---|---|
| Anon | SELECT where `status = 'published'` | Cannot see draft policies |
| Admin | Full access | Can create, edit, publish/unpublish |

### `timelines` table

| Who | What | Notes |
|---|---|---|
| Anon | SELECT where `active = true` | Hidden stages not visible |
| Admin | Full access | Manage timeline content |

### `faqs` table

| Who | What | Notes |
|---|---|---|
| Anon | SELECT where `published = true` | Draft FAQs not visible |
| Admin | Full access | Manage FAQ content |

### The Three Public Functions

| Function | Called by | What it does |
|---|---|---|
| `submit_novel(...)` | `/submit` form | Upserts writer + inserts submission atomically |
| `get_submission_by_code(code, email)` | `/track` page | Returns submission **only** if both code AND email match |
| `get_public_writers()` | `/writers` page | Returns full_name, pen_name, bio + published novels for is_public writers |

---

## Part 5 — Admin Dashboard

Navigate to `/admin/login` → sign in with your Supabase auth credentials.

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: stats cards + recent submissions |
| `/admin/submissions` | Full submissions table with search, filter, sort |
| `/admin/submissions/:id` | Detail view: change status, add notes, view Drive file links |
| `/admin/writers` | Writers list: toggle is_public to control /writers page |

**Changing submission status** in the detail page automatically writes a row to `status_history` via the database trigger — no manual action needed.

**Admin notes** are visible to the writer on the `/track` page as a "note" field.

---

## Part 6 — Public Writers Directory (`/writers`)

Shows only:
- `full_name`, `pen_name`, `bio` (no email, no WhatsApp)
- Their published novels (`current_status = 'Published'`) with title, genre, and live URL

A writer appears here **only** when an admin sets `is_public = true` in `/admin/writers`.

---

## Part 7 — Google Drive File Uploads

File uploads are **optional and separate** from the Supabase data layer:

1. Set `VITE_PORTAL_API_URL` to your deployed Apps Script `/exec` URL
2. When a writer submits files, `portalApi.ts` first uploads them to Drive via Apps Script
3. Apps Script returns Drive URLs, which are then passed to `submit_novel()` and saved in the `submissions` row
4. If `VITE_PORTAL_API_URL` is not set, submissions save without Drive links (graceful degradation)

See `docs/google-apps-script/Code.gs` for the matching Apps Script backend.

---

## Part 8 — Keep-Alive Workflow

**Why**: Supabase free projects pause after 7 days with no API activity, breaking the live site.

**How**: `.github/workflows/supabase-keepalive.yml` runs a `curl` ping to the Supabase REST API every 3 days.

### Adding GitHub Secrets (one-time setup)

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add two secrets:
   - `SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `SUPABASE_ANON_KEY` = your anon key
4. The workflow file references these as `${{ secrets.SUPABASE_URL }}` — the key is **never hardcoded**

### Verifying it's running

- Go to GitHub repo → **Actions** tab → **Supabase Keep-Alive** workflow
- You should see a scheduled run every 3 days
- You can also trigger it manually with **Run workflow**
- A successful run shows HTTP status 200 in the logs

### Cost

The repo is public → GitHub Actions minutes are **unlimited and free** for public repos.

---

## Part 9 — Local Development

```bash
# Install dependencies (if not already done)
npm install

# Copy env template and fill in credentials
cp .env.example .env
# edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
```

The app auto-detects Supabase credentials. If they're missing, it falls back to localStorage demo mode with a banner on the submit page.

---

## TypeScript Types

Database types are hand-maintained in [`src/lib/supabase.types.ts`](../src/lib/supabase.types.ts).

To auto-generate them from your live schema (recommended for production):

```bash
npx supabase gen types typescript --project-id eeihfopzeohgezhftzri > src/lib/supabase.types.ts
```