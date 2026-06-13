# SimpleWish Performance Context

> Written 2026-06-03. Read this before touching Home page data fetching or layout queries.

---

## Problem

The app felt slow during navigation and Home page loading. Users experienced:
- Frozen screen between tab taps (no visual feedback)
- Sluggish Home page load compared to other pages

---

## Investigation Method

Temporary `[PERF]` instrumentation was added to two files:

- `app/(app)/layout.tsx` — measured auth, profile query, friend_requests count
- `app/(app)/home/page.tsx` — measured every individual query

Tested in production-like local mode:

```
npm run build
npm run start
```

Server-side `console.log('[PERF] ...')` output was captured from the terminal.
All instrumentation was removed after measurement.

---

## Key Findings

### Individual queries were not slow

Warm per-query latency to Supabase: **60–90ms per round-trip**.
This is network latency between the server and the Supabase instance.
Adding indexes or optimizing RLS would not meaningfully reduce this.

### The bottleneck was sequential round-trips

Before the fix, the Home page made **9 serial round-trips** to Supabase plus one parallel group of 4.
Each sequential hop paid the full ~75ms network cost.

Warm timing before optimization:

| Step | Queries | Wall-clock |
|---|---|---|
| friendships | 1 serial | ~62ms |
| incoming requests | 1 serial | ~117ms |
| own wishlists | 1 serial | ~67ms |
| item counts | 1 serial | ~74ms |
| friend profiles | 1 serial | ~74ms |
| friend wishlist counts | 1 serial | ~66ms |
| activity (4 parallel) | 4 parallel | ~88ms |
| "Я подарю" reservations | 1 serial | ~76ms |
| "Я подарю" items | 1 serial | ~78ms |
| "Я подарю" wishlists | 1 serial | ~61ms |
| **Home total** | | **~766ms** |

### Navigation felt frozen because no loading.tsx existed

Next.js 16 without `cacheComponents`: dynamic routes are not prefetchable without a `loading.tsx`.
Without it, clicking any nav tab kept the old page frozen until the full server render completed.
The layout itself adds ~140–228ms (warm) on every navigation due to its own auth + DB queries.

---

## Implemented Changes

### 1. Route loading skeletons

Added `loading.tsx` to all app routes:

```
app/(app)/home/loading.tsx
app/(app)/friends/loading.tsx
app/(app)/wishlists/loading.tsx
app/(app)/profile/loading.tsx
app/(app)/wishlists/[id]/loading.tsx
app/(app)/friends/[friendId]/loading.tsx
```

Effect: Next.js can partially prefetch dynamic routes. Users see an instant skeleton
on navigation instead of a frozen screen, while the server renders in the background.

Note: The layout's own queries (auth + profile + friend_requests count) still block before
the skeleton appears. This is a framework-level constraint without `cacheComponents`.

### 2. Parallelized Home page queries

**Before:** 9 sequential awaits + 1 parallel group.

**After:** 2 parallel groups + 1 unavoidable sequential tail.

**Round 1** — 9 independent queries, all needing only `user.id`:
- `friendships`
- `friend_requests` (incoming)
- `wishlists` (own active)
- `reservations` (my own, for "Я подарю")
- `wishlist_items` (activity: new_items) — no `profiles!inner`; owner names resolved via profileById in JS
- `reservations` (activity: reserved on my items)
- `get_friend_recommendations` RPC
- `wishlists` (activity: auto_archived — own wishlists with `auto_archived_at IS NOT NULL AND >= 14 days`)
- `profiles` (feature guide flags)

Note: `wishlist_access` query removed (2026-06-05, access_granted event removed from feed).

**Family Groups additions (2026-06-13):** Round 1 extended with a 10th query: `family_requests WHERE to_user_id = me` (incoming family invitations for Home page). Feed filters updated: `new_wishlist` uses `.in('visibility', ['all_friends', 'family'])` at DB level; `new_items` and `wishlist_item_reserved` JS filters extended to include `family` visibility. `family` events carry `fromFamily: true` — no extra query, computed from the visibility field already fetched.

**Round 2** — 6 conditional queries depending on Round 1 IDs:
- sender profiles (→ `rawRequests`)
- friend profiles (→ `friendIds`)
- friend wishlist counts (→ `friendIds`)
- activity: new_wishlist (→ `friendIds`) — no `profiles!inner`; owner names resolved via profileById
- "Я подарю" reserved items (→ `myReservations`)
- mutual friend counts RPC (→ `friendIds`)

