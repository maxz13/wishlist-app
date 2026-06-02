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
- Friend system: invite → accept flow AND username-based friend requests (both active)
- Wishlists: create, edit, visibility toggle (draft vs visible)
- Wishlist items: add, reserve, reservation owner visibility
- Birthday collection at registration
- Bottom navigation: icon + label tabs, active state; profile tab shows avatar photo (circular, 24×24, blue border ring when active) or initials badge
- Home feed ("Лента"): activity stream (top, 4 events) + Друзья · Мои вишлисты · Я подарю sections. "Дни рождения" section removed.
- Activity feed: new wishlists · new visible items (grouped by wishlist+day) · new friends — last 7 days, relative timestamps, all entities clickable; wrapped in `.grouped-card` with `.feed-bullet` (light-blue 8×8 circle) per row and `.grouped-card-divider` (90% centered) between rows
- Friends page (`/friends`): `section-title` h1; incoming requests section (`grouped-card`, accept/decline buttons, optimistic removal); live username search (2-char threshold, 300ms debounce, `search_profiles_by_username_prefix` RPC, browser Supabase client); search results in `grouped-card` showing avatar + @username + name, status-aware button (Отправить / Запрос отправлен / Принять / Уже в друзьях); existing friends list in `grouped-card` with wishlist count + birthday subline; `<CreateInviteSection />` preserved
- Friends section (Home): `.grouped-card`, avatar h-10 w-10, name+surname, second line: `N вишлиста • День рождения DD месяц` — count=0 suppressed, birthday omitted if null, both missing → no second line; `ml-[68px]` divider after avatar
- My Wishlists section (Home): `.grouped-card`, title + item count below (`N желание/желания/желаний`), numeric count before `›`, full-width dividers
- Я подарю section (Home): `.grouped-card`, gift title line 1, `Для {ownerName}` line 2 (`text-xs text-gray-400`), `›`, full-width dividers
- Profile page: avatar upload (tap to change, 2 MB limit, JPEG/PNG/WebP), large circular avatar `h-32 w-32` with `text-4xl` initials fallback, edit name/surname/birthday. Stats block removed.
- Password change: "Безопасность" section, collapsed by default, current-password verification via re-auth, show/hide toggles, min 8 chars
- Account deletion placeholder: "Появится в следующей версии"
- App header (`app/(app)/layout.tsx`): avatar `h-16 w-16`, full name on one line (wraps naturally), `@username` second line in `text-gray-400`, no bottom border/divider; shown on all app pages
- Username system: chosen at registration, auto-generated from transliterated name+surname (first 3 chars each), editable before submit, immutable after creation, displayed read-only in profile and header
- Wishlist archiving: owner can archive/restore from wishlist detail page; invisible to friends; muted "Архив" section at bottom of wishlists page in its own `grouped-card`; items and reservations preserved
- Wishlists page (`/wishlists`): `section-title` h1, active wishlists in `grouped-card` with item counts and full-width dividers; archive in separate `grouped-card` with muted styling
- Branding: SimpleWish logo (`public/brand/simplewish-logo.png`) on login/register pages; `h-11`, `mb-9`, `pb-[120px]` on `<main>`
- Font: Inter via `next/font/google` (latin + cyrillic); CSS variable `--font-inter`; Geist Mono for `font-mono`
- Section headers: `.section-title` (1.0625rem / 600 / #111827) applied to all major headings: Друзья, Мои вишлисты, Я подарю, Входящие запросы, Найти друга (Friends page), Вишлисты (page h1). "Лента" not yet migrated.
- Design system CSS classes in `app/globals.css`: `.section-title`, `.grouped-card`, `.feed-bullet`, `.grouped-card-divider`

---

## Current focus

Approaching V1 release. All core features are functional. Remaining work:

1. **Continued visual pass** — wishlist detail page, friend detail page
2. **Deploy V1** — Vercel production deploy

---

## Migrations

| Migration | Status | Description |
|---|---|---|
| 20260528000000 | Applied | Initial schema |
| 20260528000001 | Applied | Fix profile trigger |
| 20260530000000 | Applied | Wishlist item visibility |
| 20260530000001 | Applied | Profiles reserver visibility policy |
| 20260530000002 | Applied | Birthday on registration |
| 20260531000000 | Applied | Avatars storage bucket + RLS |
| 20260531000001 | Applied | Username system |
| 20260531000002 | Applied | Friend requests table + RPCs |
| 20260531000003 | Applied | Wishlist archiving RLS |
| 20260602000000 | **Apply manually** | Lower `search_profiles_by_username_prefix` threshold from 3 → 2 chars. Run via Supabase dashboard SQL editor. |

---

## Important technical decisions

- **Tailwind v4 blue bug:** `bg-blue-500` does not render. Use `bg-[#3b82f6]` for blue backgrounds. `text-blue-500` works fine.
- **Tailwind v4 arbitrary class reliability:** Multi-value shadows and some dimension utilities are not reliably generated in dev. Prefer named CSS classes in `app/globals.css`. Plain CSS there is always compiled unconditionally.
- **`bg-[#3b82f6]` dev-server issue:** Only in `bottom-nav.tsx`. Can drop between hot-reloads. Restart `npm run dev` or `rm -rf .next` if + button disappears. Do not fix in code.
- **Circular avatar pattern:** `overflow-hidden rounded-full` on wrapper + explicit `h-* w-*`; `h-full w-full object-cover` on `<img>`. Never `rounded-full` directly on `<img>`.
- **Storage path convention:** `avatars/{userId}/avatar.jpg`.
- **Avatars bucket is public** — `getPublicUrl()` with `?v=timestamp`. Privacy via profiles RLS.
- **Password change uses re-auth** — `signInWithPassword` server-side before `updateUser`. Supabase Cloud doesn't enforce `current_password` field.
- **Username is immutable after registration.** Format CHECK: `^[a-z][a-z0-9_]{1,28}[a-z0-9]$`, no `__`. Minimum length: 3 chars.
- **Username auto-generation:** `generate_username(name, surname)` DB function. Mirrored in `register-form.tsx` (`buildUsernamePreview`) — keep in sync.
- **Activity feed grouping:** `new_items` events group by `(owner_id, wishlist_id, calendar_day)` in JS.
- **Activity feed timestamps:** `wishlist_items.created_at` = insert time, not publish time. No `published_at`.
- **Font loading:** `next/font/google`, Inter, `['latin', 'cyrillic']`, `--font-inter`, `display: 'swap'`.
- **Item count pattern:** Separate query `select('wishlist_id').in(...)` → `Map<string, number>`. Duplicated across Home/Wishlists/Friends pages; refactor deferred.
- **Shared formatting helpers (`lib/format.ts`):** `pluralRu`, `getDaysUntilBirthday`, `friendBirthdayLine` exported here. Do not redefine locally. `moreItemsLabel` stays local to `home/page.tsx`.
- **Wishlist divider pattern:** feed = `.grouped-card-divider` (90% centered); friend/search rows = `ml-[68px] h-px bg-[#f3f4f6]` (after avatar); wishlists/Я подарю = `h-px bg-[#f3f4f6]` (full-width).
- **Friend search architecture:** `SearchSection` is a `'use client'` component. Uses `getSupabaseBrowserClient()` directly for live RPC calls (not server actions). Send/accept/decline mutations go through server actions in `features/friends/actions.ts` with `revalidatePath('/friends')`. State classification (`isFriend`, `isOutgoing`, `incomingReqId`) is derived from props passed at page load; local state updated optimistically on mutations.
- **Search status derivation:** `effectiveStatus = query.length < 2 ? 'idle' : status` — derived in render, not reset via setState in effect (avoids `react-hooks/set-state-in-effect` lint error).
- **`friendships` RLS policy:** `USING (user_id = auth.uid())` — only rows where the current user is `user_id` are returned. The query `select('friend_id').from('friendships')` correctly returns all the current user's friends.
- **`accept_invite` does not clean up `friend_requests`** — if a user sent a username-based request AND later connected via invite link instead, the request row survives. Known gap; a future migration should add cleanup to `accept_invite`. One-time cleanup: `DELETE FROM friend_requests fr WHERE EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = fr.from_user_id AND f.friend_id = fr.to_user_id)`.
- **`migration repair --linked` works without Docker.**
- **Docker not available in dev** — `supabase db diff/dump/reset` require Docker and will fail.
- **Birthday data is NULL for most existing users** — registered before birthday field was added.
- **Policies inside `20260530000000` may be missing from remote** — applied manually before tracking; verify via dashboard if visibility behaves incorrectly.

---

## Known issues

- Birthday empty for most existing users (registered before birthday field was added)
- `20260530000000` policies may be missing from remote (see above)
- `<h1>Лента</h1>` on Home page uses `text-xl font-semibold` instead of `.section-title` — deferred
- `accept_invite` does not clean up `friend_requests` rows — gap exists if users mix both friend flows (see technical decisions above)
- Migration `20260602000000` not yet applied to remote — search still requires 3 chars on remote until applied
