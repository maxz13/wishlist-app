# Project Context

> Read this at the start of every new session before making any plans or edits.

---

## What this project is

**SimpleWish** — private collaborative wishlist + gift coordination PWA.
Users create wishlists, friends reserve items to avoid duplicate gifts.

Stack: Next.js App Router · TypeScript · Tailwind v4 · lucide-react · Supabase (Postgres, Auth, RLS, Storage) · Vercel  
Language: Russian UI · Mobile-first · iOS-native feel · Light theme only  
Production: `https://www.simplewish.es` · Vercel project: `wishlist-app` (max-zavyalov-s-projects)

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
- Friends page (`/friends`): `section-title` h1; incoming requests section (`grouped-card`, accept/decline, optimistic removal); live username search (2-char threshold, 300ms debounce, `search_profiles_by_username_prefix` RPC, browser Supabase client); search results in `grouped-card` with avatar + @username + name + status-aware button; existing friends list in `grouped-card` with wishlist count + birthday subline; `<CreateInviteSection />` preserved
- Friends section (Home): `.grouped-card`, avatar h-10 w-10, name+surname, second line: `N вишлиста • День рождения DD месяц` — count=0 suppressed, birthday omitted if null; `ml-[68px]` divider after avatar
- My Wishlists section (Home): `.grouped-card`, title + item count below, numeric count before `›`, full-width dividers
- Я подарю section (Home): `.grouped-card`, gift title line 1, `Для {ownerName}` line 2, `›`, full-width dividers
- Profile page: avatar upload with client-side Canvas compression (max 6 MB input, resized to max 768×768, JPEG 0.85 quality, MIME validation); avatar removal ("Удалить фото" — deletes from storage + sets avatar_url null, ignores not-found errors); fields (name, surname, birthday, email) in `grouped-card` with transparent inputs; `h-32 w-32` avatar with `text-4xl` initials fallback. Stats block removed.
- Password change: "Безопасность" section, collapsed by default, current-password re-auth, show/hide toggles, min 8 chars
- Account deletion placeholder: "Появится в следующей версии"
- App header (`app/(app)/layout.tsx`): avatar `h-16 w-16`, full name on one line, `@username` second line in `text-gray-400`, logout icon (`LogOut` from `lucide-react`, size 18, `aria-label="Выйти"`), no bottom border; shown on all app pages
- Username system: auto-generated at registration from name+surname transliteration, editable before submit, immutable after creation, shown in profile (read-only) and header
- Wishlist archiving: archive/restore from detail page; invisible to friends; muted "Архив" section at bottom of wishlists page in its own `grouped-card`
- Wishlists page (`/wishlists`): `section-title` h1, active wishlists in `grouped-card` with item counts; archive in separate `grouped-card` with muted styling
- Branding: SimpleWish logo (`public/brand/simplewish-logo.png`) on login/register; `h-11 mb-9`
- Font: Inter via `next/font/google` (latin + cyrillic); `--font-inter`; Geist Mono for `font-mono`
- Section headers: `.section-title` (1.0625rem / 600 / #111827) on all major headings. "Лента" not yet migrated.
- Design system CSS (`app/globals.css`): `.section-title`, `.grouped-card`, `.feed-bullet`, `.grouped-card-divider`, `font-size: 16px !important` on all inputs/textarea/select (mobile zoom prevention)
- Mobile PWA: viewport export in `app/layout.tsx` sets `maximumScale: 1, userScalable: false` — **this is what prevents Safari input zoom**; `bg-white` on both `html` and `body` prevents gray background on overscroll

---

## Current focus

V1 deployed to production. Core issue resolved: registration and Safari zoom fixed. Incoming friend requests now display correctly on the Friends page.

Remaining work:
1. Apply pending migrations to remote (see Migrations table)
2. Remove debug logging from `registerAction` once production registration confirmed working
3. Visual pass — wishlist detail page, friend detail page
4. Update `app/layout.tsx` metadata from stale CNA defaults to "SimpleWish"

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
| 20260531000001 | Applied | Username system (incl. `is_username_available`, `generate_username`, `handle_new_user` trigger) |
| 20260531000002 | Applied | Friend requests table + RPCs |
| 20260531000003 | Applied | Wishlist archiving RLS |
| 20260602000000 | **Apply manually** | Lower `search_profiles_by_username_prefix` threshold 3 → 2 chars |
| 20260602000001 | **Apply manually** | Restore `is_username_available` RPC (fixes production registration). After applying run: `NOTIFY pgrst, 'reload schema';` |

---

## Important technical decisions

- **Tailwind v4 blue bug:** `bg-blue-500` does not render. Use `bg-[#3b82f6]`. `text-blue-500` works fine.
- **Tailwind v4 arbitrary class reliability:** Multi-value shadows and some dimension utilities unreliable in dev. Prefer named CSS classes in `app/globals.css`.
- **`bg-[#3b82f6]` dev-server issue:** Only in `bottom-nav.tsx`. Can drop between hot-reloads. Restart dev or `rm -rf .next`. Do not fix in code.
- **Circular avatar pattern:** `overflow-hidden rounded-full` on wrapper + explicit `h-* w-*`; `h-full w-full object-cover` on `<img>`. Never `rounded-full` on `<img>`.
- **Storage path:** `avatars/{userId}/avatar.jpg`.
- **Avatars bucket is public** — `getPublicUrl()` + `?v=timestamp`. Privacy via profiles RLS.
- **Avatar compression:** client-side Canvas API in `profile-form.tsx`. Validates MIME (JPEG/PNG/WebP), rejects >6 MB, resizes to max 768px, encodes as JPEG at 0.85 quality before upload.
- **Avatar removal:** `removeAvatarAction()` in `features/profile/actions.ts`. Deletes storage file, ignores "not found" errors, sets `avatar_url = null`, revalidates `/profile` and `/home`.
- **Safari input zoom fix:** `export const viewport = { maximumScale: 1, userScalable: false }` in `app/layout.tsx`. This is the actual fix — confirmed via investigation. The `font-size: 16px !important` rule in `globals.css` is a belt-and-suspenders backup but the viewport export is the root fix.
- **Password change uses re-auth** — `signInWithPassword` server-side before `updateUser`.
- **Username is immutable after registration.** CHECK: `^[a-z][a-z0-9_]{1,28}[a-z0-9]$`, no `__`. Min 3 chars.
- **Username auto-generation:** `generate_username(name, surname)` DB function. Mirrored in `register-form.tsx` (`buildUsernamePreview`) — keep in sync.
- **Activity feed grouping:** `new_items` group by `(owner_id, wishlist_id, calendar_day)` in JS.
- **Font loading:** `next/font/google`, Inter, `['latin', 'cyrillic']`, `--font-inter`, `display: 'swap'`.
- **Item count pattern:** Separate query `select('wishlist_id').in(...)` → `Map<string, number>`. Duplicated; refactor deferred.
- **Shared formatting helpers (`lib/format.ts`):** `pluralRu`, `getDaysUntilBirthday`, `friendBirthdayLine`. Do not redefine locally. `moreItemsLabel` stays local to `home/page.tsx`.
- **Wishlist divider pattern:** feed = `.grouped-card-divider` (90% centered); friend/search rows = `ml-[68px] h-px bg-[#f3f4f6]`; wishlists/Я подарю = `h-px bg-[#f3f4f6]` (full-width).
- **Friend search architecture:** `SearchSection` client component uses `getSupabaseBrowserClient()` for live RPC. Mutations via server actions + `revalidatePath('/friends')`. State classification derived from server props; updated optimistically.
- **Search status derivation:** `effectiveStatus = query.length < 2 ? 'idle' : status` — derived in render, avoids `react-hooks/set-state-in-effect` lint error.
- **`friendships` RLS:** `USING (user_id = auth.uid())` — only current user's rows returned.
- **`accept_invite` gap:** does not clean up `friend_requests` when users connect via invite link. Cleanup SQL: `DELETE FROM friend_requests fr WHERE EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = fr.from_user_id AND f.friend_id = fr.to_user_id)`.
- **`profiles_select_incoming_request_sender` RLS bug (fixed 2026-06-03):** The policy originally used `fr.from_user_id = fr.id` instead of `fr.from_user_id = profiles.id`. This caused the EXISTS subquery to never match, so sender profiles were invisible under RLS. Incoming requests existed in `friend_requests` but the profiles query silently returned `[]`. Fixed by correcting the USING clause on production. The `friend_requests` query and JS filtering were always correct — the bug was purely in the DB policy expression.
- **PostgREST schema cache:** after applying functions via SQL editor, run `NOTIFY pgrst, 'reload schema';` to make them immediately available. Without this, RPCs return `PGRST125`.
- **`migration repair --linked` works without Docker.**
- **Docker not available in dev** — `supabase db diff/dump/reset` require Docker.
- **Birthday NULL for most existing users** — registered before birthday field added.
- **`20260530000000` policies may be missing from remote** — applied manually before tracking; verify via dashboard if visibility behaves incorrectly.

---

## Known issues

- **Registration broken on production** — `is_username_available` RPC returns `PGRST125`. Fix: apply migration `20260602000001` + `NOTIFY pgrst, 'reload schema';`
- Debug `console.error` in `registerAction` (`features/auth/actions.ts`) — remove after production registration confirmed
- `app/layout.tsx` metadata: `title: "Create Next App"` — stale, needs updating to "SimpleWish"
- Birthday empty for most existing users
- `20260530000000` policies may be missing from remote
- **Incoming friend requests fixed** — `profiles_select_incoming_request_sender` policy corrected on production (2026-06-03); see technical decisions for root cause
- `<h1>Лента</h1>` uses `text-xl font-semibold` instead of `.section-title` — deferred
- `accept_invite` does not clean up `friend_requests` rows when users mix both friend flows
- Migrations `20260602000000` and `20260602000001` not yet applied to remote
