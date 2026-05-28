# MVP_SCOPE.md

## Goal

Build a small but production-quality first version of the product.

The goal is not to build a social platform or marketplace.

The goal is to solve one specific problem beautifully:
- collaborative gift coordination between friends.

The first version must remain intentionally simple.

---

# V1 INCLUDED FEATURES

## Authentication

Users can:
- register with email and password;
- verify email address;
- log in;
- log out;
- stay authenticated between sessions.

No social login providers in V1.

---

## User Profile

Each user has:
- avatar;
- name;
- surname;
- email;
- birthday.

Users can edit their profile.

---

## Friends System

Users can:
- invite friends by email;
- invite friends by link;
- add friends without approval flow.

If a non-registered user opens an invite:
- they must register first;
- after registration they are automatically connected.

No blocked users.
No friend requests.
No followers.

---

## Wishlists

Users can:
- create multiple wishlists;
- set custom wishlist titles;
- archive wishlists;
- unarchive wishlists;
- delete wishlists.

Wishlists do not require dates.

Archived wishlists:
- remain visible to friends;
- are separated into archive sections.

---

## Wishlist Items

Each item can contain:
- title;
- optional link;
- optional price.

No categories.
No tags.
No quantity system.
No comments.
No image uploads in V1.

Users can:
- add items;
- edit items;
- delete items.

---

## Reservations

Friends can:
- reserve gift items;
- unreserve items they reserved themselves.

Reserved items:
- become unavailable for others;
- remain visible;
- display reservation state.

Wishlist owners can see:
- who reserved each item.

No anonymous reservations.

No partial reservations.
No multi-user reservations.

---

## Navigation

Main tabs:
- Home;
- Friends;
- Wishlists;
- Profile.

No complex navigation structures.

---

## Home Screen

The home screen should prioritize:
- upcoming friend events;
- active wishlists;
- important friend activity relevant to gifting.

Avoid dashboard complexity.

---

## UI Direction

The application must:
- feel mobile-first;
- resemble polished iOS-native consumer apps;
- remain lightweight and playful;
- avoid clutter;
- avoid excessive animation;
- use light theme only in V1.

---

## Platform

The product is a:
- mobile-first PWA web application.

Desktop support is secondary.

---

## Localization

Architecture must support multilingual content from the beginning.

Initial UI language:
- Russian.

English support may be added later.

---

# EXCLUDED FEATURES

The following features are explicitly excluded from V1.

Claude must not introduce them unless explicitly requested.

## Social Features

No:
- social feed;
- likes;
- reactions;
- comments;
- reposts;
- stories;
- user discovery;
- public profiles;
- public wishlists;
- follower systems.

---

## Marketplace Features

No:
- checkout;
- payments;
- carts;
- affiliate systems;
- store integrations;
- product recommendations;
- shopping APIs.

---

## AI Features

No:
- AI gift suggestions;
- AI assistant;
- recommendation engine;
- AI-generated lists.

---

## Productivity Features

No:
- kanban boards;
- folders;
- tags;
- advanced sorting;
- filtering systems;
- drag-and-drop;
- collaboration editing.

---

## Notification Systems

No:
- push notifications;
- email notification systems;
- SMS notifications.

---

## Gamification

No:
- achievements;
- streaks;
- points;
- levels;
- rewards.

---

## Advanced Systems

No:
- admin panel;
- analytics dashboard;
- moderation system;
- complex permissions;
- teams;
- organizations;
- monetization systems.

---

# Important Product Principle

If a feature does not directly improve:
- creating wishlists;
- sharing wishlists;
- reserving gifts;
- coordinating gifts between friends;

then it probably does not belong in V1.

Keep the product focused, lightweight, and emotionally pleasant.