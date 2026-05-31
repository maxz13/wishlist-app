# Project Context

> Read this at the start of every new session before making any plans or edits.

---

## What this project is

**Вишлист** — private collaborative wishlist + gift coordination PWA.
Users create wishlists, friends reserve items to avoid duplicate gifts.

Stack: Next.js App Router · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth, RLS, Storage) · Vercel  
Language: Russian UI · Mobile-first · iOS-native feel · Light theme only

Scope is strictly controlled. Read `AI_RULES.md` and `MVP_SCOPE.md` before touching anything.

---

## Completed features

- Auth (Supabase email/password, SSR, protected routing)
- Friend system: invite → accept flow, friend wishlist browsing
- Wishlists: create, edit, visibility toggle (draft vs visible)
- Wishlist items: add, reserve, reservation owner visibility
- Birthday collection at registration
- Home feed ("Лента"): Друзья · Дни рождения · Мои вишлисты · Я подарю sections, overflow links
- Bottom navigation: icon + label tabs, active state, profile initials badge
- Profile page: view + edit form (`features/profile/`)
- Activity feed ("Лента"): new wishlists, new visible items (grouped by wishlist+day), new friends — last 7 days, max 5 events, relative timestamps, fully clickable entities

---

## Current unfinished task

**Avatar upload** — storage infrastructure is now in place (bucket + policies applied). Application-level upload code in `features/profile/` and `app/(app)/profile/page.tsx` has not been tested end-to-end yet. Next step: verify avatar upload works in the running app.

---

## Important technical decisions

- **Tailwind v4 blue bug:** `bg-blue-500` does not render (CSS variable chain issue). Use `bg-[#3b82f6]` for any blue backgrounds. `text-blue-500` works fine for text.
- **Storage path convention:** `avatars/{userId}/avatar.jpg` — each user writes only inside their own UUID folder.
- **Avatars bucket is public** — `getPublicUrl()` returns a direct URL; no expiry management needed. Privacy is enforced via profiles RLS, not bucket access.
- **Birthday data is NULL for most existing users** — registered before the birthday field was added. Needs profile edit UI or a backfill; currently displayed as empty in the feed.
- **`migration repair --linked` works without Docker** — useful for fixing migration tracking on remote without a local Supabase setup.
- **Docker not available in dev environment** — `supabase db diff`, `supabase db dump`, and `supabase db reset` all require Docker and will fail.

---

## Known issues

- Avatar upload infrastructure ready but end-to-end not tested
- Birthday empty for most existing users (registered before birthday field added)
- Policies inside `20260530000000` may be missing from remote (column was applied manually; verify via Supabase dashboard SQL editor)
- Activity feed: `wishlist_items.created_at` reflects insert time, not publish time — items drafted then published later carry stale timestamps (no `published_at` column; acceptable for V1)

---

## Next planned tasks

1. Test avatar upload end-to-end on the profile page
2. Verify `20260530000000` policies are live on remote; apply manually if missing
3. Build dedicated activity page (`/activity`) for "и ещё N событий" overflow
