# Swift Porting Notes

Platform-specific pitfalls, native UX invariants, cross-platform behavior requirements, and implementation lessons for the iOS port of SimpleWish.

---

## App Shell Layout Model

The web app uses a fixed-container shell: `fixed inset-0` root → header (fixed, does not scroll) → scrollable content area → tab bar (in-flow, does not scroll). This maps directly to the standard iOS app shell:

- Root container → `UIView` pinned to `safeAreaLayoutGuide` or screen edges
- Header → `UINavigationBar` or custom fixed header view, `shrink-0` equivalent
- Content area → `UIScrollView` (or `UITableView` / `UICollectionView`) that fills remaining space between header and tab bar
- Tab bar → `UITabBar` at the bottom, in-flow (not overlapping content)

**Key invariant:** only the content area scrolls. The header and tab bar are always fully visible. Do not design any screen where the header or tab bar can be obscured by scroll position.

**Safe area:** the web version uses `pb-[env(safe-area-inset-bottom)]` on the tab bar container and `viewportFit: "cover"`. On iOS use `safeAreaInsets.bottom` on the tab bar's bottom constraint — never hardcode pixel values.

---

## Wishlist Title Inline Rename

The wishlist title on the detail screen is directly editable by the owner — there is no separate "rename" modal or menu item.

- Tap the title → heading is replaced in-place by a text field (`<input autoFocus>`)
- Confirm: tap outside the field or press Enter → save
- Cancel: press Escape → restore original title, no network call
- Optimistic: the displayed title updates immediately on confirm; reverts if the server returns an error
- No-op guard: if the trimmed new value equals the current title, no network call is made

On iOS:
- Tap on the title label → replace with `UITextField` in the same position, `becomeFirstResponder()`
- Keyboard dismiss (return key or tap outside) → save
- A dedicated "Cancel" affordance (e.g. swipe to dismiss or dedicated button) should trigger the cancel path
- Do not use a separate rename sheet or `UIAlertController` — inline editing is the intended UX

---

## Invite Sharing

- Two distinct actions: **Copy** (puts formatted text on clipboard) and **Share** (opens native share sheet). Both must always be visible simultaneously — do not hide or collapse either.
- The shared/copied content is a formatted text block, not a bare URL:
  ```
  {FirstName} приглашает вас в SimpleWish 🎁

  Подружитесь в приложении, чтобы видеть списки желаний друг друга.

  {inviteUrl}
  ```
- Fallback display name if profile name is unavailable: `"Ваш друг"`.
- On iOS: use `UIActivityViewController` for Share, `UIPasteboard` for Copy.
- Pre-generate the invite URL before the user taps to avoid perceptible delay on tap.

---

## Copy Feedback

- After a successful copy, show an inline confirmation ("✓ Приглашение скопировано") for ~2 seconds, then auto-dismiss. No modal, no full-screen toast.
- On copy failure, show an inline error in the same location.
- Lesson: the web version required clipboard calls to be synchronous within the user gesture (Safari WebKit restriction). On iOS, `UIPasteboard` has no such restriction — but the inline, non-blocking feedback pattern should be preserved.

---

## Bottom Safe Area

- All content pages must account for the bottom tab bar. On iOS, use `safeAreaInsets.bottom` + tab bar height as the minimum bottom content inset — do not hardcode pixel values.
- The last interactive element on every page must be fully visible above the tab bar when scrolled to the bottom. Never let a primary action be obscured.

---

## Destructive Actions

- Destructive actions (remove friend, leave wishlist) use **inline confirmation**, not a `UIAlertController` sheet.
- Pattern: collapsed trigger (red-colored label) → expands in-place to title + description + Cancel / Confirm buttons.
- During the async operation: disable both buttons, show loading text. Re-enable and show error inline on failure.
- On success: navigate away immediately with no lingering state.
- Cancel returns to the collapsed trigger with no animation artifact.

---

## Friend Removal

- Accessible only from the **friend detail screen**, not from the friends list — intentional to reduce accidental taps.
- Re-friending does **not** restore previous private wishlist access. The owner must explicitly re-share. This is a deliberate product decision, not a bug.
- After removal: navigate back to the friends list immediately. The removed user disappears from all feeds and private wishlist guest views.