Note: `own wishlist item counts` query removed 2026-06-11 when "Мои вишлисты" Home section was removed.

**Round 3** — 1 sequential query, unavoidably depends on Round 2:
- "Я подарю" wishlists (→ `reservedItems`)

### 3. Removed all instrumentation

All `performance.now()`, `console.log('[PERF]...')`, and timing variables were removed.
A pre-commit audit found no lost awaits, no `Promise.all` ordering bugs, no behavior changes.

### 4. Wishlist item auto-save dirty check

`doSave()` in `OwnerItemRow` (`features/wishlists/owner-item-row.tsx`) now compares
current field values against their originals before calling `updateWishlistItemAction`:

```tsx
const isDirty =
  titleValue !== item.title ||
  (formData.get('price') as string) !== (item.price !== null ? String(item.price) : '') ||
  (formData.get('link') as string) !== (item.link ?? '')
if (!isDirty) { onCollapse(); return }
```

If no field was modified, `onCollapse()` is called directly. No Server Action is invoked,
no DB write occurs, and no `revalidatePath` fires. This applies on both outside-click
(via `requestClose`) and manually opening another item.

Effect: eliminates unnecessary write operations and cache invalidation on every close of an
unedited wish — including the common case of accidentally tapping a wish row and closing it.

---

## Measured Results

### Warm renders (Supabase connection pooled)

| Metric | Before | After | Change |
|---|---|---|---|
| Home total | ~766ms | ~253ms | **−67%** |
| Round 1 wall-clock | ~460ms (serial) | ~97ms (parallel) | −363ms |
| Round 2 wall-clock | ~242ms (serial) | ~88ms (parallel) | −154ms |
| Round 3 | ~61ms | ~67ms | ~same |

### Cold renders (first request, Supabase cold connection)

| Metric | Before | After | Change |
|---|---|---|---|
| Home total | ~1062ms | ~495ms | **−53%** |
| Layout total | ~766ms | ~642ms | −124ms |

Cold renders are slower because Round 1 fires 7 simultaneous connections —
some pool slots warm quickly (~107ms) while others wait (~300ms).
The Round 1 wall-clock is gated by the slowest cold connection, not the slowest query.

---

## Important Constraints

These areas must not be casually modified:

- **`can_friend_see_wishlist()`** — SECURITY DEFINER function called per-row in 4 RLS policies
- **`is_friend()`** — called inside `can_friend_see_wishlist()` and directly in older policies
- **`wishlist_access` table** — access control for `selected_friends` visibility
- **Reservation visibility** — friends can see who reserved; only owner can see reserver names
- **Private wishlist visibility** — `visibility = 'private'` must never leak to non-owners
- **Activity feed semantics** — `new_items` relies on RLS for friend filtering; a missing `friendIds` filter in the query is intentional. Neither `new_wishlist` nor `new_items` embed `profiles!inner` — doing so caused PGRST201 ("more than one relationship") due to an ambiguous FK path in PostgREST. Owner names are resolved in JS via the `profileById` Map built from Round 2 `friendProfilesResult`.

Any query touching these areas requires re-reading the RLS migration files
(`20260603000000_wishlist_visibility.sql`, `20260530000001_profiles_reserver_visibility.sql`)
before changing.

---

## Remaining Optimization Candidates

### Safe — low risk

| Candidate | Expected gain | Notes |
|---|---|---|
| Add LIMIT to activity queries (new_items, new_wishlist, reservations) | Bounded data fetch | No index needed; just caps unbounded scans |
| Add index on `wishlist_items(is_visible, created_at)` | Faster activity query at scale | new_items query has no index on these filter columns |
| Add index on `reservations(created_at)` | Faster reservations activity | Same pattern |
| Add index on `wishlists(owner_id, is_archived)` | Marginal; existing owner_id index helps | Most queries are already fast |
| Remove duplicate profile fetch on Profile page | ~1 round-trip on Profile tab | Layout + Profile page both fetch the same row |

### Defer — moderate or dangerous

