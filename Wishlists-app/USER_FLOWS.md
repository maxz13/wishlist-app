# USER_FLOWS.md

## Purpose

This document defines the primary user flows for the application.

Claude must follow these flows carefully when implementing:
- navigation;
- screen structure;
- routing;
- interactions;
- auth behavior;
- wishlist logic.

The product should remain:
- simple;
- mobile-first;
- emotionally pleasant;
- easy to understand.

Avoid unnecessary steps.

---

# Global Navigation Structure

Main application tabs:

1. Home
2. Friends
3. Wishlists
4. Profile

Navigation should feel:
- lightweight;
- iOS-native inspired;
- touch-friendly;
- minimal.

---

# FLOW 1 — Registration

## Goal

Allow a new user to create an account quickly and safely.

## Steps

1. User opens application.
2. User sees welcome/auth screen.
3. User enters:
   - email;
   - password;
   - name;
   - surname.
4. User submits registration form.
5. System sends email verification.
6. User clicks verification link.
7. User becomes authenticated.
8. User enters application.

## Notes

- Email verification is required.
- Keep registration friction minimal.
- Mobile-first forms.
- Avoid long onboarding.

---

# FLOW 2 — Invite Registration

## Goal

Allow invited users to join through friend invite links.

## Steps

1. Existing user sends invite link.
2. New user opens invite link.
3. If user is not authenticated:
   - redirect to registration/login.
4. After successful registration/login:
   - automatically connect friendship.
5. User enters app.
6. Inviting user now appears in Friends list.

## Notes

- No approval system in V1.
- Keep flow seamless.

---

# FLOW 3 — Create Wishlist

## Goal

Allow users to create wishlists quickly.

## Steps

1. User taps "+" button.
2. User enters wishlist title.
3. User submits form.
4. Wishlist appears in:
   - user wishlist section;
   - friend-visible wishlist list.

## Notes

- No event types required.
- No required date.
- Keep creation extremely simple.

---

# FLOW 4 — Add Wishlist Item

## Goal

Allow users to add gift wishes.

## Steps

1. User opens wishlist.
2. User taps "Add Item".
3. User enters:
   - title;
   - optional link;
   - optional price.
4. User saves item.
5. Item appears inside wishlist.

## Notes

- Fast input flow.
- Minimal friction.
- Mobile-friendly form layout.

---

# FLOW 5 — Edit Wishlist Item

## Goal

Allow users to update existing wishes.

## Steps

1. User opens own wishlist.
2. User selects item.
3. User edits fields.
4. User saves changes.

## Notes

- Editing should feel lightweight.
- Avoid modal complexity if unnecessary.

---

# FLOW 6 — Delete Wishlist Item

## Goal

Allow users to remove wishes.

## Steps

1. User opens own wishlist.
2. User selects delete action.
3. User confirms deletion.
4. Item disappears from wishlist.

---

# FLOW 7 — Reserve Gift Item

## Goal

Allow friends to coordinate gifts without duplication.

## Steps

1. User opens friend wishlist.
2. User sees available items.
3. User taps reserve button.
4. Reservation is created.
5. Item becomes reserved.

## Reserved State

Other users:
- can see item is reserved;
- cannot reserve it.

Wishlist owner:
- can see who reserved item.

Reservation owner:
- can remove own reservation.

---

# FLOW 8 — Remove Reservation

## Goal

Allow reservation owner to cancel reservation.

## Steps

1. User opens reserved item.
2. User taps remove reservation.
3. Reservation is deleted.
4. Item becomes available again.

## Rules

- Only reservation owner can do this.
- Other users cannot override reservations.

---

# FLOW 9 — View Friend Profile

## Goal

Allow users to browse friend wishlists.

## Steps

1. User opens Friends tab.
2. User selects friend.
3. User sees:
   - avatar;
   - name;
   - active wishlists;
   - archived wishlists.

## Notes

This is not a public social profile.

No:
- posts;
- activity feed;
- followers;
- likes.

---

# FLOW 10 — Archive Wishlist

## Goal

Allow users to organize old wishlists.

## Steps

1. User opens own wishlist.
2. User taps archive action.
3. Wishlist moves to archive section.

## Notes

- Archived lists remain visible to friends.
- Archive is organizational only.

---

# FLOW 11 — Unarchive Wishlist

## Goal

Restore archived wishlists.

## Steps

1. User opens archive section.
2. User selects wishlist.
3. User taps unarchive.
4. Wishlist returns to active section.

---

# FLOW 12 — Home Screen Experience

## Goal

Show the most relevant information immediately.

## Home Priorities

The home screen should prioritize:
- friend wishlists;
- upcoming birthdays if available;
- active gifting coordination.

## Suggested Sections

1. Upcoming events
2. Active friend wishlists
3. Your active wishlists
4. Friends quick access

## Notes

Avoid:
- dashboard overload;
- analytics;
- social feeds;
- empty-state complexity.

---

# FLOW 13 — Edit Profile

## Goal

Allow users to manage personal information.

## Editable Fields

- avatar;
- name;
- surname;
- birthday.

Email changes may be restricted or handled carefully later.

---

# FLOW 14 — Add Friend

## Goal

Allow users to grow their private gifting network.

## Methods

### Method 1 — Invite Link

1. User generates/share invite link.
2. Friend opens link.
3. Registration/login flow happens if needed.
4. Friendship created automatically.

### Method 2 — Email Invite

1. User enters friend email.
2. System creates invite flow.
3. Friendship created after registration/login.

---

# UX PRINCIPLES

All flows should:
- minimize taps;
- feel mobile-native;
- avoid clutter;
- remain emotionally light;
- avoid unnecessary confirmations;
- keep users inside primary flows.

---

# PRODUCT FEELING

The product should feel:
- personal;
- calm;
- useful;
- warm;
- simple.

Not:
- addictive;
- noisy;
- gamified;
- corporate;
- productivity-heavy.

---

# FINAL PRINCIPLE

Every user flow should answer:

“How can we make gift coordination feel simpler, cleaner, and more pleasant?”