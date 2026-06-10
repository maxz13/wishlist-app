# AI_RULES.md

## Purpose

This file defines how Claude must work on this project.

Claude must follow these rules strictly to avoid architectural drift, unnecessary rewrites, broken context, duplicated logic, and unstable development.

---

# Core Rule

Do not behave like a creative product owner.

Behave like a careful senior engineer implementing a clearly defined product.

The product direction is defined in:
- PRODUCT_VISION.md
- MVP_SCOPE.md

Claude must not override these documents.

---

# Before Any Implementation

Before writing code, Claude must:

1. Read relevant project documents.
2. Explain the implementation plan briefly.
3. List files that will be created or modified.
4. Confirm that the task does not violate MVP_SCOPE.md.
5. Keep the task small and bounded.

---

# Scope Control

Claude must not add features that were not explicitly requested.

Claude must not introduce:
- social feed;
- public profiles;
- public wishlists;
- AI features;
- marketplace logic;
- payments;
- notifications;
- comments;
- likes;
- advanced search;
- gamification;
- admin panels;
- analytics dashboards.

If a feature seems useful but is outside scope, Claude should mention it as a future idea, not implement it.

---

# Code Change Rules

Claude must:

- change only the files required for the current task;
- avoid rewriting unrelated code;
- avoid large refactors unless explicitly requested;
- preserve existing behavior;
- prefer small, safe, incremental changes;
- avoid clever code when simple code is enough;
- keep code readable and maintainable.

Claude must not:

- rename files or components without a reason;
- change database schema silently;
- change API contracts silently;
- introduce new dependencies without approval;
- duplicate existing logic;
- create multiple competing implementations of the same feature;
- leave dead code behind.

---

# Architecture Rules

Claude must respect the chosen architecture.

Expected stack:
- Next.js App Router;
- TypeScript;
- Tailwind;
- shadcn/ui;
- Supabase;
- PWA-ready structure.

Claude must keep business logic separated from UI whenever reasonable.

Preferred structure:
- app/ for routes;
- components/ for reusable UI;
- features/ for product-specific modules;
- lib/ for shared utilities;
- services/ for external service logic;
- types/ for shared TypeScript types;
- docs/ or root markdown files for project documentation.

---

# UI Rules

Claude must preserve a mobile-first product experience.

UI must be:
- light theme only;
- iOS-native inspired;
- playful but not childish;
- emotionally warm;
- clean and uncluttered;
- touch-friendly;
- consistent across screens.

Claude must not:
- create desktop-first layouts;
- use dark theme;
- create dashboard-heavy UI;
- introduce random visual styles;
- use excessive animations;
- make the app look like Notion, Pinterest, Instagram, or a corporate admin panel.

---

# Profile Settings UX Rules

Profile settings follow the inline-edit pattern (same philosophy as wishlist title editing):

- Each row is a tappable button showing `label | value` (label left, value right).
- Tapping a row switches it to an inline `<input>` (no separate edit screen, no modal).
- Save triggers on: blur (user tapped away) or Enter key.
- Cancel triggers on: Escape key (restores original value, no server call).
- No Save button — ever. Updates are fire-and-forget with optimistic revert on error.
- Canonical stored state (`storedName`, `storedSurname`, `storedBirthdayIso`) is updated optimistically; reverted if the server action returns an error.
- Birthday field uses manual text entry with DD.MM.YYYY auto-masking. Do NOT use `<input type="date">` or any native date picker — preserves consistent UX across iOS/Android/desktop and avoids locale-dependent picker formats.

---

# Database Rules

Claude must be careful with database changes.

Before changing schema, Claude must explain:
- what changes are needed;
- why they are needed;
- what tables are affected;
- how data integrity is preserved.

Claude must not:
- create unnecessary tables;
- use vague column names;
- skip ownership/access-control logic;
- weaken privacy rules;
- ignore row-level security principles.

---

# Auth and Privacy Rules

The app is private by default.

Claude must assume:
- users must be authenticated to use the product;
- wishlists are visible only within friend relationships;
- there are no public profiles or public wishlist pages in V1;
- email verification is required;
- invite flow must handle unregistered users correctly.

---

# Reservation Rules

Claude must preserve the reservation model:

- one gift item can be reserved by only one user;
- a user can unreserve only their own reservation;
- other users cannot override an existing reservation;
- wishlist owner can see who reserved each item;
- there is no anonymous reservation;
- there is no multi-user reservation in V1;
- there is no purchased/gifted state in V1.

---

# Localization Rules

The app UI must initially be Russian.

However, architecture must be ready for multilingual support.

Claude must:
- avoid hardcoding UI strings directly inside components when possible;
- keep translation structure simple;
- support future English translation.

Claude must not:
- implement complex enterprise i18n if not needed;
- translate the whole app into English unless requested.

---

# Quality Rules

Claude must aim for production-ready V1.

Code must be:
- typed;
- readable;
- modular;
- secure;
- consistent;
- easy to extend;
- easy to debug.

Claude must avoid:
- temporary hacks;
- fragile state logic;
- untyped data;
- duplicated components;
- unclear naming;
- hidden side effects.

---

# Testing and Verification

For every meaningful task, Claude should provide:

- what was changed;
- how to test it manually;
- what edge cases were considered;
- what remains unfinished, if anything.

Claude should not claim something works unless it has been implemented in the code.

---

# Git Workflow

Work should be done in small logical steps.

Recommended commit style:
- feat: add authentication flow
- feat: create wishlist model
- feat: add reservation logic
- fix: correct invite redirect flow
- refactor: simplify profile form

Claude should not bundle unrelated changes into one task.

---

# Communication Style

Claude should be concise, explicit, and implementation-focused.

Claude should not over-explain generic concepts.

Claude should ask for clarification only when a decision would significantly affect product behavior or architecture.

If the answer is already defined in the project documents, Claude should follow the documents instead of asking again.

---

## SWIFT_PORTING_NOTES.md Policy

**Purpose:** `SWIFT_PORTING_NOTES.md` stores platform-specific pitfalls, native UX invariants, cross-platform behavior requirements, implementation lessons learned from bugs, and decisions that are easy to lose during a future rewrite.

**Examples of what belongs:**
- Safari clipboard restrictions and the lesson they taught
- Share API / native share sheet behavior
- Safe area requirements
- Destructive action UX patterns
- Navigation behavior expectations
- UX feedback patterns (inline vs. modal)

**Do NOT store:**
- Feature descriptions
- Business logic
- Database structure
- RLS behavior
- Visibility rules
- Architecture descriptions
- Activity feed implementation details
- User stories
- Project history

**Test before adding a note:** "Would a future Swift developer likely miss this even after reading the code and PROJECT_CONTEXT.md?"
- If yes → add it.
- If no → do not add it.

---

# Final Instruction

When in doubt, choose:
- simpler over complex;
- private over public;
- mobile-first over desktop-first;
- product consistency over novelty;
- small safe changes over big rewrites.