# DATABASE_SCHEMA.md

## Purpose

This document defines the database structure for the project.

Claude must follow this schema philosophy carefully.

The database should remain:
- simple;
- relational;
- readable;
- scalable enough for V1;
- easy to maintain.

Avoid overengineering.

---

# Database Provider

Use:
- PostgreSQL via Supabase.

---

# Core Principles

The database must support:
- private user accounts;
- friend relationships;
- multiple wishlists per user;
- multiple gift items per wishlist;
- gift reservation logic.

The system is private-first.

No public discovery system exists in V1.

---

# Main Entities

The application contains these core entities:

1. users
2. friendships
3. wishlists
4. wishlist_items
5. reservations

---

# USERS

Represents application users.

Each user:
- owns wishlists;
- has friends;
- can reserve gift items.

## Fields

id
- uuid
- primary key

email
- unique
- required

name
- required

surname
- required

avatar_url
- optional

birthday
- optional

created_at
- timestamp

updated_at
- timestamp

## Notes

Authentication is handled through Supabase Auth.

The application may use:
- auth.users
plus
- public profile table.

---

# FRIENDSHIPS

Represents friend relationships between users.

Friendships are created:
- through invite links;
- through email invites.

No approval flow exists in V1.

## Fields

id
- uuid
- primary key

user_id
- references users.id

friend_id
- references users.id

created_at
- timestamp

## Rules

- friendship pairs should not duplicate;
- users cannot friend themselves;
- friendship should behave symmetrically at application level.

## Notes

Depending on implementation:
- friendship may be stored once;
or
- mirrored in both directions.

Claude should choose the simplest reliable implementation.

---

# WISHLISTS

Represents wishlist collections created by users.

Each wishlist:
- belongs to one owner;
- has many items;
- can be active or archived.

## Fields

id
- uuid
- primary key

owner_id
- references users.id

title
- required

is_archived
- boolean
- default false

created_at
- timestamp

updated_at
- timestamp

## Rules

- users can create multiple wishlists;
- archived wishlists remain visible to friends;
- wishlists are private outside friend relationships.

---

# WISHLIST_ITEMS

Represents individual gift wishes inside a wishlist.

## Fields

id
- uuid
- primary key

wishlist_id
- references wishlists.id

title
- required

link
- optional

price
- optional
- numeric or decimal

created_at
- timestamp

updated_at
- timestamp

## Rules

- items belong to one wishlist;
- items do not support quantities;
- items do not support categories;
- items do not support comments;
- items do not support images in V1.

---

# RESERVATIONS

Represents reserved gift items.

A reservation means:
- one user selected one gift item.

Only one reservation may exist per gift item.

## Fields

id
- uuid
- primary key

wishlist_item_id
- unique
- references wishlist_items.id

reserved_by_user_id
- references users.id

created_at
- timestamp

## Rules

- only one reservation per item;
- only reservation owner can remove reservation;
- reservation owner cannot be replaced directly;
- wishlist owner can see who reserved items;
- all friends can see reservation state.

## Notes

No purchased state exists in V1.

No anonymous reservations.

No multi-user reservations.

---

# ACCESS CONTROL PHILOSOPHY

The application is private-first.

Access rules:

## Users can:
- view their own profile;
- edit their own profile.

## Friends can:
- view each other’s active wishlists;
- view archived wishlists;
- view reservation states.

## Non-friends cannot:
- access wishlists;
- access profiles;
- access reservations.

---

# ROW LEVEL SECURITY

Supabase Row Level Security (RLS) should be enabled.

Claude must implement proper access rules.

Never rely only on frontend protection.

---

# FUTURE-READY CONSIDERATIONS

The schema should remain flexible enough for future additions like:
- notifications;
- event dates;
- comments;
- social features;
- multi-language content;
- gift status systems.

However:
- do not implement future features now;
- do not create unused tables.

---

# NAMING RULES

Use:
- clear table names;
- explicit foreign keys;
- readable column names.

Avoid:
- vague abbreviations;
- overloaded tables;
- hidden relationships.

---

# DATA INTEGRITY RULES

Claude must preserve:
- ownership validation;
- friendship validation;
- reservation uniqueness;
- relational consistency.

Database integrity is more important than convenience shortcuts.

---

# FINAL PRINCIPLE

The schema should feel small, understandable, and reliable.

Every table must exist for a clear product reason.