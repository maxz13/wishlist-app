# Swift Porting Notes

Platform-specific pitfalls, native UX invariants, cross-platform behavior requirements, and implementation lessons for the iOS port of SimpleWish.

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
