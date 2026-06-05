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
- Friends page (`/friends`): `section-title` h1; incoming requests section (`grouped-card`, accept/decline, optimistic removal); live username search (2-char threshold, 300ms debounce, `search_profiles_by_username_prefix` RPC, browser Supabase client); search results in `grouped-card` with avatar + @username + name + status-aware button; existing friends list in `grouped-card` with wishlist count + birthday subline; `<CreateInviteSection />`: card with 🎁 emoji, "Скопировать" + "Поделиться" pill buttons, invite URL pre-generated on mount, formatted message with sender's first name
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
- Wishlist owner item row (⋯ menu): Удалить only ("Переименовать" removed — title edits directly in the card)
- Reserved gift visibility: owner sees `Gift` icon (lucide-react, size 12) + "Подарит кто-то из друзей" (`text-xs text-gray-500`); reserver name never shown to owner. Friend view: `CircleMarker` `other` state = icon-circle (`bg-gray-100`, `Gift` size 10, `text-gray-400`); `ReservationControls` `other` = icon + "Подарит {name}" or "Зарезервировано"; `mine` = icon + "Зарезервировано вами" (`text-green-700`) + Отменить button.
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

Session 2026-06-05 (continued). All changes deployed to production on `main` (commit `2aed9bc`).

Invite UI redesign (2026-06-05):
- `CreateInviteSection` rewritten: card with 🎁 emoji, title "Приглашение в SimpleWish", subtitle "Готовый текст со ссылкой"
- Two `rounded-full` pill buttons: "Скопировать" + "Поделиться" — always visible simultaneously, never hidden
- Invite URL pre-generated on mount (`useEffect`) — avoids async before clipboard call (Safari `NotAllowedError` fix)
- Share message: `"{firstName} приглашает вас в SimpleWish 🎁\n\n...\n\n{url}"` — fallback name `"Ваш друг"` if profile name empty
- `createInviteAction` now returns `{ inviteUrl, firstName }` — queries `profiles.name` on the authenticated user
- `copyToClipboard`: `navigator.clipboard.writeText` with `textarea + execCommand` fallback for restricted contexts
- `handleShare`: `navigator.share({ text })` if available; falls back to `copyToClipboard`; `AbortError` silently ignored
- Inline feedback: "✓ Приглашение скопировано" for 2s; inline error on failure; no modal

Bottom spacing fix (2026-06-05):
- Layout wrapper `pb-16` → `pb-24` (96px) in `app/(app)/layout.tsx` — fixes last-content-block clipping against fixed bottom nav (74px)
- Pages with `p-4` main (friends, wishlists list): clearance above nav 6px → 38px; pages with `pb-10` main: 30px → 62px

Documentation (2026-06-05):
- `SWIFT_PORTING_NOTES.md` created — iOS porting reference for platform-specific pitfalls, UX invariants, and implementation lessons
- `AI_RULES.md` — `SWIFT_PORTING_NOTES.md Policy` section added defining what belongs and the filter test

Leave invited wishlist (2026-06-05):
- Invited (non-owner) user can leave a `selected_friends` wishlist via "Покинуть вишлист" button at bottom of wishlist detail page
- Button only shown when `!isOwner && wishlist.visibility === 'selected_friends'`
- Uses `leave_wishlist_access(p_wishlist_id uuid)` SECURITY DEFINER RPC — deletes caller's own `wishlist_access` row; guards `auth.uid() IS NOT NULL`
- `leaveWishlistAction` in `features/wishlists/actions.ts` — checks RPC error (returns early on failure), then `revalidatePath('/wishlists')` + `redirect('/wishlists')`
- Migration `20260605000000_leave_wishlist_access.sql` — apply manually + `NOTIFY pgrst, 'reload schema';`
- Same visual pattern as "Архивировать": `mt-6 border-t border-gray-100 pt-4`, `text-sm text-gray-400`