---

## Private Wishlist Leave (Non-Owner)

- An invited guest can leave a private wishlist without a confirmation dialog — the action is low-stakes because the owner can re-invite at any time.
- After leaving: the wishlist disappears from the guest's list immediately.
- On iOS: place a secondary destructive button ("Покинуть вишлист") at the bottom of the wishlist detail screen.

---

## Friend Search

- Default search is limited to the user's **social graph** (2nd and 3rd-degree connections only). The full user database is **not** searched by default. This is a deliberate privacy decision — new users with few friends should not inadvertently expose the full user directory.
- "Искать дальше" is an **explicit user action** that triggers global search. On iOS this must be a clearly visible secondary button that appears only after the social graph search completes — not an automatic fallback, not triggered on timeout.
- Global search must exclude users already shown in social graph results. Do not show duplicates.
- Search is bidirectional: typing Cyrillic finds users with Latin usernames/names (e.g. "Вит" → "Vitalii"), and typing Latin finds users with Cyrillic names (e.g. "ir" → "Ирина"). Implement `transliterate_ru` equivalent in Swift for the query side.
- Extended search state (global results, "Другие пользователи" label) must reset whenever the query changes — even if the user is mid-scroll.

---

## Activity Feed

- The current web feed has no historical event log — everything is computed live from existing rows. Deleted rows leave no trace.
- Do not design an iOS feed that assumes historical events (e.g., "X unfriended you", "Y left your wishlist") without first building an `activity_log` table. Design within the live-query model, or build the table first.
- `wishlist_auto_archived` is an event type computed from `wishlists.auto_archived_at IS NOT NULL` for the current user's own wishlists — it is informational, not interactive. On iOS consider a local notification (1 day before expiry) as a complement to the feed entry.

### Active event types (as of 2026-06-11)

| Type | Source | Filter | Copy pattern |
|---|---|---|---|
| `birthday_approaching` | `profiles.birthday` of friends | 1–14 days until next birthday | "Послезавтра день рождения у {Name}" / "Через неделю…" / "Через 2 недели…" |
| `new_friend` | `friendships.created_at` | Last 14 days | "{Name} {Surname} теперь ваш друг" |
| `new_wishlist` | `wishlists.created_at` | Last 14 days; `all_friends` visibility; not archived | "{Name} создал вишлист «{title}»" |
| `new_items` | `wishlist_items.created_at` | Last 14 days; `all_friends` wishlist; `is_visible=true` | "{Name} добавил желание / {title} / в «{wishlist}»" (count=1) or "{Name} добавил N желаний / в «{wishlist}»" (count>1) |
| `wishlist_item_reserved` | `reservations.created_at` | Last 14 days; own wishlists only | Random label from 4 variants; "из «{wishlist}»" second line |
| `wishlist_auto_archived` | `wishlists.auto_archived_at` | Last 14 days; own wishlists | "Вишлист «{title}» завершён" |

### Grouping rules

- `new_items`: grouped by `(owner_id, wishlist_id)` across the full 14-day window. Multiple adds to the same wishlist collapse to one event. The event ts is the latest item's `created_at` within the group.
- All other types: one row per raw DB row (no grouping).

### Sort + cap

- All event types merged and sorted descending by `ts` (ISO string comparison).
- Top 4 events displayed. If more than 4 exist, older ones are hidden.
- `birthday_approaching` uses a **synthetic ts**: `today − (daysUntil − 1) days`. A birthday tomorrow gets ts = today (highest urgency). A birthday 14 days away gets ts = today − 13 days. This ensures birthday urgency is reflected in sort position relative to other feed events.

### Feeds only show `all_friends` wishlist activity

- `new_wishlist` and `new_items` only appear for wishlists with `visibility = 'all_friends'`. Private and `selected_friends` wishlist activity is intentionally hidden from the feed.

### Avoid `profiles!inner` embedded join

