# Project Context

> Read this at the start of every new session before making any plans or edits.

---

## What this project is

**SimpleWish** — private collaborative wishlist + gift coordination PWA.
Users create wishlists, friends reserve items to avoid duplicate gifts.

Stack: Next.js App Router · TypeScript · Tailwind v4 · lucide-react · Supabase (Postgres, Auth, RLS, Storage) · Vercel  
Language: Russian UI · Mobile-first · iOS-native feel · System-preference dark mode (no toggle)  
Production: `https://www.simplewish.es` · Vercel project: `wishlist-app` (max-zavyalov-s-projects)

Scope is strictly controlled. Read `AI_RULES.md` and `MVP_SCOPE.md` before touching anything.

---

## Completed features

- Auth: Supabase email/password, SSR, protected routing
- Friend system: invite → accept flow AND username-based friend requests (both active)
- Wishlists: create, edit, archive/restore, per-wishlist visibility control
- Wishlist items: add, inline edit (title/price/link), reserve, reservation owner visibility
- Birthday collection at registration
- Bottom navigation: icon + label tabs, active state; nav height 74px; icon containers 28×28; SVG icons 23×23; central `+` button 64×64 (blue circle, raised `-mt-[18px]`); profile tab shows avatar photo (28×28 rounded-[8px], blue border ring when active) or initials badge; green dot (bottom-right of Friends icon) when pending incoming requests > 0; no top border; background `#fafafa`; tab icon `strokeWidth="2"` (HomeIcon/UsersIcon/ListIcon), PlusIcon `strokeWidth="2.5"` unchanged; glass: `bg-[#fafafa]/20 dark:bg-[#111111]/20 backdrop-blur-sm`
- Home feed ("Лента"): incoming friend requests section (compact horizontal card: avatar + name/username + green Принять + red Отклонить) rendered above activity stream; activity stream (cap 20, scrollable viewport ~4.5 events) + Друзья · Я подарю sections. "Мои вишлисты" section removed 2026-06-11; own wishlists accessible via Wishlists tab.
- Activity feed events (last 14 days, top 4 by ts, relative timestamps, entities clickable):
  - `birthday_approaching` — friend's birthday 1–14 days away; synthetic ts (today − (daysUntil−1) days) positions by urgency; labels: daysUntil=1 "Завтра", 2–3 "через N дней", 4–7 "через неделю", 8–14 "через 2 недели"
  - `new_friend` — friendship formed
  - `new_wishlist` — friend created an `all_friends` or `family` wishlist (no items added in same window); `family` events show "из вашей семьи" between friend name and verb; only visible to family members
  - `new_wishlist_with_items` — friend created an `all_friends` or `family` wishlist AND added items in the same 14-day window; merged from matching `new_wishlist` + `new_items` events for the same `wishlistId`; replaces both in the feed; same family copy applies
  - `new_items` — friend added visible items to an `all_friends` or `family` wishlist (existing wishlist only); grouped by (owner_id, wishlist_id) across the full window (not per-day); count=1 shows item title, count>1 shows count only; `family` events show "из вашей семьи" between friend name and verb
  - `wishlist_item_reserved` — someone reserved one of the owner's items; random label from 4 variants; two-line format
  - `wishlist_auto_archived` — own wishlist auto-archived by cron
  - Rendered by `FeedList` client component (`app/(app)/home/feed-list.tsx`); no outer card, no inter-row dividers; `.feed-bullet` per row; bottom gradient fade; scrollable when >4 events (measured 4.5-row viewport via `getBoundingClientRect`/`ResizeObserver`/`document.fonts.ready`); capped at 20 events
