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

- Auth: Supabase email/password, SSR, protected routing
- Friend system: invite → accept flow, friend wishlist browsing
- Wishlists: create, edit, visibility toggle (draft vs visible)
- Wishlist items: add, reserve, reservation owner visibility
- Birthday collection at registration
- Bottom navigation: icon + label tabs, active state; profile tab shows avatar photo (circular, 24×24, blue border ring when active) or initials badge
- Home feed ("Лента"): activity stream (top, 4 events) + Друзья · Мои вишлисты · Я подарю sections. "Дни рождения" section was removed from Home.
- Activity feed: new wishlists · new visible items (grouped by wishlist+day) · new friends — last 7 days, relative timestamps, all entities clickable; wrapped in `.grouped-card` with `.feed-bullet` (light-blue 8×8 circle) per row and `.grouped-card-divider` (90% centered) between rows
- Friends page (`/friends`): `section-title` on `<h1>`, all friends in `.grouped-card`, avatar h-10 w-10 (safe wrapper), name+surname, second line: `N вишлиста • День рождения DD месяц` (same suppression rules as Home Friends block), `ml-[68px]` dividers, `<CreateInviteSection />` below list, empty state preserved
- Friends section (Home): `.grouped-card` with circular avatar (h-10 w-10, safe wrapper pattern), name+surname, second line: `N вишлиста • День рождения DD месяц` — count=0 suppressed ("0 вишлистов" never shown), birthday omitted if null, second line omitted entirely if both missing; `ml-[68px]` divider after avatar area
- My Wishlists section (Home): `.grouped-card` with title + item count below (`N желание/желания/желаний`), numeric count before `›` on right, full-width `h-px bg-[#f3f4f6]` dividers between rows
- Я подарю section (Home): `.grouped-card` with gift title on first line, `Для {ownerName}` on second line (`text-xs text-gray-400`), `›` on right, full-width dividers
- Profile page: avatar upload (tap to change, 2 MB limit, JPEG/PNG/WebP), large circular avatar `h-32 w-32` with `text-4xl` initials fallback, edit name/surname/birthday. Stats block (friends/wishlists counts) removed.
- Password change: "Безопасность" section, collapsed by default, current-password verification via re-auth, show/hide toggles, min 8 chars
- Account deletion placeholder: "Появится в следующей версии"
- App header (`app/(app)/layout.tsx`): avatar `h-16 w-16`, full name on one line (wraps naturally), `@username` on second line in `text-gray-400`, no bottom border/divider; shows on all app pages
- Username system: chosen at registration, auto-generated from transliterated name+surname (first 3 chars each), editable before submit, immutable after account creation, displayed read-only in profile and in app header
- Wishlist archiving: owner can archive/restore from wishlist detail page; archived wishlists invisible to friends; shown in muted "Архив" section (`text-sm font-medium text-gray-400`) at bottom of wishlists page; items and reservations preserved
- Wishlists page (`/wishlists`): `section-title` on `<h1>`, active wishlists in `.grouped-card` with item counts and full-width dividers; archive section in its own `.grouped-card` with full-width dividers, muted label (`text-sm font-medium text-gray-400`), muted row text (`text-gray-400`/`text-gray-300`)
- Branding: SimpleWish logo (`public/brand/simplewish-logo.png`) shown on login and register pages above the form; `h-11`, `mb-9`, `pb-[120px]` on `<main>`
- Font: primary app font is Inter via `next/font/google` (subsets: latin + cyrillic); CSS variable `--font-inter`; Geist Mono retained for `font-mono` usage; body uses `var(--font-inter), sans-serif`
- Section headers: all major section/page headings use `.section-title` CSS class (1.0625rem / semibold / #111827). Applied to: Друзья, Мои вишлисты, Я подарю (Home), Вишлисты and Друзья (page h1s). "Лента" not yet migrated. Subsection titles (Безопасность, Пригласить друга, Новый вишлист) intentionally excluded.
- Design system CSS classes in `app/globals.css`: `.section-title` (1.0625rem, 600, #111827), `.grouped-card` (white card, border #f3f4f6, radius 16px, shadow), `.feed-bullet` (8×8 light-blue #93c5fd circle), `.grouped-card-divider` (1px, 90% width, centered, #f3f4f6)

---

## Current focus

Approaching V1 release. All core features are functional and tested. Remaining work:

1. **Continued visual pass** — wishlist detail page, friend detail page
2. **Deploy V1** — Vercel production deploy

Friend search by username is deferred to V2.0. The `friend_requests` table and RPCs exist on remote but the UI is not implemented.

---

## Migrations (all applied to remote as of 2026-05-31)

| Migration | Description |
|---|---|
| 20260528000000 | Initial schema |
| 20260528000001 | Fix profile trigger |
| 20260530000000 | Wishlist item visibility (`is_visible` column + updated policies) |
| 20260530000001 | Profiles reserver visibility policy (fixed ambiguous `id` → `profiles.id`) |
| 20260530000002 | Birthday on registration (updated `handle_new_user` trigger) |
| 20260531000000 | Avatars storage bucket + RLS policies |
| 20260531000001 | Username system: column, format constraint, unique index, `transliterate_ru()`, `generate_username()`, `is_username_available()` RPC, row backfill, updated `handle_new_user` trigger |
| 20260531000002 | Friend requests: `friend_requests` table, RLS, `search_profiles_by_username_prefix`, `send_friend_request`, `accept_friend_request`, `decline_friend_request` RPCs (UI deferred to V2.0) |
| 20260531000003 | Wishlist archiving: updated 4 RLS policies to hide archived wishlists and their items/reservations from friends |

---

## Important technical decisions

- **Tailwind v4 blue bug:** `bg-blue-500` does not render (CSS variable chain issue). Use `bg-[#3b82f6]` for any blue backgrounds. `text-blue-500` works fine for text.
- **Tailwind v4 arbitrary class reliability:** Some arbitrary utility classes are not reliably generated by Tailwind v4's incremental dev compiler — especially multi-value shadows (`shadow-[...,...]`), dimension utilities (`h-[8px]`, `w-[8px]`), and others. Prefer named CSS classes in `app/globals.css` over arbitrary Tailwind utilities for any styling that must be guaranteed. Plain CSS in `globals.css` is always compiled unconditionally.
- **`bg-[#3b82f6]` dev-server CSS issue:** This class exists only in `bottom-nav.tsx`. Tailwind v4's incremental CSS compiler can intermittently drop it between hot-reloads or after significant edits to that file, making the + button invisible in dev. Production build always includes it (confirmed). If the + button disappears in dev: first try restarting `npm run dev`; if it persists, run `rm -rf .next` then restart. Do not "fix" this in code.
- **Circular avatar pattern:** Always use `overflow-hidden rounded-full` on the wrapper element with explicit `h-* w-*` dimensions, then `h-full w-full object-cover` on the `<img>`. Never put `rounded-full` directly on the img — Tailwind v4 preflight's `img { height: auto }` can cause oval rendering in certain flex contexts.
- **Storage path convention:** `avatars/{userId}/avatar.jpg` — each user writes only inside their own UUID folder.
- **Avatars bucket is public** — `getPublicUrl()` returns a direct URL with cache-bust `?v=timestamp`. Privacy enforced via profiles RLS, not bucket access.
- **Password change uses re-auth, not `current_password` field** — Supabase Cloud does not enforce `UserAttributes.current_password`. Verification is done by calling `signInWithPassword(email, currentPassword)` server-side before `updateUser`. Email is fetched from the session, not the form.
- **Username is immutable after registration** — no edit UI exists and none should be built. The `profiles.username` column has a UNIQUE constraint and a format CHECK constraint (`^[a-z][a-z0-9_]{1,28}[a-z0-9]$`, no `__`). The profile page shows it read-only with an explanatory note.
- **Username auto-generation:** `generate_username(name, surname)` DB function transliterates Russian to Latin, takes up to 3 chars from each, appends a numeric counter on collision. The same logic is mirrored in `register-form.tsx` (`buildUsernamePreview`) for the live preview — keep in sync with the SQL.
- **Activity feed grouping:** `new_items` events group by `(owner_id, wishlist_id, calendar_day)` in JS to prevent spam when a friend adds multiple items at once.
- **Activity feed timestamps:** `wishlist_items.created_at` = insert time, not publish time. Items drafted then published later carry the draft date. No `published_at` column; acceptable for V1.
- **Font loading:** `next/font/google` with Inter, subsets `['latin', 'cyrillic']`, CSS variable `--font-inter`, `display: 'swap'`. Geist Mono loaded separately for `font-mono`. Body uses `var(--font-inter), sans-serif` in globals.css and `--font-sans: var(--font-inter)` in the Tailwind `@theme` block.
- **Item count pattern:** Home and Wishlists pages fetch item counts via a separate query: `select('wishlist_id').in('wishlist_id', ids)` → `Map<string, number>` client-side. Home and Friends pages fetch friend wishlist counts via the same pattern against the `wishlists` table. These are intentionally duplicated for now; refactor to shared helpers is deferred.
- **Shared formatting helpers (`lib/format.ts`):** `pluralRu`, `getDaysUntilBirthday`, `friendBirthdayLine` are exported from here and imported by Home, Friends, and Wishlists pages. Do not re-define these locally. `moreItemsLabel` remains local to `home/page.tsx` for now.
- **Wishlist divider pattern:** activity feed uses `.grouped-card-divider` (90% centered); friends rows use `ml-[68px] h-px bg-[#f3f4f6]` (offset after avatar); wishlists and Я подарю rows use `h-px bg-[#f3f4f6]` (full-width). Each pattern is intentional for its context.
- **`migration repair --linked` works without Docker** — use to fix migration tracking on remote when schema was applied manually.
- **Docker not available in dev environment** — `supabase db diff`, `supabase db dump`, `supabase db reset` all require Docker and will fail.
- **Birthday data is NULL for most existing users** — registered before birthday field was added.
- **Policies inside `20260530000000` may be missing from remote** — the `is_visible` column was applied manually before migration tracking; the policy DROP/CREATE statements may not have run. Verify via Supabase dashboard SQL editor if wishlist visibility behaves incorrectly.

---

## Known issues

- Birthday empty for most existing users (registered before birthday field was added)
- `20260530000000` policies may be missing from remote (see technical decisions above)
- `<h1>Лента</h1>` on Home page still uses `text-xl font-semibold` directly instead of `.section-title` — deferred
