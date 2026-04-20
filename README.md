# Canvus

Your **cloud clipboard**. Drop text, a link, an image, or a file on your phone — it lands on your laptop instantly, and vice-versa. Built for the "I just need to get this from one device to the other" moment that every creator has fifty times a day.

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + RLS + Realtime + Storage) · `@supabase/ssr`
- **Realtime sync:** Supabase `postgres_changes` subscription on `canvus_drops`
- **Storage:** Supabase Storage bucket `canvus-files` (private, signed URLs)
- **Auth:** Supabase email/password
- **PWA:** installable, with `share_target` so Android "Share to Canvus" just works

---

## Design system

- **Accent:** electric chartreuse (`oklch(0.86 0.21 128)`) — one vivid color, never blue or purple
- **Typography:** Geist Sans + Geist Mono (via `next/font`), tight tracking on display sizes
- **Layout:** CSS-columns bento feed, 2 → 3 → 4 columns by breakpoint
- **Motion:** `prefers-reduced-motion`-aware drop-in animation with an accent-glow ring pulse
- **Dark first,** light mode via `prefers-color-scheme`

---

## Quick start

### 1) Configure Supabase

Copy `.env.example` → `.env.local` and fill:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XXXXX
```

The project needs:

- A `public.canvus_drops` table with the schema below
- A private Storage bucket named `canvus-files` (50 MB file limit)
- Realtime enabled on `canvus_drops`
- RLS enabled on the table (owner-scoped policies below)
- RLS on Storage: users can read/write files under `<their user_id>/*`

#### Full schema

```sql
-- Required extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm with schema extensions;

-- Drop-type enum
do $$ begin
  create type canvus_drop_type as enum ('TEXT', 'LINK', 'IMAGE', 'FILE');
exception when duplicate_object then null; end $$;

-- Main table
create table if not exists public.canvus_drops (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        canvus_drop_type not null,
  content     text,
  url         text,
  og_title    text,
  og_desc     text,
  og_image    text,
  file_path   text,
  file_name   text,
  file_mime   text,
  file_size   bigint,
  thumbnail   text,
  tags        text[] not null default '{}',
  device_name text,
  pinned      bool not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists canvus_drops_user_created_idx
  on public.canvus_drops (user_id, created_at desc);
create index if not exists canvus_drops_user_pinned_idx
  on public.canvus_drops (user_id) where pinned;
create index if not exists canvus_drops_tags_gin
  on public.canvus_drops using gin (tags);
create index if not exists canvus_drops_content_trgm
  on public.canvus_drops using gin (content extensions.gin_trgm_ops);

-- Row-level security
alter table public.canvus_drops enable row level security;

create policy "own rows read"   on public.canvus_drops
  for select using (user_id = auth.uid());
create policy "own rows insert" on public.canvus_drops
  for insert with check (user_id = auth.uid());
create policy "own rows update" on public.canvus_drops
  for update using (user_id = auth.uid());
create policy "own rows delete" on public.canvus_drops
  for delete using (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.canvus_drops;

-- Storage bucket (private, 50 MB cap)
insert into storage.buckets (id, name, public, file_size_limit)
values ('canvus-files', 'canvus-files', false, 52428800)
on conflict (id) do nothing;

-- Storage RLS — users can only access files under `<their user_id>/...`
create policy "own files read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'canvus-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own files insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'canvus-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own files delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'canvus-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

#### Hardening migration

Apply `supabase/migrations/20260420_canvus_hardening.sql` (also shown below) to
add DB-level defense-in-depth against forged `file_path`, non-HTTPS `thumbnail`,
or disallowed `file_mime` values from a compromised client:

```sql
-- supabase/migrations/20260420_canvus_hardening.sql
alter table public.canvus_drops
  add constraint canvus_drops_file_path_own
    check (file_path is null or file_path like user_id::text || '/%'),
  add constraint canvus_drops_thumbnail_scheme
    check (thumbnail is null or thumbnail like 'https://%'),
  add constraint canvus_drops_file_mime_allowed
    check (
      file_mime is null or file_mime in (
        'image/png','image/jpeg','image/webp','image/gif','image/avif','image/heic',
        'application/pdf','text/plain','text/markdown','text/csv',
        'application/zip','application/json','application/x-zip-compressed'
      )
    );
```

Run it either via the Supabase CLI:

```bash
supabase db push
```

…or by pasting the SQL into the Supabase dashboard → SQL editor.

### 2) Install & run

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 3) Enable email auth in Supabase

In the Supabase dashboard → Authentication → Providers → Email:

- Turn **Email** on
- If confirmations are required (the default), add `http://localhost:3000/callback` and your production URL to the redirect allow-list (Auth → URL Configuration → Redirect URLs)
- Canvus shows an on-screen "check your email" notice automatically when confirmation is pending

To disable confirmation for faster local testing: Auth → Providers → Email → toggle **Confirm email** off.

---

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run start        # run the prod build locally
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

---

## Keyboard shortcuts

| Key | Where | What |
|-----|-------|------|
| `N` | feed (not in an input) | open composer |
| `Esc` | composer open | close composer |
| `⌘/Ctrl + ↵` | composer open | save the drop |
| `⌘/Ctrl + V` | anywhere outside an input | opens composer prefilled with the paste contents |
| `c` | focused tile | copy |
| `p` | focused tile | pin / unpin |
| `d` | focused tile | delete (with 5 s undo) |

Tiles are keyboard-focusable (tab to them). Shortcuts only fire when no text
selection is active and the event target is not an input/textarea.

Dropping a file or image anywhere on the window (while composer is open) routes it into the composer.

---

## PWA install

- **Desktop Chrome / Edge:** address bar → install icon
- **Android Chrome:** ⋮ → Install app. After install, the system share sheet will offer "Canvus" — picking it opens the composer pre-filled with whatever you shared (text, URL, image, file).
- **iOS Safari:** Share → Add to Home Screen. iOS doesn't yet support `share_target`, so use the in-app paste/drop flow.

---

## Architecture notes

- **`proxy.ts`** (Next.js 16's replacement for `middleware.ts`) refreshes the Supabase session cookie on every request and redirects unauthenticated users to `/login`. Supabase cookie refresh has to run here or server components see stale sessions.
- **Server components** use `lib/supabase/server.ts` (which `await cookies()` — required on Next.js 16).
- **Client components** use `lib/supabase/client.ts` for realtime, direct uploads, and lightweight reads.
- **All drops** are created server-side via `POST /api/drops`. Text/Link runs OG enrichment; IMAGE/FILE drops upload to Storage from the browser first (RLS enforces the `<user_id>/` prefix), then the row is inserted via the API with strict zod validation + DB CHECK constraints.
- **Realtime** is a single channel subscription keyed on the authenticated user: `drops:<user_id>`. INSERT from any device (including `/share`) fans out to all tabs. The channel's JWT is refreshed on auth state changes via `supabase.realtime.setAuth`.
- **Undo on delete** is implemented client-side: the tile is removed optimistically, a toast with an "Undo" button shows for 5 seconds, and the DELETE is only sent on commit. If the tab is closed during the window, `navigator.sendBeacon` commits the pending deletes against a companion `POST /api/drops/[id]` handler.
- **SSRF-safe OG fetcher** (`lib/og.ts`) blocks non-HTTP(S) schemes, non-80/443 ports, and private-IP hosts; manually follows ≤3 redirects with per-hop revalidation; caps responses at 1 MB; caches results for 24h.
- **Rate limit** on `/api/og`: 30 req/min/user (in-memory token bucket).
- **CSRF defense** on mutating routes (`POST /api/drops`, `PATCH/DELETE/POST /api/drops/[id]`, `POST /share`) via an Origin + Sec-Fetch-Site check in `lib/security/same-origin.ts`.
- **Pagination:** server returns 50 drops initially; "Load older" uses keyset pagination on `(pinned desc, created_at desc, id desc)` via `GET /api/drops`.

---

## Known limitations / next steps

- No offline queue — if you drop something while offline it will fail. Could be wired to IndexedDB + background sync.
- In-memory rate limit + OG cache are per-instance; swap for Upstash if you deploy multi-region.
- No device management screen (revoke, rename).
- No thumbnail generation for videos/PDFs; files show the extension badge only.
- iOS lacks `share_target`; a native iOS Share Extension would close that gap.