- Friends page (`/friends`): `section-title` h1; section order: (1) incoming friend requests (accept/decline, optimistic removal), (2) incoming family invitations (accept/decline), (3) Найти друга search, (4) Приглашение по ссылке invite card, (5) FriendsTabSection (Друзья / Семья segmented tabs), (6) Возможно, вы знакомы recommendations. Two-mode friend search: default searches 2nd + 3rd-degree social graph only (`search_social_graph` RPC); "Искать дальше" triggers full profiles search (`search_global` RPC, excludes already-shown IDs); 2-char threshold, 300ms debounce, browser Supabase client; placeholder "Имя или @никнейм"; matches username / name / surname / transliteration in both directions; global results in separate card under "Другие пользователи"; search results in `grouped-card` with avatar + @username + name + status-aware button; `<CreateInviteSection />`: card with 🎁 emoji, "Скопировать" + "Поделиться" pill buttons, invite URL pre-generated on mount, formatted message with sender's first name; `FriendsTabSection` (Друзья / Семья): Друзья tab shows friend list with wishlist count + birthday subline; Семья tab shows current family members with "Убрать" inline confirmation + pending outgoing invitations ("Приглашение отправлено"); Family picker sends invitations, not batch-replace; sent invitations stay visible until accepted/declined
- Friends section (Home): `.grouped-card`, avatar h-10 w-10, name+surname, second line: `N вишлиста • День рождения DD месяц` — count=0 suppressed, birthday omitted if null; `ml-[68px]` divider after avatar
- My Wishlists section (Home): `.grouped-card`, title + item count below, numeric count before `›`, full-width dividers
- Я подарю section (Home): `.grouped-card`, gift title line 1, `Для {ownerName}` line 2, `›`, full-width dividers
- Profile page: compact settings-style layout — no `<form>` wrapper, no Save button. Personal data in `grouped-card` with three rows: **Имя** (label left / full name right; tap → inline `<input>`, Enter/blur saves, Escape cancels, optimistic revert on error; requires both name and surname), **День рождения** (displays as "9 февраля 1985" via `formatBirthdayLong`; tap → masked numeric input DD.MM.YYYY auto-formatting, validates real dates, blank input clears birthday), **Email** (static, with "next version" note). Logout is a `grouped-card` settings row (red text), not a standalone button. Inline-edit follows the same philosophy as wishlist title editing (`storedName`/`storedSurname`/`storedBirthdayIso` canonical state, optimistic update, revert on server error, `useTransition`). Avatar section unchanged (Canvas compression, max 768×768 JPEG 0.85, MIME validation, `h-32 w-32`). Privacy section (friends_list_visibility expand/collapse radio). Security section (password change). Account deletion placeholder.
- Password change: "Безопасность" section, collapsed by default, current-password re-auth, show/hide toggles, min 8 chars
- Registration polish: birthday field auto-formats as `DD.MM.YYYY` on each keystroke (no manual separators needed); password field has a show/hide visibility toggle; iOS Keychain autocomplete attributes set on all auth fields
- Account deletion: "Удалить аккаунт" button at bottom of Profile page (muted gray). Tap → inline danger card (`rounded-2xl`, soft red tint, `bg-red-50/60`/`dark:bg-red-950/20`, `border-red-100`/`dark:border-red-900/30`) with title, irreversibility note, inline list of what's deleted, "Отмена" (secondary) + "Удалить аккаунт" (solid red) buttons. `deleteAccountAction` (SECURITY DEFINER pattern via service role): (1) verifies session, (2) guards missing env vars with user-safe error, (3) removes avatar from Storage (errors ignored), (4) calls `auth.admin.deleteUser(userId)` — cascades all FK-linked rows atomically, (5) `redirect('/login')`. `SUPABASE_SERVICE_ROLE_KEY` required in env (already set for cron). Confirmed via live `pg_catalog` query: all 14 public-schema FKs cascade correctly from `auth.users → profiles → *`; no migration needed.
- App header (`app/(app)/layout.tsx`): avatar `h-16 w-16`, full name on one line, `@username` second line in `text-gray-400`; no bottom border; shown on all app pages. No logout in header — logout is in the Profile page as a `grouped-card` settings row (red text)
- Username system: auto-generated at registration from name+surname transliteration, editable before submit, immutable after creation, shown in profile (read-only) and header
- Wishlist archiving: archive/restore from detail page (bottom of page); invisible to friends; muted "Архив" section at bottom of wishlists page in its own `grouped-card`
- Wishlists page (`/wishlists`): `section-title` h1; active wishlists in `grouped-card` with item counts; visibility indicators on cards; "Доступные вам" section for private wishlists shared with the user via selected_friends access; archive in separate `grouped-card` with muted styling
- Wishlist item visibility: new items default to `is_visible: true`; toggle via "Спрятать" / "Показать" text button always visible in each owner row (right of title, left of ⋯); hidden items rendered in `text-gray-400`; no draft legend
- Wishlist owner item row (⋯ menu): Удалить only ("Переименовать" removed — title edits directly in the card)
- Reserved gift visibility: owner sees `Gift` icon (lucide-react, size 12) + "Подарит кто-то из друзей" (`text-xs text-gray-500`); reserver name never shown to owner. Friend view: `CircleMarker` `other` state = icon-circle (`bg-gray-100`, `Gift` size 10, `text-gray-400`); `ReservationControls` `other` = icon + "Подарит {name}" or "Зарезервировано"; `mine` = icon + "Зарезервировано вами" (`text-green-700`) + Отменить button.
- Wishlist-level visibility: four modes — `all_friends` (default), `family`, `private`, `selected_friends`. Controlled via `WishlistAccessSection` at the bottom of the wishlist detail page (owner only), between item list and archive. Collapsed shows current mode label + "Изменить"; expanded shows radio selector + friend checklist (avatars + initials fallback, `selected_friends` only). If `selected_friends` with 0 friends selected, treated as `private`. `family` visibility uses `family_members` table dynamically via `can_friend_see_wishlist()` — no per-wishlist access rows needed. Friend avatars (h-6 w-6 strip in collapsed, h-7 w-7 in checklist). Create form also offers `family` visibility option alongside `all_friends` and `private`.
- Wishlist card visibility indicators (owner view): `private` → `Lock` icon + "Скрыт от всех"; `selected_friends` → "Виден N другу/друзьям" (pluralRu); `family` → "Виден семье"
- "Доступные вам" section on wishlists page: shows `selected_friends` wishlists shared with the current user; each card is read-only with "🔒 По приглашению" badge; disappears automatically if access revoked or visibility changed
- Branding: SimpleWish logo (`public/brand/simplewish-logo.png`) on login/register; `h-11 mb-9`
- Font: Inter via `next/font/google` (latin + cyrillic); `--font-inter`; Geist Mono for `font-mono`
- Section headers: `.section-title` (1.0625rem / 600 / #111827) on all major headings. "Лента" h1 now uses `.section-title` (migrated 2026-06-13).
- Design system CSS (`app/globals.css`): CSS custom properties for theming — `:root` defines `--background`, `--foreground`, `--card`, `--card-border`, `--card-shadow`, `--text-primary`, `--nav-bg`, `--divider`; `@media (prefers-color-scheme: dark)` overrides all of them. Utility classes: `.section-title`, `.grouped-card` (uses `var(--card)`, `var(--card-border)`, `var(--card-shadow)`), `.feed-bullet`. Three divider classes: `.grouped-card-divider` (feed rows, 90% centered, `var(--divider)`), `.row-divider` (full-width entity rows, `var(--divider)`), `.item-divider` (wish rows in detail card, 90% centered, static `#e5e7eb` light / `#3a3a3c` dark). `font-size: 16px !important` on all inputs/textarea/select (mobile zoom prevention).
- Mobile PWA: viewport export in `app/layout.tsx` sets `maximumScale: 1, userScalable: false`; `bg-[#fafafa]` on both `html` and `body`; `.grouped-card` stays `#ffffff`
- iOS Keychain autocomplete fix: `register-form.tsx` — email field `autoComplete="email username"`, username `autoComplete="nickname"`, password `autoComplete="new-password"`
- Email confirmation: Resend configured as custom SMTP provider in Supabase dashboard (`smtp.resend.com`, port 465, API key as password). Supabase built-in mailer is NOT used.
- Dark mode: system-preference only (`@media (prefers-color-scheme: dark)`, no toggle, no ThemeProvider, no localStorage). All surfaces use CSS custom properties; Tailwind `dark:` classes for one-off values (e.g. `dark:border-[#323234]`, `dark:bg-[#2c2c2e]`). Applied across all app pages, nav, and feature components. Auth pages intentionally excluded.
- Wishlist title inline rename (owner only): tap the wishlist title on the detail page → inline `<input>` replaces the heading; Enter or tap outside → save via `updateWishlistTitleAction`; Escape → cancel and restore original; optimistic update applied immediately so there is no flicker after save; server action not called if the trimmed new value equals the current title; revalidates `/wishlists` and `/home`
- Wishlist expiration settings: `expires_on DATE NULL` column on wishlists; creation form has compact Срок (До даты / Бессрочно `●/○` radio) and Видимость (Все друзья / Только я `●/○` radio) parameters below the title input; past-date ("Дата не может быть в прошлом") and max-year > 2099 ("Слишком оптимистично, укажите реальный срок") validation enforced client- and server-side; `WishlistExpiration` client component (`features/wishlists/wishlist-expiration.tsx`) renders below the wishlist title on the detail page — owner taps to enter edit mode (DD.MM.YYYY masked input, blur/Enter saves, Escape cancels, "или сделать бессрочным" inline right of input clears expiry); cursor positioned at 0 on edit open; first keystroke clears old value and starts fresh; lowercase "бессрочно" throughout; non-owners see "до ДД.ММ.ГГГГ" (hidden when бессрочно)
- Wishlist expiration onboarding: one-time `ExpirationGuideCard` on Home page (between `IncomingRequestsSection` and activity feed); shown when `profiles.wishlist_expiration_guide_completed_at IS NULL AND` user has ≥1 active wishlist without `expires_on`; title "Теперь у вишлистов есть срок"; CTA "Показать, как это работает" links to `/wishlists/[firstWishlistId]?guide=expiration`; × dismiss calls `dismissExpirationGuideAction` (sets timestamp) + optimistic hide via `useState`; detail page with `?guide=expiration` passes `showGuide` to `WishlistExpiration` which renders a blue highlight + "Нажмите на срок, чтобы изменить его" helper text; entering edit mode clears the highlight, calls `dismissExpirationGuideAction`, and `router.replace` strips the param
- Wishlist auto-archive cron: `auto_archived_at TIMESTAMPTZ NULL` column set by cron on auto-archive; `vercel.json` registers Vercel Cron (`0 2 * * *`) pointing at `/api/cron/archive-expired` GET route (guarded by `Authorization: Bearer $CRON_SECRET`, uses `SUPABASE_SERVICE_ROLE_KEY` to bypass user-scoped RLS); archives all wishlists where `expires_on <= CURRENT_DATE AND is_archived = false`; home feed `wishlist_auto_archived` event queries own wishlists with `auto_archived_at IS NOT NULL AND >= sevenDaysAgo`; required Vercel env vars: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- Wishlist detail page owner context: friend's wishlist shows `<p className="mb-0.5 text-sm text-gray-500 dark:text-gray-400">Вишлист · {name} {surname}</p>` above `WishlistTitle`; rendered only when `!isOwner && ownerName`; owner profile (`name, surname`) fetched in `Promise.all` alongside the items query — no extra serial hop; owner path unchanged.
- Wishlist detail UI: wish rows (owner + friend views) wrapped in `.grouped-card` with `.item-divider` between rows and `px-4` per row; `CreateItemSection` rendered as first row inside the grouped-card (with `item-divider` above each wish); expanded create and edit forms both expand inline — no nested card surface; `OwnerItemList` always rendered for owners (no `items.length > 0` guard); hidden item indicator: `EyeOff` (lucide-react, size 16, `text-gray-400 dark:text-gray-500`) as left flex item when `isDraft && !showEditFields`; rows without price use `items-center` alignment; `WishlistAccessSection` wrapped in `.grouped-card px-4 py-4`; archive/restore buttons restyled as full-width `rounded-xl border` secondary buttons.

---

## Current focus

Session 2026-06-13 (continued). Family Groups v1 + avatar shape redesign deployed to production on `main`.

Family Groups v1 + avatar redesign (2026-06-13):
- Family Groups v1: `family_members`, `family_requests`, `family_request_declines` tables + 4 RPCs (see technical decisions section); family visibility mode for wishlists; `IncomingFamilyRequestsSection` on Home + Friends; `FriendsTabSection` redesigned with invitation-based family picker; outgoing invitations shown as pending in Family tab
- Avatar shape redesign: all avatars changed from `rounded-full` circles to proportional rounded squares; 19 replacements across 12 files; radius mapping: 24–28px→8px, 40px→12px, 64px→20px, 128px→40px

Session 2026-06-13 (continued). Account deletion deployed to production on `main`.

Account deletion (2026-06-13):
- `deleteAccountAction` added to `features/profile/actions.ts`: verifies session (anon client), guards missing `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` with user-safe error, removes avatar from Storage (errors ignored), calls `serviceClient.auth.admin.deleteUser(userId)` — FK cascade wipes all DB rows atomically, `redirect('/login')`
- Profile page account deletion section: inline danger card replaces placeholder; idle state shows muted "Удалить аккаунт" button; confirming state expands soft red card (`rounded-2xl border border-red-100 bg-red-50/60`) with copy, "Отмена" secondary button, "Удалить аккаунт" solid red button; `useTransition` for pending state
- FK cascade verified against live production DB via `pg_catalog` query: all 14 public-schema constraints have correct `ON DELETE CASCADE`/`SET NULL`; no migration required

Session 2026-06-13. Polish and bug fixes deployed to production on `main` (commit `9185a0a`).

Polish + fixes (2026-06-13):
- `console.error` debug statements removed from `registerAction` (`features/auth/actions.ts`) — two lines removed (was_username_available error + signUp error)
- App metadata title updated: "Create Next App" → "SimpleWish" (`app/layout.tsx`)
- Home "Лента" h1 migrated to `.section-title` in both State A (empty) and normal feed branches (`app/(app)/home/page.tsx`)
- FeedList scroll bug fixed: `overscroll-contain` removed from the scrollable `<ul>` in `FeedList` (`app/(app)/home/feed-list.tsx`); root cause was iOS Safari routing subsequent touches to the outer `overflow-y-auto overscroll-y-contain` shell after it had been scrolled, causing the inner feed to appear frozen
- Wishlist detail owner context label: friend's wishlist shows "Вишлист · Name Surname" above the title; owner profile fetched in `Promise.all` with items query (`app/(app)/wishlists/[id]/page.tsx`)
- CreateWishlistSection mobile ghost-line artifact fixed: `overflow-hidden` added to both collapsed `<button>` and expanded `<div>` root elements (`features/wishlists/create-wishlist-section.tsx`); cause was iOS Safari GPU compositor retaining painted texture of `.row-divider` elements after React replaced the expanded div with the collapsed button
- App icons: `app/icon.png` + `app/apple-icon.png` added (1254×1254 source); `app/favicon.ico` (default Create Next App placeholder) deleted; Next.js now serves the new icon as favicon and iOS home-screen icon automatically

Session 2026-06-12. Home/feed/nav polish deployed to production on `main`.

Feed + nav polish (2026-06-12):
- `FeedList` client component extracted (`app/(app)/home/feed-list.tsx`): scrollable feed, measured 4.5-row viewport, `ResizeObserver`, `document.fonts.ready` for font timing, bottom gradient fade, cap 20 events
- `new_wishlist_with_items` event type: `new_wishlist` + `new_items` for same `wishlistId` merged into one event; consumed `new_items` excluded from remaining events
- Feed visual: removed `.grouped-card` wrapper, removed inter-row dividers, width adjusted to `mx-3`, `.feed-bullet` reduced 8px → 6px
- Feed typography: non-breaking spaces (` `) in numeric+unit phrases and relative time labels; gender-neutral verbs (`добавил(а)`, `создал(а)`)
- "Мои вишлисты" section removed from Home; "Создать первый вишлист" CTA preserved for users with no wishlists; `itemCountsResult` Round 2 query removed (Round 2 now 6 queries)
- Bottom nav icon `strokeWidth`: 1.75 → 2 for HomeIcon/UsersIcon/ListIcon; PlusIcon remains 2.5
- Header/nav glass tuning: opacity `/40` → `/20`, blur `backdrop-blur-md` → `backdrop-blur-sm`; finding: on near-white backgrounds, `backdrop-blur` visually dominates — changing opacity alone has no perceptible effect; both must be tuned together

Session 2026-06-11. Home UI polish deployed to production on `main`.

Home polish (2026-06-11):
- "Мои вишлисты" section removed from Home; own wishlists remain accessible via Wishlists tab; "Создать первый вишлист" CTA preserved for users with no wishlists
- `itemCountsResult` Round 2 query removed (was exclusively used by removed section); Round 2 is now 6 queries
- Feed typography: `new_wishlist` events render inline (removed `<br />` between verb phrase and title link); timestamp span gets `whitespace-nowrap` to prevent mid-token line breaks across all event types
- `moreItemsLabel()` helper removed from `home/page.tsx` (no longer needed)
- Expiration guide auto-dismiss: `createWishlistAction` in `features/wishlists/actions.ts` now sets `wishlist_expiration_guide_completed_at = now()` when NULL; users who create a wishlist via the new form never see the migration guide

Session 2026-06-11. Phase 1 activity feed improvements deployed to production on `main` (commit `cfbbbaf`).

Phase 1 feed (2026-06-11):
- Birthday approaching events added (1–14 day window; synthetic ts for sort positioning; Russian day/week labels)
- Feed window extended 7 → 14 days for all event types
- `new_items` grouping key changed from `(owner_id, wishlist_id, calendar_day)` to `(owner_id, wishlist_id)` — one event per wishlist per rolling window
- PGRST201 bug fixed on `new_wishlist` and `new_items` queries: ambiguous `profiles!inner` embed removed; owner names resolved via `profileById` Map (built from `friendProfilesResult` in Round 2)
- Dead code removed: `wishlist_access_granted` event type + `AccessGrantedRow` type + `wishlist_access` Round 1 query (feed had excluded these since 2026-06-05)
- Migration `20260613000000_guide_new_user_auto_dismiss.sql`: `handle_new_user` trigger updated to pre-dismiss expiration guide for all new registrations (pending manual apply in SQL editor)
- `lib/format.ts`: `birthdayFeedLabel()` and `newFriendCountLabel()` helpers added

Session 2026-06-12. Wishlist expiration onboarding + Home empty-state CTA fix deployed to production on `main`.

Expiration onboarding (2026-06-12):
- Migration `20260612000000`: `profiles.wishlist_expiration_guide_completed_at TIMESTAMPTZ NULL` — apply in SQL editor
- `dismissExpirationGuideAction` added to `features/profile/actions.ts` — sets timestamp, revalidates `/home`
- `ExpirationGuideCard` (`features/wishlists/expiration-guide-card.tsx`) — Client Component, optimistic dismiss via `useState` + `useTransition`, links to `/wishlists/[id]?guide=expiration`; shown on Home between `IncomingRequestsSection` and activity feed
- `WishlistExpiration` extended: `showGuide` prop; `guideActive` state; blue `bg-blue-50 rounded-lg` highlight + "Нажмите на срок, чтобы изменить его" hint text; `enterEdit()` dismisses guide + `router.replace` strips param; `gap-x-2` → `gap-x-1.5` in edit mode
- Home page: `expires_on` added to wishlists query + `Wishlist` type; profile flags query added to Round 1; guide conditions computed after Round 1
- Detail page: `guide?: string` added to searchParams; `showGuide={isOwner && guide === 'expiration'}` passed to `WishlistExpiration`

Home empty-state CTA fix (2026-06-12):
- `CreateWishlistTrigger` (`features/wishlists/create-wishlist-trigger.tsx`) — thin Client Component wrapper around `<Link>` that sets `sessionStorage('wishlist-create-pending', '1')` synchronously in `onClick`; used in place of plain `<Link>` in Home State A and State C empty states
- `CreateWishlistSection` extended: `usePathname` + `useEffect([pathname])` as second expansion trigger covering App Router cache reuse (component not remounted); `expandPendingRef` ref-backed helper to deduplicate mount + pathname logic; `suppressCollapseUntilRef` 450ms timestamp guard in `onPointerDown` prevents iOS Safari ghost tap from collapsing the freshly expanded card

Session 2026-06-11. Wishlist expiration + auto-archive flow deployed to production on `main`.

Wishlist expiration (2026-06-11):
- `wishlists.expires_on DATE NULL` + `wishlists.auto_archived_at TIMESTAMPTZ NULL` columns — migration `20260611000000` must be applied manually in SQL editor
- Creation form: Срок (До даты / Бессрочно) + Видимость (Все друзья / Только я) compact `●/○` radio options; DD.MM.YYYY masked date input; past-date + max-year > 2099 validation both client and server; `create-wishlist-section.tsx` and `actions.ts` extended
- Detail page: `WishlistExpiration` component below title; tap → inline masked edit; "или сделать бессрочным" inline right; cursor at 0 on open; first keystroke clears old value; `updateWishlistExpirationAction` server action
- Cron: `vercel.json` adds `0 2 * * *`; `/api/cron/archive-expired` uses `SUPABASE_SERVICE_ROLE_KEY`; guarded by `CRON_SECRET`
- Home feed: `wishlist_auto_archived` event type added (own wishlists auto-archived in last 7 days)
- Plus button: removed `?create=1` URL param + `searchParams` from `/wishlists/page.tsx`; cross-route tap sets `sessionStorage('wishlist-create-pending')` synchronously; `CreateWishlistSection` `useLayoutEffect` on mount reads + clears flag, expands, and RAF-focuses title input; on-page dispatch (`wishlist-create-focus`) unchanged

Session 2026-06-11. Social discovery polish + glass navigation deployed to production on `main`.

Visual polish (2026-06-11):
- Recommendation dismiss button softened: `opacity-75` added to `bg-red-500` button in `RecommendationsSection` — keeps red signal, reduces visual intensity
- Glass header: `app/(app)/layout.tsx` header changed from opaque `bg-white` to `bg-white/20 dark:bg-[#1c1c1e]/20 backdrop-blur-sm`; positioned `absolute top-0 left-0 right-0 z-10` (overlays scrollable content) — later tuned from `/40 backdrop-blur-md` to `/20 backdrop-blur-sm` (2026-06-12)
- Glass bottom nav: `app/(app)/bottom-nav.tsx` nav changed from opaque `bg-[#fafafa]` to `bg-[#fafafa]/20 dark:bg-[#111111]/20 backdrop-blur-sm`; positioned `absolute bottom-0 left-0 right-0 z-10` — later tuned from `/40 backdrop-blur-md` (2026-06-12)
- Shell layout: outer wrapper `fixed inset-0 flex flex-col` → `fixed inset-0`; content div `flex-1 overflow-y-auto overscroll-y-contain` → `absolute inset-0 overflow-y-auto overscroll-y-contain pt-[88px] app-scroll-content`
- `.app-scroll-content` utility added to `app/globals.css`: `padding-bottom: calc(74px + env(safe-area-inset-bottom))` — ensures last content item clears the overlaying nav on all devices including notch iPhones
- Content now scrolls underneath translucent header and bottom nav, producing a real frosted-glass effect on iOS Safari/PWA (tested on device)

Session 2026-06-10 (Phase 3). Friend recommendations and social discovery deployed to production on `main`.

Friend recommendations (Phase 3, 2026-06-10):
- `friend_recommendation_dismissals (user_id, dismissed_user_id)` table: composite PK, CASCADE FKs, RLS own-rows
- `get_friend_recommendations(p_limit int DEFAULT 20)` SECURITY DEFINER STABLE RPC: 2nd-degree FOF graph, excludes existing friends/self/pending outgoing/dismissed; ranks by mutual_count → visible wishlist count → visible item count → username; returns `(id, name, surname, avatar_url, username, mutual_count)`
- `RecommendationsSection` client component (`features/friends/recommendations-section.tsx`): optimistic `outgoingIds`/`dismissedIds`/`acceptedIds` Sets, `useTransition`; card row: avatar + name/@username/N общих друга + `[ Добавить | Принять | Запрос отправлен ]` + inline red `bg-red-500` X dismiss button (hidden once request sent, accepted removes row entirely)
- `dismissRecommendationAction` in `features/friends/actions.ts`: silently ignores `23505` unique-violation
- Home page conditional swap: if recommendations exist → show "Возможно, вы знакомы" (slice 0-3) + "Все рекомендации ›" link to /friends; else → existing Друзья block unchanged
- Friends page order: IncomingRequests → Search → Invite → Recommendations ("Возможно, вы знакомы", up to 8) → "Мои друзья"
- Invite card: title/subtitle removed; action text buttons replaced with icon-only Copy/Share2 (lucide-react, `p-2 rounded-lg`)
- Migration `20260610000002` must be applied manually in SQL editor + `NOTIFY pgrst, 'reload schema';`

Session 2026-06-10. Profile compact redesign + friends list privacy deployed to production on `main`.

Profile compact redesign (2026-06-10):
- Personal data section replaced with compact settings rows (label | value horizontal layout)
- Name + surname merged into a single "Имя" row (inline-edit: tap → full name input, split on save)
- Birthday inline-edit with DD.MM.YYYY auto-masking; displays as "9 февраля 1985" (`formatBirthdayLong`)
- Save button removed — each row saves on blur/Enter, cancels on Escape, reverts optimistically on error
- Logout converted from full-width standalone button to `grouped-card` settings row (red text)
- `lib/format.ts`: added `MONTHS_RU` constant + `formatBirthdayLong(isoDate)`

Friends list privacy (same deploy, earlier in session):
- `profiles.friends_list_visibility text NOT NULL DEFAULT 'friends'` column (migration `20260610000001`)
- `get_mutual_friends(p_friend_id uuid)` + `get_friends_of_friend(p_friend_id uuid)` SECURITY DEFINER RPCs
- `/friends/[friendId]` page rewritten: friendship guard, mutual friends section (navigable, no action buttons), "Другие друзья / Друзья {Name}" interactive section (`FriendPeopleSection` client component)
- Privacy toggle on Profile page: "Приватность" section, expand/collapse `●/○` radio pattern, `updateFriendsListVisibilityAction`
- `get_mutual_friend_counts(p_user_ids uuid[])` RPC added to Home and Friends pages (Round 2 parallel)
- Birthday always rendered as a separate third line (not appended to metadata line)

---

Session 2026-06-06. All changes deployed to production on `main` (commit `68f4560`).

Friend search overhaul (2026-06-06):
- Two-mode search: default = 2nd + 3rd-degree social graph only (`search_social_graph` RPC, CTE-based friendship walk, SECURITY DEFINER STABLE, LIMIT 15); "Искать дальше" triggers full profiles scan (`search_global` RPC, SECURITY DEFINER STABLE, LIMIT 20, excludes already-shown IDs via `p_exclude_ids uuid[]`)
- Match fields: username, name, surname — bidirectional; ranking: degree first (2nd before 3rd), then exact username → prefix → name/surname prefix → transliteration → alphabetical
- Bidirectional transliteration: Latin query → `transliterate_ru(p.name/surname) LIKE lower(p_prefix)||'%'`; Cyrillic query → `p.username/name/surname LIKE transliterate_ru(lower(p_prefix))||'%'` (computed once per call)
- `transliterate_ru()` rewritten: plpgsql IMMUTABLE, replace()-based (щ→shch, х→kh, ё→e, etc.); replaces broken translate()-based implementation (fix 1: off-by-one; fix 2: complete rewrite; fix 3: query transliteration)
- Placeholder updated: `@никнейм` → `Имя или @никнейм`; extended mode + results reset on every query change
- `20260604000000`, `20260605000000–002` marked as applied via `supabase migration repair --linked`; `20260606000000–003` applied via `supabase db push`

Session 2026-06-05 (continued, part 2). All changes deployed to production on `main`.

Dark mode + wishlist detail UI polish + auto-save optimization:
- Dark mode: CSS custom properties (`--background`, `--foreground`, `--card`, `--card-border`, `--card-shadow`, `--text-primary`, `--nav-bg`, `--divider`) in `globals.css`; `@media (prefers-color-scheme: dark)` overrides; applied across all 15 app files
- Three divider classes in `globals.css`: `.grouped-card-divider` (feed, 90% centered), `.row-divider` (full-width entity rows), `.item-divider` (wish rows, 90% centered, static color values)
- Wishlist detail wish rows wrapped in `.grouped-card`; `CreateItemSection` moved inside the card as first row; both create and edit forms expand inline (no nested card)
- Hidden item indicator: `EyeOff` (lucide-react, size 16) in owner item row when `isDraft && !showEditFields`
- Vertical alignment: `items-center` on collapsed wish rows (owner + friend views) so title-only items center within row height; `items-start` preserved in edit state only
- `WishlistAccessSection`: both collapsed and expanded states wrapped in `.grouped-card px-4 py-4`
- Archive/restore: `border-t` separator removed; full-width `rounded-xl border` secondary button style
- Auto-save dirty check in `OwnerItemRow.doSave()`: skips `updateWishlistItemAction` and calls `onCollapse()` directly when title/price/link are all unchanged

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
5. ~~Migrations applied manually~~ — resolved: all migrations now CLI-tracked via `migration repair --linked`

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
| 20260604000000 | Applied | `wishlist_access.seen_at` column + backfill existing rows as seen + `mark_wishlist_access_seen` SECURITY DEFINER RPC |
| 20260605000000 | Applied | `leave_wishlist_access(p_wishlist_id uuid)` SECURITY DEFINER RPC — invited user self-removes from wishlist_access |
| 20260605000001 | Applied | `remove_friend(p_friend_id uuid)` SECURITY DEFINER RPC — deletes both friendship rows |
| 20260605000002 | Applied | `CREATE OR REPLACE remove_friend` — adds wishlist_access cleanup in both directions before deleting friendship rows |
| 20260606000000 | Applied | `search_social_graph` + `search_global` RPCs — social-graph-aware two-mode friend search |
| 20260606000001 | Applied | Fix `transliterate_ru` off-by-one in translate() TO string |
| 20260606000002 | Applied | Rewrite `transliterate_ru` as plpgsql IMMUTABLE with replace()-based multi-char output |
| 20260606000003 | Applied | Add Cyrillic-query → Latin-field matching to both search RPCs (query transliteration) |
| 20260610000000 | Applied | `get_mutual_friend_counts(p_user_ids uuid[])` batch RPC — returns mutual friend counts for friends list and search results |
| 20260610000001 | Applied | `profiles.friends_list_visibility` column + `get_mutual_friends` + `get_friends_of_friend` SECURITY DEFINER RPCs |
| 20260610000002 | Applied | `friend_recommendation_dismissals` table + `get_friend_recommendations(p_limit int)` SECURITY DEFINER RPC |
| 20260611000000 | Pending (manual) | `wishlists.expires_on DATE NULL` + `wishlists.auto_archived_at TIMESTAMPTZ NULL` — run in SQL editor: `ALTER TABLE wishlists ADD COLUMN expires_on DATE NULL; ALTER TABLE wishlists ADD COLUMN auto_archived_at TIMESTAMPTZ NULL;` then `NOTIFY pgrst, 'reload schema';` |
| 20260612000000 | Pending (manual) | `profiles.wishlist_expiration_guide_completed_at TIMESTAMPTZ NULL` — run in SQL editor: `ALTER TABLE profiles ADD COLUMN wishlist_expiration_guide_completed_at TIMESTAMPTZ NULL;` |
| 20260613000000 | Pending (manual) | `handle_new_user` trigger updated: pre-dismisses `wishlist_expiration_guide_completed_at` for all new registrations — run in SQL editor (no backfill; no `NOTIFY pgrst` needed) |
| 20260613000001 | Applied | `family_members` table (directional rows, composite PK, CASCADE FKs, RLS own-rows) + `update_family_members(p_ids uuid[])` SECURITY DEFINER RPC |
| 20260613000002 | Applied | `family` visibility mode: `wishlists.visibility` CHECK updated; `can_friend_see_wishlist()` updated to check `family_members`; `wishlist_access_section.tsx` + `wishlist-card.tsx` + `create-wishlist-section.tsx` updated |
| 20260613000003 | Applied | `family_requests` + `family_request_declines` tables + RLS; 4 RPCs: `send_family_request`, `accept_family_request`, `decline_family_request`, `remove_family_member`; `profiles_select_incoming_family_request_sender` RLS policy; `remove_friend` updated to clean family state |

---

## Important technical decisions

- **App shell architecture:** `app/(app)/layout.tsx` renders `<div className="fixed inset-0">` — fixes iOS Safari viewport bugs where document-level scroll caused the header and bottom nav to detach during rubber-band overscroll. Structure: header `absolute top-0 left-0 right-0 z-10` overlays content, content area `absolute inset-0 overflow-y-auto overscroll-y-contain pt-[88px] app-scroll-content` (only this div scrolls), `<BottomNav>` `absolute bottom-0 left-0 right-0 z-10` overlays content. Header and nav use `bg-*/20 backdrop-blur-sm` for a glass effect — content scrolls visibly underneath them. Important: on near-white (`#fafafa`) backgrounds `backdrop-blur` dominates visually; changing background-color opacity alone has no perceptible effect — tune both blur strength and opacity together. Gradient overlays inside/adjacent to `<BottomNav>` risk visual artifacts above the `+` button due to absolute-positioning layer conflicts. Supporting rules: `html, body { overscroll-behavior: none }` in `globals.css`; `viewportFit: "cover"` in root layout viewport export; `pb-[env(safe-area-inset-bottom)]` on nav; `.app-scroll-content` provides `padding-bottom: calc(74px + env(safe-area-inset-bottom))`. Do not revert to document-level scrolling without approval. Do not revert to flex-col stacking without approval.
- **Wishlist title inline rename:** `WishlistTitle` client component (`features/wishlists/wishlist-title.tsx`). State: `isEditing` boolean + `displayedTitle` string for optimistic display. Tap title → `isEditing = true`, title replaced with `<input autoFocus>`; Enter or `onBlur` → call `updateWishlistTitleAction`, set `displayedTitle` immediately (optimistic), revert on error; Escape → cancel, restore original. Server action not called if trimmed new value equals current title. Revalidates `/wishlists` and `/home` on save.
- **Tailwind v4 blue bug:** `bg-blue-500` does not render. Use `bg-[#3b82f6]`. `text-blue-500` works fine.
- **Tailwind v4 arbitrary class reliability:** Multi-value shadows and some dimension utilities unreliable in dev. Prefer named CSS classes in `app/globals.css`.
- **`bg-[#3b82f6]` dev-server issue:** Only in `bottom-nav.tsx`. Can drop between hot-reloads. Restart dev or `rm -rf .next`. Do not fix in code.
- **Avatar shape pattern:** avatars are rounded squares (not circles). `overflow-hidden rounded-[Xpx]` on wrapper + explicit `h-* w-*`; `h-full w-full object-cover` on `<img>`. Never put a radius class on `<img>` directly. Radius ≈ 30% of avatar size: 24–28px → `rounded-[8px]`, 40px → `rounded-xl`, 64px → `rounded-[20px]`, 128px → `rounded-[40px]`. Green notification dots, segmented control pills, and the blue FAB remain `rounded-full` — do not change them.
- **Storage path:** `avatars/{userId}/avatar.jpg`.
- **Avatars bucket is public** — `getPublicUrl()` + `?v=timestamp`. Privacy via profiles RLS.
- **Avatar compression:** client-side Canvas API in `profile-form.tsx`. Validates MIME (JPEG/PNG/WebP), rejects >6 MB, resizes to max 768px, encodes as JPEG at 0.85 quality before upload.
- **Avatar removal:** `removeAvatarAction()` in `features/profile/actions.ts`. Deletes storage file, ignores "not found" errors, sets `avatar_url = null`, revalidates `/profile` and `/home`.
- **Safari input zoom fix:** `export const viewport = { maximumScale: 1, userScalable: false }` in `app/layout.tsx`. This is the actual fix. The `font-size: 16px !important` rule in `globals.css` is belt-and-suspenders backup.
- **Password change uses re-auth** — `signInWithPassword` server-side before `updateUser`.
- **Username is immutable after registration.** CHECK: `^[a-z][a-z0-9_]{1,28}[a-z0-9]$`, no `__`. Min 3 chars.
- **Username auto-generation:** `generate_username(name, surname)` DB function. Mirrored in `register-form.tsx` (`buildUsernamePreview`) — keep in sync.
- **Activity feed grouping:** `new_items` group by `(owner_id, wishlist_id)` in JS — one event per wishlist across the full 14-day rolling window (not per calendar day).
- **Activity feed event types:** `birthday_approaching`, `new_friend`, `new_wishlist`, `new_wishlist_with_items`, `new_items`, `wishlist_item_reserved`, `wishlist_auto_archived`. All computed at query time from existing tables — no events table. `new_wishlist_with_items` is a client-side merge: for each `new_wishlist` event, if a `new_items` event exists for the same `wishlistId`, both are collapsed into one `new_wishlist_with_items` event (consumed `new_items` removed from remaining events). `wishlist_auto_archived` queries the current user's own wishlists where `auto_archived_at IS NOT NULL AND >= fourteenDaysAgo`. `wishlist_access_granted` was removed from the feed on 2026-06-05 (leaks private wishlist names).
- **`wishlist_item_reserved` label:** deterministic from reservation UUID char-code sum mod 4 — same event always shows same text across renders.
- **`wishlist_access_granted` feed event:** REMOVED from feed (2026-06-05). All `wishlist_access` entries are `selected_friends` by definition — showing them in the feed leaks private wishlist names.
- **Font loading:** `next/font/google`, Inter, `['latin', 'cyrillic']`, `--font-inter`, `display: 'swap'`.
- **Item count pattern:** Separate query `select('wishlist_id').in(...)` → `Map<string, number>`. Duplicated across pages; refactor deferred.
- **Shared formatting helpers (`lib/format.ts`):** `pluralRu`, `getDaysUntilBirthday`, `friendBirthdayLine`, `formatBirthdayLong` (ISO date → "9 февраля 1985"; used in profile display), `birthdayFeedLabel(daysUntil)` (feed label for upcoming birthdays), `newFriendCountLabel(n)` (Russian genitive count phrase for friend events). Do not redefine locally.
- **Divider system (three CSS classes):** `.grouped-card-divider` — feed rows, 90% centered, `var(--divider)`. `.row-divider` — full-width entity rows (friends list, search results, wishlists/"Я подарю"), `var(--divider)`. `.item-divider` — wish rows inside wishlist detail grouped-card, 90% centered, static `#e5e7eb` light / `#3a3a3c` dark (not CSS-var to preserve distinct visual weight from feed dividers).
- **Friend search architecture:** `SearchSection` client component uses `getSupabaseBrowserClient()` for live RPC calls. Mutations via server actions + `revalidatePath('/friends')`. State classification derived from server props; updated optimistically. Two search modes: (1) default — `search_social_graph(p_prefix)` walks the friendship graph (2nd + 3rd degree, CTE-based, SECURITY DEFINER STABLE, LIMIT 15), called automatically after 300ms debounce; (2) extended — `search_global(p_prefix, p_exclude_ids uuid[])` scans all profiles, called only after user taps "Искать дальше" (LIMIT 20). Extended mode and results reset on every query change. Both RPCs match username, name, surname in both directions: `transliterate_ru(p.name/surname) LIKE lower(p_prefix)||'%'` (Latin query → Cyrillic field) and `p.username/name/surname LIKE transliterate_ru(lower(p_prefix))||'%'` (Cyrillic query → Latin field). Transliterated query computed once per call as CTE / inline subquery. `transliterate_ru()` is plpgsql IMMUTABLE, replace()-based.
- **Search status derivation:** `effectiveStatus = query.length < 2 ? 'idle' : status` — derived in render, avoids `react-hooks/set-state-in-effect` lint error.
- **`friendships` RLS:** `USING (user_id = auth.uid())` — only current user's rows returned.
- **`accept_invite` gap:** does not clean up `friend_requests` when users connect via invite link. Cleanup SQL: `DELETE FROM friend_requests fr WHERE EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = fr.from_user_id AND f.friend_id = fr.to_user_id)`.
- **`profiles_select_incoming_request_sender` RLS bug (fixed 2026-06-03):** policy originally used `fr.from_user_id = fr.id` instead of `fr.from_user_id = profiles.id`. Fixed on production.
- **Bottom nav sizing system:** nav `h-[74px]`, `iconBox` `h-7 w-7` (28px), SVG icons `h-[23px] w-[23px]` (23px), `PlusIcon` `h-7 w-7` (28px), central button `h-16 w-16` (64px), raise `-mt-[18px]`. Profile avatar wrapper must match `iconBox` (`h-7 w-7`).
- **App background:** CSS custom property `--background` (`#fafafa` light / `#111111` dark). `.grouped-card` uses `var(--card)` (`#ffffff` light / `#1c1c1e` dark). Auth pages intentionally have no dark mode — hardcoded light colors throughout.
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
- **Family Groups v1 (2026-06-13):** `family_members` (directional rows, mutual = both directions present), `family_requests` (delete-on-resolve semantics, no status column), `family_request_declines` (sender reads own rows). RPCs: `send_family_request`, `accept_family_request` (SECURITY DEFINER, inserts both directions atomically), `decline_family_request`, `remove_family_member` (SECURITY DEFINER, deletes both directions). `remove_friend` updated to also clean `family_requests` + `family_request_declines` both directions. `family` visibility mode: `can_friend_see_wishlist()` checks `family_members` dynamically — no `wishlist_access` rows needed. Feed includes `family` wishlist events only for family members; copy: "из вашей семьи" between friend name and verb. `IncomingFamilyRequestsSection` shown on Home + Friends pages. Family invitations initiated ONLY from Family tab picker — not from per-row buttons in the friends list.
- **Avatar shape (2026-06-13):** Avatars changed from circles to proportional rounded squares. Radius ≈ 30% of avatar size. Mapping: 24–28px → `rounded-[8px]`, 40px → `rounded-xl` (12px, reference), 64px → `rounded-[20px]`, 128px → `rounded-[40px]`. Pattern: `overflow-hidden rounded-[Xpx]` on wrapper + `h-full w-full object-cover` on `<img>`. Never put a border-radius class on `<img>` directly. Notification dots, segmented control pills, and the blue FAB remain `rounded-full`.
- **Invite pre-generation (Safari clipboard fix):** `CreateInviteSection` calls `createInviteAction()` in `useEffect` on mount so the invite URL is ready before the user taps. `copyToClipboard` is then called synchronously within the gesture handler — no `await` between gesture and clipboard. Safari WebKit revokes clipboard permission after any significant async gap. `textarea + execCommand` fallback handles remaining restricted contexts.
- **Bottom nav clearance:** layout wrapper is `pb-24` (96px). Fixed bottom nav is `h-[74px]`. Minimum clearance above nav = page `<main>` bottom padding + 96px − 74px. List pages (`p-4`) get 38px; detail pages (`pb-10`) get 62px. Do not reduce `pb-24` without rechecking all pages.
- **Feed privacy rule:** only `all_friends` and `family` wishlists generate activity events (`new_wishlist`, `new_wishlist_with_items`, `new_items`). `new_wishlist` filtered at DB level via `.in('visibility', ['all_friends', 'family'])`. `new_items` and `wishlist_item_reserved` filtered in JS after fetching `visibility` in nested select. `wishlist_access_granted` removed from feed entirely. `family` events include `fromFamily: true` flag; `FeedList` renders "из вашей семьи" between friend name and verb for these events. RLS on `family_members` ensures `family` wishlist rows are only visible to actual family members at the DB level.
- **`revalidatePath` in Server Actions vs Server Components:** `revalidatePath` is only valid in Server Actions triggered by Client Components or Route Handlers — NOT during Server Component render (crashes with "used during render" error in Safari). The friends dot pattern (Client Component → Server Action → `revalidatePath`) is the correct model for invalidating the layout.
- **Wishlist item visibility toggle:** moved from left-column circle button to inline text button ("Спрятать" gray-500 / "Показать" blue-500) always visible in the row, right of title, left of ⋯. Hidden when edit form is expanded or in delete-confirmation state.
- **Wishlist item auto-save dirty check:** `doSave()` in `OwnerItemRow` compares `titleValue` vs `item.title`, `formData.get('price')` vs `item.price !== null ? String(item.price) : ''`, and `formData.get('link')` vs `item.link ?? ''` before calling `updateWishlistItemAction`. If all three match, `onCollapse()` is called directly and the function returns — no action invoked, no DB write, no `revalidatePath`. Applies on both manual outside-clicks and the `requestClose` signal.
- **Friend recommendations graph:** `get_friend_recommendations` is a SECURITY DEFINER STABLE function that bypasses RLS to traverse all `friendships` rows. It finds 2nd-degree friends-of-friends only (NOT 3rd degree, NOT global fallback). `friends_list_visibility` is intentionally ignored for graph traversal — it is a display-only flag. Rankings: mutual_count DESC → visible_wishlist_count DESC → visible_item_count DESC → username ASC. Wishlist/item counts computed inside the RPC for ranking only, not returned.
- **`friend_recommendation_dismissals` pattern:** `(user_id, dismissed_user_id)` composite PK prevents duplicate rows. `dismissRecommendationAction` silently ignores PostgreSQL error `23505` (unique_violation) so double-calls are safe. After insert, revalidates `/friends` and `/home` to clear server-side recommendations on next load.
- **Recommendation dismiss UX:** inline red `bg-red-500` square button to the right of the primary action button (same height, `px-2 py-1.5`); hidden once request is sent (`!isOutgoing` guard). Accepted users disappear entirely from visible list via `acceptedIds` Set.
- **Home page conditional swap:** if `get_friend_recommendations` returns > 0 rows → render `RecommendationsSection` (slice 0-3) under "Возможно, вы знакомы" heading with "Все рекомендации ›" link to `/friends`; else → render existing Друзья block unchanged. The two branches share no code — no fallback prop threading.
- **Dark mode approach:** `@media (prefers-color-scheme: dark)` only — no ThemeProvider, no toggle, no `class="dark"`, no localStorage. All primary surface values use CSS custom properties. Tailwind `dark:` utility classes for one-off values. Auth pages intentionally excluded from dark mode styling.

- **Wishlist expiration fields:** `wishlists.expires_on DATE NULL` (owner-set deadline; `NULL` = бессрочно) + `wishlists.auto_archived_at TIMESTAMPTZ NULL` (set by cron only; never by UI). Display format `DD.MM.YYYY` ↔ DB ISO `YYYY-MM-DD`; converted in `isoToDisplay()` and in server actions. Validation: past date rejected, year > 2099 rejected, today allowed. Both fields added by migration `20260611000000` (manual apply required).
- **Cron route (`/api/cron/archive-expired`):** GET handler. Validates `Authorization: Bearer $CRON_SECRET` header. Uses Supabase client initialised with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Updates `is_archived = true, auto_archived_at = now()` for all rows where `expires_on <= CURRENT_DATE AND is_archived = false`. Registered in `vercel.json` at schedule `0 2 * * *`. Required Vercel env vars: `CRON_SECRET` (any secret string) and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase project → Settings → API). Without these vars the cron silently skips or returns 401.
- **Plus button create card focus:** from non-/wishlists routes: click handler sets `sessionStorage.setItem('wishlist-create-pending', '1')` synchronously within the user gesture, then navigation to `/wishlists` proceeds normally. `CreateWishlistSection.useLayoutEffect` (fires before paint) on mount reads + removes the flag, calls `setExpanded(true)` (triggers synchronous re-render with `autoFocus` input), then RAF-focuses `titleInputRef`. From /wishlists: `e.preventDefault()` + `window.dispatchEvent(new Event('wishlist-create-focus'))` as before. The `?create=1` query-param mechanism and `await searchParams` in `/wishlists/page.tsx` were removed — page no longer has a searchParams dynamic signal, improving prefetch eligibility. iOS keyboard after cross-route navigation is best-effort.
- **`WishlistExpiration` inline edit patterns:** `startFreshRef = useRef(false)` set true on edit start; first `onChange` event discards all existing digits and uses only the first raw digit from `e.target.value` (cursor was at position 0, so this is the typed char); subsequent calls use normal 8-digit extraction + dot-insertion mask. Cursor reset via `requestAnimationFrame(() => input.setSelectionRange(0, 0))` — not `.select()`. `timelessRef` on the "бессрочным" button enables `relatedTarget` check in `onBlur` (skips premature save on mobile); `onMouseDown e.preventDefault()` on the same button prevents input blur on desktop.
- **One-time feature guide pattern (profiles column):** per-feature `TIMESTAMPTZ NULL` column on `profiles` — NULL = guide eligible, NOT NULL = dismissed/completed (timestamp records when). Server Action `dismissXxxGuideAction()` writes `now()` + revalidates the page. Client component uses `useState(true)` for optimistic hide + `useTransition` for background server write. Never show the guide again once dismissed, even on re-login. Applied to: `wishlist_expiration_guide_completed_at`.
- **`showGuide` prop pattern for detail-page highlights:** Server Component reads `guide` from `searchParams`, passes `showGuide={isOwner && guide === '...'}` to Client Component. Client component holds `guideActive` state initialised from prop. On entering edit mode: `setGuideActive(false)`, call dismiss action in `startTransition`, `router.replace(`/wishlists/${id}`)` strips param from URL (no history entry). This keeps the guide dismiss atomic with the edit entry — the user never sees the highlight again after tapping it.
- **`CreateWishlistTrigger` component:** thin `'use client'` wrapper around `<Link>` (`features/wishlists/create-wishlist-trigger.tsx`) that sets `sessionStorage('wishlist-create-pending', '1')` synchronously in `onClick` before navigation. Used on the Home page empty-state cards (State A and State C) to reuse the exact same creation flow as the blue `+` button — no second creation flow, no new navigation logic. Server Components that previously used `<Link href="/wishlists">` must use `<CreateWishlistTrigger>` when the intent is to open the create card.
- **App Router cache reuse — `usePathname` secondary expansion trigger:** `CreateWishlistSection` cannot rely solely on `useLayoutEffect([])` (mount-only) because Next.js App Router may reuse a cached component instance without remounting when navigating back to the same route. The `useEffect([pathname])` secondary effect re-runs `expandPendingRef.current()` whenever `pathname` changes to `/wishlists`, catching the cache-reuse case. Both effects are deduplicated: the helper checks `sessionStorage.getItem` and returns early if the flag is absent.
- **`CreateWishlistSection` overflow-hidden — iOS compositor artifact fix:** both the collapsed `<button>` and expanded `<div>` root elements carry `overflow-hidden`. Without it, after an expand→collapse cycle, iOS Safari's GPU compositor retains the old painted texture (which includes the two `.row-divider` lines) and shows ghost horizontal lines below the smaller collapsed card. `overflow-hidden` forces the compositor to clip and fully repaint the layer texture on every size change. `box-shadow` is unaffected (renders outside border-box). Desktop browsers do not exhibit this because they use CPU rasterization for these elements rather than aggressive GPU layer promotion.
- **`suppressCollapseUntilRef` — iOS Safari ghost tap guard:** after programmatic card expansion (via the pending-create flag), iOS Safari fires a synthetic `pointerdown` at the same screen coordinates ~300ms later. This lands on the now-visible card's backdrop, triggering the tap-outside collapse. Fix: `suppressCollapseUntilRef = useRef(0)` holds `Date.now() + 450` for 450ms after programmatic expansion only; `onPointerDown` returns early while `Date.now() < suppressCollapseUntilRef.current`. Manual expansion (tap on the collapsed card button) leaves the ref at 0 — normal tap-outside collapse behavior unchanged. No setTimeout, no timer cleanup needed.

---

## Known issues

- Birthday empty for most existing users (registered before birthday field)
- `accept_invite` does not clean up `friend_requests` rows when users mix both friend flows
- `20260530000000` policies may be missing from remote — applied manually before migration tracking; verify via dashboard if visibility behaves incorrectly