Friend removal (2026-06-05):
- "Удалить из друзей" button at bottom of `/friends/[friendId]` — red text (`text-red-500`), collapses to inline confirmation on tap
- Confirmation: "Удалить друга?" heading + description + "Отмена" (gray) / "Удалить" (red) buttons
- `RemoveFriendSection` client component (`features/friends/remove-friend-section.tsx`) — `useTransition` for pending state; error display if RPC fails
- `removeFriendAction` in `features/friends/actions.ts` — calls `remove_friend` RPC; on success: `revalidatePath('/friends')`, `revalidatePath('/home')`, `redirect('/friends')`
- `remove_friend(p_friend_id uuid)` SECURITY DEFINER RPC — deletes all `wishlist_access` rows between the two users in both directions BEFORE deleting both `friendships` rows; atomic in one transaction
- Migration `20260605000001_remove_friend.sql` — initial RPC (apply manually)
- Migration `20260605000002_remove_friend_cleanup_access.sql` — `CREATE OR REPLACE` adds wishlist_access cleanup (apply manually + `NOTIFY pgrst`)
- After removal: profile RLS (`is_friend()`) immediately blocks access to each other's profile → `/friends/[friendId]` returns 404 for removed friend; redirect handles this
- Orphaned `wishlist_access` rows fully resolved: removal now cleans them up. Re-friending does NOT restore old private wishlist access — owner must explicitly re-share

Previous session: Session 2026-06-05 complete. All changes deployed to production on `main` (commit `67ab839`).

Feed privacy fix (2026-06-05):
- All private/selected_friends wishlist activity removed from Home feed
- `new_wishlist`: DB-level `.eq('visibility', 'all_friends')` filter added
- `new_items`: `visibility` added to nested `wishlists!inner(...)` select; JS filter extended
- `wishlist_item_reserved`: same pattern — `visibility` in nested select + JS filter
- `wishlist_access_granted` event type removed from feed entirely (always `selected_friends` by definition)

Invited wishlist section (2026-06-05):
- Section renamed "Доступные вам" → "Вишлисты по приглашению"; page title "Вишлисты" → "Мои вишлисты"
- Owner name now shown under each invited wishlist card: "от Имя Фамилия"
- Owner profiles fetched via separate `profiles.select('id, name, surname').in('id', ownerIds)` query (NOT via `profiles!inner` on sharedResult — that caused the section to silently disappear)
- Profiles and item-count queries run in parallel via `Promise.all` inside the `sharedWishlists.length > 0` block

Invitation notification / unread dot (2026-06-05):
- `wishlist_access.seen_at timestamptz DEFAULT NULL` column added (migration 20260604000000, applied to DB manually)
- `mark_wishlist_access_seen(p_wishlist_id uuid)` SECURITY DEFINER RPC added — updates only `seen_at`, only for `auth.uid()`, only where `seen_at IS NULL AND auth.uid() IS NOT NULL`; no broad UPDATE RLS policy
- Existing rows backfilled as seen (`COALESCE(created_at, now())`) at migration time to avoid surprise dots
- `wishlist_access_self_select` policy (already present) allows invited users to read their own unseen rows
- Green dot (left of title) on invited wishlist cards in "Вишлисты по приглашению"
- Green dot on bottom nav "Вишлисты" icon when any unseen invited wishlist exists
- `MarkWishlistSeenEffect` client component (`features/wishlists/mark-seen-effect.tsx`) fires `markWishlistSeenAction` in `useEffect` on wishlist detail page mount — replaces the invalid Server Component render call
- `markWishlistSeenAction` calls `revalidatePath('/wishlists')` — legal because triggered from Client Component; causes layout to re-render with fresh `unseenWishlistCount` on return to `/wishlists`
- Layout fetches unseen count via `wishlist_access.select('*', {count:'exact',head:true}).eq('user_id',me).is('seen_at',null)` added to existing `Promise.all`
- `hasUnreadInvitedWishlists` prop added to `BottomNav`; nav dot uses identical pattern to friend-request dot (`absolute bottom-0 right-0`, `ring-1 ring-white`)

Session 2026-06-04 complete. All changes deployed to production on `main`.

