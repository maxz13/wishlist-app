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
- Wishlists: create, edit, archive/restore, per-wishlist visibility control
- Wishlist items: add, inline edit (title/price/link), reserve, reservation owner visibility
- Birthday collection at registration
- Bottom navigation: icon + label tabs, active state; nav height 74px; icon containers 28×28; SVG icons 23×23; central `+` button 64×64 (blue circle, raised `-mt-[18px]`); profile tab shows avatar photo (circular, 28×28, blue border ring when active) or initials badge; green dot (bottom-right of Friends icon) when pending incoming requests > 0; no top border; background `#fafafa`
- Home feed ("Лента"): incoming friend requests section (compact horizontal card: avatar + name/username + green Принять + red Отклонить) rendered above activity stream; activity stream (top 4 events) + Друзья · Мои вишлисты · Я подарю sections.
- Activity feed events (all last 7 days, relative timestamps, entities clickable):
  - `new_friend` — friendship formed
  - `new_wishlist` — friend created a wishlist
  - `new_items` — friend added visible items (grouped by wishlist+day)
  - `wishlist_item_reserved` — someone reserved one of the owner's items; random label from 4 variants; two-line format
  - `wishlist_access_granted` — a friend added the current user to a private wishlist; two-line format (owner name + wishlist title)
  - Wrapped in `.grouped-card` with `.feed-bullet` per row and `.grouped-card-divider` between rows