On the web, PostgREST PGRST201 error ("more than one relationship") occurs when embedding `profiles` inside a `wishlists` query, because there are multiple FK paths from `wishlists` to `profiles`. On iOS/Swift, avoid the same pattern in any Supabase query that joins `wishlists → profiles` indirectly. Fetch the wishlist `owner_id` and resolve the owner's name from a separately-fetched profiles dictionary instead.

---

## Wishlist Expiration

- Each wishlist has an optional expiration date (`expires_on DATE NULL`). `NULL` = бессрочно. When the date passes the wishlist is automatically archived by a daily server cron.
- **Owner — detail screen:** expiration renders below the title. Tap to enter edit mode. Display: "бессрочно" (null) or "до ДД.ММ.ГГГГ" (date set). Edit mode: DD.MM.YYYY masked text field + "или сделать бессрочным" action to the right of the field; blur/return saves, Escape cancels, optimistic update with server revert on error.
- **Non-owner — detail screen:** shows "до ДД.ММ.ГГГГ" if a date is set; hidden entirely when бессрочно.
- **Date field edit UX:** on entering edit mode the cursor is placed at position 0 (not end, not full selection). The first keystroke clears the old date and starts fresh — digit 1 becomes the day-tens digit, digit 2 the day-units, etc. Do not implement per-character in-place overwrite at launch; "first keystroke clears" is the approved UX.
- **Validation (both client and server):** past dates rejected; year > 2099 rejected; today allowed.
- **Auto-archive notification:** on iOS consider a local `UNUserNotificationCenter` notification scheduled 1 day before `expires_on` — the web app has no push notifications for this event.

---

## Wishlist Create Form — Expiration and Visibility

The create wishlist form has two additional compact parameters below the title field:

- **Срок** (expiration): `●` До даты / `○` Бессрочно — when "До даты" is selected a DD.MM.YYYY date field appears with the same validation as the detail page editor.
- **Видимость** (visibility): `●` Все друзья / `○` Только я — maps to `all_friends` / `private`. A third mode `selected_friends` is added post-creation via the detail page access section.

On iOS: implement as compact inline option rows below the title input, using the same `●/○` radio pattern used in privacy settings. Keep the form tight — no full-screen modal for creation.

---

## Wishlist Expiration Onboarding

- A one-time in-app education card ("Теперь у вишлистов есть срок") appears on the Home feed for users who have not yet set an expiration on any active wishlist.
- Dismiss (×) sets `profiles.wishlist_expiration_guide_completed_at`; the card never reappears. CTA navigates to the first eligible wishlist detail page with `?guide=expiration`.
- On the detail page, `?guide=expiration` activates a soft blue highlight on the expiration field with the hint "Нажмите на срок, чтобы изменить его". Tapping the highlight enters edit mode, dismisses the guide server-side, and strips the param from the URL.

On iOS:
- Implement the same one-time flag pattern using `profiles.wishlist_expiration_guide_completed_at`. Fetch it in the initial user profile load.
- The Home card maps directly to a `UIView` / SwiftUI card in the feed — same dismiss and CTA behaviour.
- For the detail-page highlight: use a pulsing ring or background fill on the expiration row. Tapping opens the edit field, marks the guide complete (PATCH profile), and removes the highlight.
- Do not re-implement the `?guide=expiration` URL param approach on iOS — use a persistent app state flag driven by the profile column instead.

---

## Cross-Route Focus and Keyboard Handling

- **Web limitation:** iOS Safari only opens the software keyboard when `focus()` is called synchronously within a trusted user gesture handler. After client-side route navigation (which is async), `autoFocus` and imperative `.focus()` calls land outside the gesture window — the keyboard may not open automatically on the first navigation.
- **iOS advantage:** `becomeFirstResponder()` called during `viewDidAppear` or during a push/present animation reliably opens the keyboard. This is a strict improvement over web behavior.
- **Desired behavior on iOS:** tapping the plus button in the tab bar from any tab → navigate to Wishlists tab → expand create card → open keyboard on the title field — all in one gesture, no second tap required. Use `becomeFirstResponder()` in `viewWillAppear` or after the navigation animation completes.