Auth guard fix (2026-06-04):
- Added `if (!user) redirect('/login')` to `HomePage`, `WishlistsPage`, `FriendsPage` immediately after `getUser()`
- Root cause: Next.js App Router renders layout and page as concurrent Server Components — the layout's redirect alone does not prevent the page from crashing on null user

Wishlist item editing redesign (2026-06-04):
- Edit card: `rounded-2xl border border-gray-200 bg-gray-50 shadow-sm px-3 py-3`; page padding `px-4 → px-5`
- Title tap-to-edit: first tap opens card; second tap on title enters edit mode (`editingTitle` state); title input gets `border-b border-transparent focus:border-gray-300` cue
- No Save button; autosave on close via parent-signal approach (`requestClose` / `onSaveFailed` props, `closingId` in `OwnerItemList`)
- Card closes only on successful save; stays open with per-field validation errors on failure; errors appear under their corresponding fields
- Outside click and tapping another item both trigger save — "close first, open second on next tap" behavior
- "Переименовать" removed from ⋯ menu; title editing done directly in the card
- Create card unified with edit card: same visual style, same field layout (title + price/link indented `pl-3`), collapses and shows new item on success
- Animation: `transition: max-height 200ms ease-out, opacity 200ms ease-out` (inline style, avoids Tailwind `transition-all` jank)

Reserved gift visibility improvements (2026-06-04):
- Owner view: `Gift` icon (lucide-react, size 12) + "Подарит кто-то из друзей" (reserver never revealed to owner)
- Friend view: `CircleMarker` `other` state = icon-circle (`bg-gray-100`, `Gift` size 10); `ReservationControls` `other` = icon + "Подарит {name}" or "Зарезервировано"; `mine` = icon + "Зарезервировано вами" + Отменить button

Activity feed improvements (2026-06-04):
- Archived/deleted wishlist filtering: `is_archived` added to nested wishlist selects in `new_items`, `reservations`, and `wishlist_access` queries; archived wishlists excluded from all event types
- Reservation activity: `wishlistId` and `wishlistTitle` threaded through — event is now clickable (`/wishlists/{id}`); shows "Кто-то выбрал подарок: {itemTitle}" + "из «{wishlistTitle}»"
- Feed copy restructured: name-first format, shorter labels; `new_wishlist` → "{name} создал вишлист"; `new_items` count=1 → "{name} добавил желание / {title} / в «{wishlist}»"; `new_items` count>1 → "{name} добавил N желаний / в «{wishlist}» / bullet list of titles"
- `new_items` events include `titles: string[]` for bullet rendering; grouping key unchanged (`owner_id + wishlist_id + calendar_day`)

Friend wishlist + item counts (2026-06-04):
- Friends page and Home page friends section now show "N вишлиста · M желаний" subline
- Home: Round 2 wishlist query changed to `select('id, owner_id')`; Round 3 expanded to `Promise.all` (item wishlists + friend item counts in parallel — no new serial hop)
- Friends page: wishlist query extended to `select('id, owner_id')`; item count query added sequentially after
- Item counts: only visible (`is_visible=true`) items in non-archived wishlists; if `itemCount === 0`, item count segment omitted

