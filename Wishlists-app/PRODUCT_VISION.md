# PRODUCT_VISION.md

## Project Name

Вишлист

## Product Type

Mobile-first PWA web application for collaborative wishlists and gift coordination.

## Core Idea

Вишлист is a private utility-first web application where users create personal wishlists for birthdays, holidays, personal occasions, or any other moments. Friends can access each other’s wishlists, choose gifts, and reserve them so that gifts are not duplicated.

The product is not a marketplace, not a social network, and not an AI recommendation tool. It is a simple, emotional, playful, and practical shared space for coordinating gifts inside private friend circles.

## Main Problem

People often receive gifts they do not need or want. Friends and family often do not know what to buy, duplicate gifts, or rely on awkward conversations and messy chats.

Вишлист solves this by giving each person a clear personal space where they can share what they actually want. Friends can then coordinate gift choices transparently and avoid duplicates.

## Core Value Proposition

Give people a simple way to share their real wishes and help friends choose useful, wanted gifts without confusion, duplication, or awkward guessing.

## Target Users

The product can be used by anyone who has friends, family, or a social circle that gives gifts.

Primary early users:
- people with active friend circles;
- families;
- couples;
- parents organizing gifts for children;
- adults who prefer useful gifts over random surprises;
- people who want a simple shared space instead of Google Sheets, chats, or notes.

## Product Philosophy

Вишлист should feel like a lightweight private gifting tool, not a social platform.

The experience must be:
- simple;
- warm;
- playful;
- emotional;
- mobile-first;
- easy to understand;
- visually polished;
- calm and not overloaded.

The product should make users feel:
- “Now my friends know what I actually want.”
- “Now I know what to buy.”
- “We won’t duplicate gifts.”
- “This is easier than asking in chats.”
- “This feels nice and personal.”

## What The Product Is

Вишлист is:
- a private collaborative wishlist tool;
- a friend-based gifting coordination app;
- a mobile-first PWA;
- a simple personal space for wishes;
- a way to reserve gifts and avoid duplicates.

## What The Product Is Not

Вишлист is not:
- a marketplace;
- an Amazon clone;
- a social network;
- a public discovery platform;
- a recommendation engine;
- an AI gift assistant;
- a shopping platform;
- a feed-based app;
- an advertising platform.

## Core Product Model

Users create accounts.

Each user has:
- profile;
- avatar;
- name;
- surname;
- email;
- birthday;
- friends;
- wishlists.

Users can create multiple wishlists.

Each wishlist:
- belongs to one user;
- has a custom title;
- does not require a date;
- can be active or archived;
- contains gift items.

Each gift item can include:
- title;
- optional link;
- optional price;
- reservation status.

Friends can open each other’s wishlists and reserve gift items.

A reserved gift item:
- cannot be reserved by another user;
- is visible as reserved to other friends;
- can only be unreserved by the user who reserved it;
- remains visible in the wishlist.

## Social Model

The first version is not a social network.

There is:
- no feed;
- no public profiles;
- no public discovery;
- no followers;
- no likes;
- no reactions;
- no comments;
- no posting gifts after events.

The product uses a private friend graph.

Users can add friends:
- by email invitation;
- by invitation/profile link.

Friend confirmation is not required in V1. If a user receives an invite and registers, they are automatically connected to the inviting user.

## Visual Direction

The product should feel close to iOS-native consumer apps.

Visual style:
- light theme only for V1;
- soft;
- playful;
- emotional;
- clean but not sterile;
- rounded cards;
- clear hierarchy;
- friendly spacing;
- mobile-first layout;
- polished enough for real use.

Avoid:
- corporate dashboard feeling;
- heavy minimalism;
- Notion-like productivity aesthetic;
- Pinterest-like visual overload;
- Instagram-like social energy;
- childish design;
- dark theme in V1.

## Language Strategy

The application must be built with multilingual architecture from day one.

Initial interface language:
- Russian.

The product should be ready to support English later.

The UI may include a language switcher icon in the structure, but English translation is not required for V1 unless explicitly requested later.

## Platform Strategy

The product should be built as a mobile-first PWA.

The app should:
- work well on mobile browsers;
- be installable on a phone home screen;
- feel like a lightweight native app;
- also work acceptably on desktop screens.

Desktop support is secondary. Mobile experience is primary.

## V1 Goal

The goal is not a rough prototype.

The goal is a clean, production-ready first version that can be used by real people.

V1 should be small but complete.

Quality matters:
- stable architecture;
- clean database model;
- consistent UI;
- no unnecessary complexity;
- no temporary hacks that would require a full rewrite later.

## Guiding Principle

Build the smallest complete product that solves the real gifting coordination problem beautifully.

Do not expand the scope unless explicitly requested.