# TECH_STACK.md

## Purpose

This document defines the approved technical stack for the project.

Claude must follow this stack unless explicitly instructed otherwise.

Avoid introducing alternative frameworks, unnecessary abstractions, or competing technologies.

---

# Core Philosophy

The stack should prioritize:
- fast development;
- production-quality architecture;
- simplicity;
- maintainability;
- mobile-first UX;
- PWA support;
- good TypeScript support;
- excellent compatibility with AI-assisted development.

The goal is not enterprise complexity.

The goal is a clean, scalable-enough consumer product.

---

# Frontend Framework

## Next.js

Use:
- Next.js App Router;
- latest stable version.

Reasons:
- strong ecosystem;
- excellent TypeScript support;
- PWA compatibility;
- easy deployment;
- good AI tooling compatibility;
- modern routing architecture.

---

# Language

## TypeScript

Use TypeScript everywhere.

Avoid:
- plain JavaScript;
- implicit any types;
- weak typing.

Prefer:
- explicit types;
- shared type definitions;
- readable interfaces.

---

# Styling

## Tailwind CSS

Use Tailwind CSS for styling.

Reasons:
- speed;
- consistency;
- mobile-first workflow;
- easy maintenance;
- AI-friendly component generation.

Avoid:
- CSS frameworks;
- inline style chaos;
- overly complex styling systems.

---

# UI Components

## shadcn/ui

Use shadcn/ui as the primary component base.

Reasons:
- clean architecture;
- accessible components;
- modern design patterns;
- excellent Tailwind integration;
- highly customizable;
- iOS-like polish possible.

Do not install large UI frameworks unless explicitly required.

---

# Backend

## Supabase

Use Supabase for:
- authentication;
- PostgreSQL database;
- storage;
- row-level security;
- future realtime capabilities if needed.

Reasons:
- fast development;
- excellent MVP backend;
- strong Next.js compatibility;
- simple deployment;
- built-in auth;
- scalable enough for V1.

---

# Authentication

Use:
- Supabase Auth;
- email/password authentication;
- email verification.

V1 does not include:
- Google auth;
- Apple auth;
- OAuth providers;
- magic links.

---

# Database

## PostgreSQL via Supabase

Use relational database structure.

Expected entities:
- users;
- friendships;
- wishlists;
- wishlist_items;
- reservations.

Prefer:
- normalized structure;
- clear ownership;
- explicit relations.

Avoid:
- premature optimization;
- over-engineered schemas.

---

# Storage

Use Supabase Storage only for:
- user avatars.

V1 does not require:
- image uploads for wishlist items;
- media galleries;
- file systems.

---

# State Management

Prefer:
- React state;
- server actions;
- lightweight local state.

Avoid introducing:
- Redux;
- MobX;
- large global state systems;
- unnecessary complexity.

Only introduce advanced state management if a real problem appears.

---

# Forms

Recommended:
- React Hook Form;
- Zod validation.

Reasons:
- strong TypeScript compatibility;
- simple validation;
- AI-friendly implementation patterns.

---

# Data Fetching

Prefer:
- Server Components when appropriate;
- Server Actions;
- simple fetch patterns.

Avoid:
- unnecessary API layers;
- GraphQL;
- overly abstracted service architecture.

---

# Icons

Recommended:
- Lucide icons.

Keep icon usage minimal and clean.

---

# Animations

Animations should remain subtle.

Preferred:
- simple transitions;
- native-feeling interactions;
- lightweight micro-animations.

Avoid:
- heavy motion systems;
- excessive animation libraries;
- flashy UI behavior.

---

# PWA Strategy

The app should support:
- install to home screen;
- mobile app-like experience;
- responsive mobile layouts.

Desktop support is secondary.

---

# Localization

Architecture must support future multilingual UI.

Initial language:
- Russian.

Recommended:
- lightweight i18n structure;
- centralized translation strings.

Avoid:
- enterprise localization systems;
- unnecessary translation complexity.

---

# Deployment

## Vercel

Deploy using Vercel.

Reasons:
- excellent Next.js support;
- fast deployment;
- simple setup;
- preview deployments;
- easy scaling for MVP.

---

# Version Control

## Git + GitHub

Use:
- Git;
- GitHub repository.

Workflow:
- small commits;
- feature-based changes;
- clean commit history.

---

# Development Environment

Primary environment:
- Cursor editor;
- Claude-assisted workflow.

Project root:
~/Developer/wishlist-app

---

# Folder Structure

Preferred structure:

app/
components/
features/
lib/
services/
types/
hooks/
public/

Documentation files may remain in the project root.

---

# Dependencies Philosophy

Only add dependencies when they provide clear value.

Avoid:
- dependency bloat;
- overlapping libraries;
- unnecessary abstraction layers.

Prefer:
- fewer dependencies;
- stable libraries;
- widely supported tools.

---

# Security Philosophy

The app is private by default.

Prioritize:
- authenticated access;
- secure database rules;
- correct ownership validation;
- minimal public exposure.

Never trust frontend-only validation.

---

# Performance Philosophy

Prioritize:
- fast mobile loading;
- lightweight UI;
- minimal bundle size;
- smooth navigation.

Avoid:
- unnecessary rendering;
- oversized libraries;
- complex client-side logic.

---

# Final Principle

Build the simplest production-quality architecture that can support the product vision cleanly and safely.