# Hostela — Student Hostel Marketplace

A trustworthy student hostel marketplace connecting students and parents with verified hostel owners, with admin moderation before any listing goes live.

Built by Muhammad Musawer (BS Computer Science, COMSATS University Islamabad). Scope: **Hostela PRD v2 — MVP** (listings, search, hostel details, student inquiry, owner submission, admin verification). Originally prototyped in Google AI Studio; upgraded in phases from Jan 2026 code.

## Run locally

Prerequisites: Node.js

```bash
npm install
npm run dev     # Vite dev server on http://localhost:3000
npm run build   # production build check
```

No API keys are needed. The Firebase web config is in `firebase.ts` (project `hostela-5a2dc`); it identifies the project and is protected by the security rules below, not by secrecy.

## Accounts & roles (Phase 1 — real authentication)

Sign-up / sign-in use **Firebase Authentication** (email + password). Every account gets a profile document at `users/{uid}` holding its `role`:

- **Student** — usable immediately; can browse and (Phase 2) send inquiries and gated reviews.
- **Owner** — created with `isApproved: false`. An admin approves the owner before the security rules let them publish listings.
- **Admin** — never self-serve. Admins are real accounts whose profile role is set manually (below).

### Making the first admin

1. Create a normal account in the app (Sign up → Student) with the admin's email.
2. Firebase console → Firestore Database → `users` → open that account's document → change `role` to `Admin` (and `isApproved` to `true`).
3. Sign in again — the Admin dashboard now opens for that account.

Approving an owner is the same idea: set `isApproved` to `true` on their `users` document. (An in-app approval screen arrives in a later phase.)

## Security rules

`firestore.rules` and `storage.rules` are the real security boundary — deploy them before inviting real users:

```bash
firebase deploy --only firestore:rules,storage
```

They enforce: public reads only for approved listings; owners see/edit only their own listings and can never approve them; profiles can't self-promote role or approval; everything else is closed by default.

## ⚠️ Security history (read this)

An earlier version of this repo committed two things that should never have been public:

1. Hardcoded admin emails + PINs in `store.ts` — **removed in Phase 1**. Anyone who saw them could impersonate an admin; the PIN system is gone entirely.
2. A `.env.local` file containing a Gemini API key — **removed in Phase 1**. The app never used that key, but it still exists in old Git history, so **rotate/revoke it in Google AI Studio** and treat it as leaked.

Never commit `.env.local`, service-account keys, or passwords. `.env.example` shows the pattern for future secrets.

## Roadmap

- **Phase 1 (done)** — remove secrets/PINs, real Firebase Auth + roles, security rules
- **Phase 2 (done)** — inquiry flow that reaches the owner, reviews saved to Firestore and gated, real photo uploads
- **Phase 3** — split the monolithic `App.tsx` into pages/components, installed Tailwind (drop the CDN), Islamabad/COMSATS seed listings, sorting + distance, deploy to Firebase Hosting

## Phase 2 — how the loop works

1. **Inquiry (not booking).** On any listing, a signed-in student sends an inquiry (message, optional phone, optional move-in timing). It is stored in the `inquiries` collection with status `new` and appears in the owner's dashboard inbox. The owner moves it through `contacted` → `stayed` → `closed`; students track their own under **My Inquiries**. A WhatsApp-the-owner button sits alongside for direct chat.
2. **Gated reviews.** Reviews live in the `reviews` collection and are public to read. Writing one requires an inquiry the owner marked `stayed` — the Firestore rules check the inquiry document server-side, and the review's document id **is** the inquiry id, so there is exactly one review per confirmed stay. No confirmed stay, no review.
3. **Photo uploads.** The Add Hostel form uploads chosen photos to Firebase Storage (`hostel-photos/{ownerUid}/…`) before saving the listing. ⚠️ This project's Storage bucket activates only on the **Blaze plan**; until then the form offers to submit the listing without photos instead of failing silently.