- Friends page (`/friends`): `section-title` h1; incoming requests section (`grouped-card`, accept/decline, optimistic removal); live username search (2-char threshold, 300ms debounce, `search_profiles_by_username_prefix` RPC, browser Supabase client); search results in `grouped-card` with avatar + @username + name + status-aware button; existing friends list in `grouped-card` with wishlist count + birthday subline; `<CreateInviteSection />` preserved
- Friends section (Home): `.grouped-card`, avatar h-10 w-10, name+surname, second line: `N вишлиста • День рождения DD месяц` — count=0 suppressed, birthday omitted if null; `ml-[68px]` divider after avatar
- My Wishlists section (Home): `.grouped-card`, title + item count below, numeric count before `›`, full-width dividers
- Я подарю section (Home): `.grouped-card`, gift title line 1, `Для {ownerName}` line 2, `›`, full-width dividers
- Profile page: avatar upload with client-side Canvas compression (max 6 MB input, resized to max 768×768, JPEG 0.85 quality, MIME validation); avatar removal ("Удалить фото" — deletes from storage + sets avatar_url null, ignores not-found errors); fields (name, surname, birthday, email) in `grouped-card` with transparent inputs; `h-32 w-32` avatar with `text-4xl` initials fallback.
- Password change: "Безопасность" section, collapsed by default, current-password re-auth, show/hide toggles, min 8 chars
- Account deletion placeholder: "Появится в следующей версии"
- App header (`app/(app)/layout.tsx`): avatar `h-16 w-16`, full name on one line, `@username` second line in `text-gray-400`, logout icon (`LogOut` from `lucide-react`, size 18, `aria-label="Выйти"`), no bottom border; shown on all app pages
- Username system: auto-generated at registration from name+surname transliteration, editable before submit, immutable after creation, shown in profile (read-only) and header
- Wishlist archiving: archive/restore from detail page (bottom of page); invisible to friends; muted "Архив" section at bottom of wishlists page in its own `grouped-card`
- Wishlists page (`/wishlists`): `section-title` h1; active wishlists in `grouped-card` with item counts; visibility indicators on cards; "Доступные вам" section for private wishlists shared with the user via selected_friends access; archive in separate `grouped-card` with muted styling
- Wishlist item visibility: new items default to `is_visible: true`; toggle via "Спрятать" / "Показать" text button always visible in each owner row (right of title, left of ⋯); hidden items rendered in `text-gray-400`; no draft legend
- Wishlist owner item row (⋯ menu): Переименовать · Удалить
- Wishlist-level visibility: three modes — `all_friends` (default), `private`, `selected_friends`. Controlled via `WishlistAccessSection` at the bottom of the wishlist detail page (owner only), between item list and archive. Collapsed shows current mode label + "Изменить"; expanded shows radio selector + friend checklist (avatars + initials fallback). If `selected_friends` with 0 friends selected, treated as `private`. Friend avatars (h-6 w-6 strip in collapsed, h-7 w-7 in checklist).
- Wishlist card visibility indicators (owner view): `private` → `Lock` icon + "Скрыт от всех"; `selected_friends` → "Виден N другу/друзьям" (pluralRu)
- "Доступные вам" section on wishlists page: shows `selected_friends` wishlists shared with the current user; each card is read-only with "🔒 По приглашению" badge; disappears automatically if access revoked or visibility changed
- Branding: SimpleWish logo (`public/brand/simplewish-logo.png`) on login/register; `h-11 mb-9`
- Font: Inter via `next/font/google` (latin + cyrillic); `--font-inter`; Geist Mono for `font-mono`
- Section headers: `.section-title` (1.0625rem / 600 / #111827) on all major headings. "Лента" not yet migrated.
- Design system CSS (`app/globals.css`): `.section-title`, `.grouped-card`, `.feed-bullet`, `.grouped-card-divider`, `font-size: 16px !important` on all inputs/textarea/select (mobile zoom prevention)
- Mobile PWA: viewport export in `app/layout.tsx` sets `maximumScale: 1, userScalable: false`; `bg-[#fafafa]` on both `html` and `body`; `.grouped-card` stays `#ffffff`
- iOS Keychain autocomplete fix: `register-form.tsx` — email field `autoComplete="email username"`, username `autoComplete="nickname"`, password `autoComplete="new-password"`
- Email confirmation: Resend configured as custom SMTP provider in Supabase dashboard (`smtp.resend.com`, port 465, API key as password). Supabase built-in mailer is NOT used.

---

## Current focus

Session 2026-06-03 complete. All features deployed to production on `main`.

Remaining work:
1. Remove debug `console.error` in `registerAction` (`features/auth/actions.ts`) — was added during registration debugging, still present
2. Update `app/layout.tsx` metadata: `title: "Create Next App"` → "SimpleWish"
3. Visual pass — wishlist detail page, friend detail page
4. `<h1>Лента</h1>` uses `text-xl font-semibold` instead of `.section-title` — deferred

---

## Migrations

| Migration | Status | Description |
|---|---|---|
| 20260528000000 | Applied | Initial schema |
| 20260528000001 | Applied | Fix profile trigger |
| 20260530000000 | Applied | Wishlist item visibility (`is_visible` column + RLS) |
| 20260530000001 | Applied | Profiles reserver visibility policy |
| 20260530000002 | Applied | Birthday on registration |
| 20260531000000 | Applied | Avatars storage bucket + RLS |
| 20260531000001 | Applied | Username system (incl. `is_username_available`, `generate_username`, `handle_new_user` trigger) |
| 20260531000002 | Applied | Friend requests table + RPCs |
| 20260531000003 | Applied | Wishlist archiving RLS |
| 20260602000000 | Applied | Lower `search_profiles_by_username_prefix` threshold 3 → 2 chars |
| 20260602000001 | Applied | Restore `is_username_available` RPC |
| 20260603000000 | Applied | Wishlist-level visibility (`visibility` column, `wishlist_access` table, `can_friend_see_wishlist()`, updated RLS on wishlists/items/reservations) |
| 20260603000001 | Applied | `wishlist_access.created_at` (NULLable, existing rows stay NULL) + `wishlist_access_self_select` policy |

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
- **Safari input zoom fix:** `export const viewport = { maximumScale: 1, userScalable: false }` in `app/layout.tsx`. This is the actual fix. The `font-size: 16px !important` rule in `globals.css` is belt-and-suspenders backup.
- **Password change uses re-auth** — `signInWithPassword` server-side before `updateUser`.
- **Username is immutable after registration.** CHECK: `^[a-z][a-z0-9_]{1,28}[a-z0-9]$`, no `__`. Min 3 chars.
- **Username auto-generation:** `generate_username(name, surname)` DB function. Mirrored in `register-form.tsx` (`buildUsernamePreview`) — keep in sync.
- **Activity feed grouping:** `new_items` group by `(owner_id, wishlist_id, calendar_day)` in JS.
- **Activity feed event types:** `new_friend`, `new_wishlist`, `new_items`, `wishlist_item_reserved`, `wishlist_access_granted`. All computed at query time from existing tables — no events table.
- **`wishlist_item_reserved` label:** deterministic from reservation UUID char-code sum mod 4 — same event always shows same text across renders.
- **`wishlist_access_granted` feed event:** appears when `wishlist_access.created_at >= 7 days ago`. Old rows have NULL `created_at` (excluded by filter). Access removal deletes the `wishlist_access` row → event vanishes automatically.
- **Font loading:** `next/font/google`, Inter, `['latin', 'cyrillic']`, `--font-inter`, `display: 'swap'`.
- **Item count pattern:** Separate query `select('wishlist_id').in(...)` → `Map<string, number>`. Duplicated across pages; refactor deferred.
- **Shared formatting helpers (`lib/format.ts`):** `pluralRu`, `getDaysUntilBirthday`, `friendBirthdayLine`. Do not redefine locally. `moreItemsLabel` stays local to `home/page.tsx`.
- **Wishlist divider pattern:** feed = `.grouped-card-divider` (90% centered); friend/search rows = `ml-[68px] h-px bg-[#f3f4f6]`; wishlists/Я подарю = `h-px bg-[#f3f4f6]` (full-width).
- **Friend search architecture:** `SearchSection` client component uses `getSupabaseBrowserClient()` for live RPC. Mutations via server actions + `revalidatePath('/friends')`. State classification derived from server props; updated optimistically.
- **Search status derivation:** `effectiveStatus = query.length < 2 ? 'idle' : status` — derived in render, avoids `react-hooks/set-state-in-effect` lint error.
- **`friendships` RLS:** `USING (user_id = auth.uid())` — only current user's rows returned.
- **`accept_invite` gap:** does not clean up `friend_requests` when users connect via invite link. Cleanup SQL: `DELETE FROM friend_requests fr WHERE EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = fr.from_user_id AND f.friend_id = fr.to_user_id)`.
- **`profiles_select_incoming_request_sender` RLS bug (fixed 2026-06-03):** policy originally used `fr.from_user_id = fr.id` instead of `fr.from_user_id = profiles.id`. Fixed on production.
- **Bottom nav sizing system:** nav `h-[74px]`, `iconBox` `h-7 w-7` (28px), SVG icons `h-[23px] w-[23px]` (23px), `PlusIcon` `h-7 w-7` (28px), central button `h-16 w-16` (64px), raise `-mt-[18px]`. Profile avatar wrapper must match `iconBox` (`h-7 w-7`).
- **App background:** `#fafafa` (`:root --background`, `html`, `body`). Cards (`.grouped-card`) stay `#ffffff`. Auth pages unaffected.
- **PostgREST schema cache:** after applying functions via SQL editor, run `NOTIFY pgrst, 'reload schema';` to make them immediately available. Without this, RPCs return `PGRST125`.
- **`migration repair --linked` works without Docker.**
- **Docker not available in dev** — `supabase db diff/dump/reset` require Docker.
- **Birthday NULL for most existing users** — registered before birthday field added.
- **Wishlist visibility system:** `wishlists.visibility` is `text NOT NULL DEFAULT 'all_friends'` with CHECK (`all_friends | private | selected_friends`). `wishlist_access` table holds `(wishlist_id, user_id, created_at)` rows only for `selected_friends` wishlists. `can_friend_see_wishlist(caller uuid, wl_id uuid)` SECURITY DEFINER function centralises the access check — called from wishlists/wishlist_items/reservations SELECT and reservations INSERT policies. Unfriending automatically revokes selected_friends access (the function checks `is_friend()` as well as the access table).
- **`wishlist_access` RLS:** `wishlist_access_owner` (FOR ALL) — owner controls the list. `wishlist_access_self_select` (FOR SELECT) — users can read their own access rows. Write is owner-only in both cases.
- **Visibility action idempotency:** `updateWishlistVisibilityAction` does DELETE all `wishlist_access` rows then re-inserts. Re-saved friends get fresh `created_at` on their access rows.
- **`selected_friends` with 0 friends:** `updateWishlistVisibilityAction` converts to `private` server-side. UI label falls back to "Только я" in collapsed state.
- **"Доступные вам" query:** queries `wishlists` directly with `visibility = selected_friends AND NOT is_archived AND owner_id != me`. RLS (`can_friend_see_wishlist`) acts as the access gate — no need to query `wishlist_access` directly for this view.
- **Wishlist item visibility toggle:** moved from left-column circle button to inline text button ("Спрятать" gray-500 / "Показать" blue-500) always visible in the row, right of title, left of ⋯. Hidden when edit form is expanded or in delete-confirmation state.

---

## Known issues

- Debug `console.error` in `registerAction` (`features/auth/actions.ts`) — remove when convenient
- `app/layout.tsx` metadata: `title: "Create Next App"` — stale, update to "SimpleWish"
- Birthday empty for most existing users (registered before birthday field)
- `<h1>Лента</h1>` uses `text-xl font-semibold` instead of `.section-title` — deferred
- `accept_invite` does not clean up `friend_requests` rows when users mix both friend flows
- `20260530000000` policies may be missing from remote — applied manually before migration tracking; verify via dashboard if visibility behaves incorrectly