| Candidate | Risk | Notes |
|---|---|---|
| `cacheComponents: true` in next.config.ts | High — must re-architect all pages for `use cache` + `<Suspense>` | Powerful but requires understanding caching boundaries; wrong placement leaks user data |
| `unstable_cache` for user-specific data | Medium — invalidation must be exact | Mis-invalidation shows stale data; friend-request count badge most obvious candidate |
| Move activity feed to SECURITY DEFINER RPC | Medium — touches RLS zone | Would eliminate all Home round-trips after Round 1; requires careful security review |
| Rewrite `can_friend_see_wishlist()` | High — directly affects all visibility | Function is correct; optimization risk not worth it at current scale |
| Cache friend_request count in layout | Medium | Layout re-runs on every navigation; caching the badge count with strict invalidation would help but requires tag-based revalidation wired into all friend-request mutations |
| Supabase region alignment with Vercel function | Zero code risk | Moving Supabase project to same region as Vercel deployment would cut per-query latency from ~75ms to ~10–20ms — largest single remaining win |

---

## Friend Search RPCs

### search_social_graph(p_prefix text) — SECURITY DEFINER, STABLE, LIMIT 15

CTE-based friendship graph walk. Execution order:
1. `my_friends`: direct friends of current user; guarded by `char_length(p_prefix) >= 2` — short-circuits all subsequent CTEs for short queries
2. `fof`: 2nd-degree connections (friends of friends, excluding self + direct friends)
3. `fofof`: 3rd-degree connections (excluding self + 1st + 2nd degree)
4. `candidates`: union of fof + fofof with degree label
5. JOIN `profiles`, then filter by 8 prefix conditions + ORDER BY degree, match quality, username

Performance notes:
- At current scale (< 50 friends per user), fof/fofof sets are small. No dedicated indexes on `name`/`surname` — acceptable.
- `transliterate_ru()` called per-row for both profile field matching and the transliterated prefix. IMMUTABLE but plpgsql (not inlined by planner).
- Transliterated query (`transliterate_ru(lower(p_prefix))`) computed once in a CTE (`translit_prefix AS (SELECT transliterate_ru(lower(p_prefix)) AS v)`), then CROSS JOINed — not recomputed per row.

### search_global(p_prefix text, p_exclude_ids uuid[]) — SECURITY DEFINER, STABLE, LIMIT 20

Full `profiles` table scan with exclusion list. Same 8-condition WHERE / ORDER BY as `search_social_graph`. Never called automatically — only after explicit "Искать дальше" tap. Transliterated query as inline subquery: `CROSS JOIN (SELECT transliterate_ru(lower(p_prefix)) AS v) AS tp`.

### transliterate_ru(t text) — plpgsql IMMUTABLE

History:
1. Original (sql, translate-based): off-by-one in TO string → к→i instead of к→k
2. Fix 1 (migration 20260606000001): corrected TO string, but translate() is 1-to-1 → щ→sch (wrong), х→h (wrong)
3. Fix 2 (migration 20260606000002): rewrite as plpgsql IMMUTABLE with 33 ordered replace() calls — correct multi-char output for all characters
4. Fix 3 (migration 20260606000003): added query-side transliteration — `transliterate_ru(lower(p_prefix))` compared against Latin fields (bidirectional matching)

No functional indexes use `transliterate_ru`. No index rebuild was required after any migration.

---

## App Shell Architecture Note

This file focuses on query performance. One additional fix that affected perceived performance was the app shell architecture change (separate from DB work):

**Problem:** document-level scroll on iOS Safari caused the header and bottom nav to visually detach during rubber-band overscroll. Users experienced layout breakage that looked like a rendering performance issue.

**Fix:** `app/(app)/layout.tsx` was rewritten to use `<div className="fixed inset-0 flex flex-col">` with only the content area (`flex-1 overflow-y-auto overscroll-y-contain`) scrolling. `html, body { overscroll-behavior: none }` added to `globals.css`. `viewportFit: "cover"` added to root layout viewport export. Bottom nav received `pb-[env(safe-area-inset-bottom)]`.

This is purely a layout constraint. It has no interaction with Supabase query performance but is preserved here because it affects perceived smoothness on mobile.

---

## Verification Checklist (completed)

- [x] Build passed (`npm run build`)
- [x] No `[PERF]` logs remain in source
- [x] No RLS changes
- [x] No schema or migration changes
- [x] No business logic changes
- [x] No UI design changes
- [x] Code audit: no lost awaits, no `Promise.all` ordering bug, no hidden behavior change
- [x] Live measurement confirmed −67% warm improvement
- [x] Auto-save dirty check: build passes, no TypeScript errors, no behavior changes for edited items