Remaining work:
1. Remove debug `console.error` in `registerAction` (`features/auth/actions.ts`) — was added during registration debugging, still present
2. Update `app/layout.tsx` metadata: `title: "Create Next App"` → "SimpleWish"
3. Visual pass — friend detail page
4. `<h1>Лента</h1>` uses `text-xl font-semibold` instead of `.section-title` — deferred
5. Migrations `20260605000000`, `20260605000001`, `20260605000002` — must be applied manually in Supabase SQL editor (Docker not available for CLI migration run)

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
| 20260604000000 | Applied to DB manually (not CLI-tracked) | `wishlist_access.seen_at` column + backfill existing rows as seen + `mark_wishlist_access_seen` SECURITY DEFINER RPC |
| 20260605000000 | Apply manually | `leave_wishlist_access(p_wishlist_id uuid)` SECURITY DEFINER RPC — invited user self-removes from wishlist_access |
| 20260605000001 | Apply manually | `remove_friend(p_friend_id uuid)` SECURITY DEFINER RPC — deletes both friendship rows |
| 20260605000002 | Apply manually | `CREATE OR REPLACE remove_friend` — adds wishlist_access cleanup in both directions before deleting friendship rows |

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
- **`wishlist_access_granted` feed event:** REMOVED from feed (2026-06-05). All `wishlist_access` entries are `selected_friends` by definition — showing them in the feed leaks private wishlist names.
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
- **Auth guard pattern:** Every app page that calls `getUser()` must include `if (!user) redirect('/login')` immediately after, before any `user.id` access. The layout's redirect alone is not sufficient — layout and page render concurrently as Server Components, so the page can crash on null user before the layout redirect fires.
- **Wishlist item edit card pattern:** `OwnerItemRow` receives `requestClose: boolean` + `onSaveFailed: () => void` from `OwnerItemList`. When `requestClose` fires, the row saves via `formRef` and calls `onCollapse()` on success or `onSaveFailed()` on failure. Parent uses `closingId` state to signal close without directly setting `expandedId = null`. Outside-click sets `closingId`; tapping another item sets `closingId` on the open item without opening the new one. `formRef` attached to the `<form>` so save can be triggered without a submit event.
- **Wishlist item title editing:** `editingTitle` boolean + `titleValue` string state in `OwnerItemRow`. A `useEffect([isExpanded, item.title])` resets both when card closes. Hidden `<input type="hidden" name="title" value={titleValue} />` always present in the form — server action receives correct title whether editing or not. Title input uses `border-b border-transparent focus:border-gray-300 pb-0.5` for the edit-mode underline cue.
- **Create item card:** `CreateItemSection` uses controlled `title/price/link` state, collapses on success (`collapse()` resets all fields). Container `onBlur` with `relatedTarget` containment check prevents collapse when focus moves between fields within the card.
- **PostgREST schema cache:** after applying functions via SQL editor, run `NOTIFY pgrst, 'reload schema';` to make them immediately available. Without this, RPCs return `PGRST125`.
- **`migration repair --linked` works without Docker.**
- **Docker not available in dev** — `supabase db diff/dump/reset` require Docker.
- **Birthday NULL for most existing users** — registered before birthday field added.
- **Wishlist visibility system:** `wishlists.visibility` is `text NOT NULL DEFAULT 'all_friends'` with CHECK (`all_friends | private | selected_friends`). `wishlist_access` table holds `(wishlist_id, user_id, created_at)` rows only for `selected_friends` wishlists. `can_friend_see_wishlist(caller uuid, wl_id uuid)` SECURITY DEFINER function centralises the access check — called from wishlists/wishlist_items/reservations SELECT and reservations INSERT policies. Unfriending automatically revokes selected_friends access (the function checks `is_friend()` as well as the access table).
- **`wishlist_access` RLS:** `wishlist_access_owner` (FOR ALL) — owner controls the list. `wishlist_access_self_select` (FOR SELECT) — users can read their own access rows. Write is owner-only in both cases.
- **Visibility action idempotency:** `updateWishlistVisibilityAction` does DELETE all `wishlist_access` rows then re-inserts. Re-saved friends get fresh `created_at` on their access rows.
- **`selected_friends` with 0 friends:** `updateWishlistVisibilityAction` converts to `private` server-side. UI label falls back to "Только я" in collapsed state.
- **"Вишлисты по приглашению" query:** queries `wishlists` directly with `visibility = selected_friends AND NOT is_archived AND owner_id != me`. RLS (`can_friend_see_wishlist`) acts as the access gate — no need to query `wishlist_access` directly for this view. Owner profiles fetched separately via `profiles.select('id, name, surname').in('id', ownerIds)` (NOT via `profiles!inner` on sharedResult — the embedded join caused the section to disappear silently due to a PostgREST/RLS interaction).
- **Invited wishlist unread dot:** `wishlist_access.seen_at IS NULL` = unseen. Layout fetches count, passes `hasUnreadInvitedWishlists` to `BottomNav`. Card dot from `unseenAccessResult` in `Promise.all` on wishlists page. `MarkWishlistSeenEffect` client component fires `markWishlistSeenAction` (Server Action) in `useEffect` — required because `revalidatePath` cannot be called during Server Component render. Nav dot clears after `revalidatePath('/wishlists')` causes layout re-render on return to `/wishlists`.
- **`mark_wishlist_access_seen` RPC:** SECURITY DEFINER, no UPDATE RLS policy. WHERE clause: `wishlist_id = p_wishlist_id AND user_id = auth.uid() AND seen_at IS NULL AND auth.uid() IS NOT NULL`. After applying via SQL editor, run `NOTIFY pgrst, 'reload schema';`.
- **Friend removal model:** `remove_friend(p_friend_id uuid)` SECURITY DEFINER RPC deletes (1) all `wishlist_access` rows between the two users in both directions, then (2) both `friendships` rows — in one atomic transaction. No direct DELETE RLS exists on `friendships`; all mutations go through this RPC. After removal, `is_friend()` returns false immediately, blocking profile/wishlist/item/reservation access via RLS.
- **Re-friending does not restore old wishlist_access:** `remove_friend` fully cleans up `wishlist_access` rows. `accept_friend_request`/`accept_invite` only insert `friendships` rows. Owner must explicitly re-share any `selected_friends` wishlist after re-friending.
- **`leave_wishlist_access` RPC:** SECURITY DEFINER, no DELETE RLS for invited users. WHERE clause: `wishlist_id = p_wishlist_id AND user_id = auth.uid()`. Guard: `auth.uid() IS NOT NULL`. After leaving, RLS via `can_friend_see_wishlist()` immediately blocks access.
- **`leaveWishlistAction` error handling:** destructures `{ error }` from `supabase.rpc()`; returns early on error (user stays on page); `redirect('/wishlists')` only fires on success.
- **Friend removal UX placement:** only on `/friends/[friendId]` detail page — not on the friends list page. Reduces accidental removal risk.
- **Invite pre-generation (Safari clipboard fix):** `CreateInviteSection` calls `createInviteAction()` in `useEffect` on mount so the invite URL is ready before the user taps. `copyToClipboard` is then called synchronously within the gesture handler — no `await` between gesture and clipboard. Safari WebKit revokes clipboard permission after any significant async gap. `textarea + execCommand` fallback handles remaining restricted contexts.
- **Bottom nav clearance:** layout wrapper is `pb-24` (96px). Fixed bottom nav is `h-[74px]`. Minimum clearance above nav = page `<main>` bottom padding + 96px − 74px. List pages (`p-4`) get 38px; detail pages (`pb-10`) get 62px. Do not reduce `pb-24` without rechecking all pages.
- **Feed privacy rule:** only `visibility = 'all_friends'` wishlists may generate activity events. `new_wishlist` filtered at DB level. `new_items` and `wishlist_item_reserved` filtered in JS after fetching `visibility` in nested select. `wishlist_access_granted` removed from feed entirely.
- **`revalidatePath` in Server Actions vs Server Components:** `revalidatePath` is only valid in Server Actions triggered by Client Components or Route Handlers — NOT during Server Component render (crashes with "used during render" error in Safari). The friends dot pattern (Client Component → Server Action → `revalidatePath`) is the correct model for invalidating the layout.
- **Wishlist item visibility toggle:** moved from left-column circle button to inline text button ("Спрятать" gray-500 / "Показать" blue-500) always visible in the row, right of title, left of ⋯. Hidden when edit form is expanded or in delete-confirmation state.

---

## Known issues

- Debug `console.error` in `registerAction` (`features/auth/actions.ts`) — remove when convenient
- `app/layout.tsx` metadata: `title: "Create Next App"` — stale, update to "SimpleWish"
- Birthday empty for most existing users (registered before birthday field)
- `<h1>Лента</h1>` uses `text-xl font-semibold` instead of `.section-title` — deferred
- `accept_invite` does not clean up `friend_requests` rows when users mix both friend flows
- `20260530000000` policies may be missing from remote — applied manually before migration tracking; verify via dashboard if visibility behaves incorrectly
