# Hostela — Student Hostel Marketplace

A verified-only student hostel marketplace for COMSATS University Islamabad
(Chak Shahzad campus first). Every listing is checked by an admin before it
goes live. Students browse, filter, save favourites, view listings on a map,
and send inquiries; owners submit listings and manage inquiries; admins run
the verification checklist.

Built by Muhammad Musawer (BS Computer Science, COMSATS University
Islamabad). Scope: **Hostela PRD v2 — MVP Scope**, which is the single source
of truth — where code and PRD disagree, the PRD wins.

Live site: https://hostela-5a2dc.web.app (Firebase project `hostela-5a2dc`,
Spark plan). GitHub: `musawerbaig/hostel-management-system`.

## Run locally

Prerequisites: Node.js.

```bash
npm install
npm run dev     # Vite dev server
npm run build   # production build check
npm test        # vitest: checklist, haversine, docToModel
```

No secrets are needed to run it. The Firebase web config in `firebase.ts`
identifies the project; it is a public identifier, not a password. Real
protection comes from Firebase Authentication + the Firestore security rules
in `firestore.rules` (Storage rules are legacy — uploads go to Cloudinary).

## Accounts & roles

Sign-up / sign-in use Firebase Authentication (email + password). Every
account gets a profile document at `users/{uid}`:

- **Student** — usable immediately; can browse, save favourites, send
  inquiries, and leave one gated review per confirmed stay.
- **Owner** — submits listings, which start at `pending` and go live only
  after admin verification. Owners see their own listings at any status.
- **Admin** — never self-serve. The first admin is made by editing a
  `users/{uid}` document in the Firebase console: set `role` to `admin`.

## How it works (PRD v2)

- **Inquiry only, no bookings/payments/chat.** A student inquiry carries
  phone, move-in date, beds needed, and a message. The owner's phone is
  revealed only after the inquiry is sent.
- **Pricing is per bed per month**, plus a separate mess price and a
  separate one-time security deposit. Availability is total beds / beds
  free / available-from date.
- **Verification (PRD §5)** is a remote document + consistency check — never
  a claimed physical visit. The Admin HQ checklist gates Approve on four
  rows: required fields complete, at least 3 photos, verification documents
  on file, and an admin-confirmed reachable-owner test. Rejections carry a
  reason the owner sees, and owners can resubmit. Admins can also suspend
  and reinstate live listings.
- **Reviews are gated**: one per inquiry the owner marked "stayed".
- **Photos** go to Cloudinary (free tier, unsigned preset); verification
  documents live only in the private `verificationDocs` collection (owner +
  admin read) — never in the public listing document.
- **Notifications (R5)**: when an inquiry is saved, the listing owner is
  emailed within a minute via EmailJS (free tier, 200/month). The owner's
  email is never public: it lives in a private `listingContacts/{listingId}`
  document that a student unlocks only through a genuine inquiry, enforced
  by the Firestore rules. Cloud Functions were deliberately avoided so the
  project stays on the Firebase Spark plan.
- **Student completeness (R6)**: favourites, room-type / amenity /
  beds-available / near-COMSATS filters, a Leaflet + OpenStreetMap pin map
  (lazy-loaded), and per-listing URLs (`#/hostel/{id}`) so listings are
  shareable. Distances to COMSATS are computed with haversine, never stored.
- **Data model (PRD §8)**: exactly four Firestore collections — `users`,
  `hostels`, `inquiries`, `reviews` — plus the private `listingContacts`
  and `verificationDocs` companions. Named database id is `default`
  (not `(default)`); the app calls `getFirestore(app, "default")`.

## Deploy

```bash
firebase deploy --only hosting,firestore:rules --project hostela-5a2dc
```

If the CLI login has expired, `firebase login --no-localhost` prints a URL;
completing it in a browser yields an authorization code to redeem with
`firebase login <code>`. Note: the login credential lives in a temp
configstore and does not survive VM replacement — re-login is expected.

## Roadmap status

- **R1** — rules-shaped queries, mock fallbacks removed, rules hardened
- **R2** — exact PRD §8 schema migration, persisting edit/delete, OpenStreetMap embed
- **R3a** — full owner listing form, pause / request re-review
- **R3b** — Cloudinary photo + verification-doc uploads, privacy split
- **R4** — verification checklist, reject-with-reason, suspend/reinstate, counts
- **R5** — owner email notifications via EmailJS + private contact reveal
- **R6** — favourites, filters, Leaflet map, per-listing URLs, SEO
- **R7** — launch hardening: tests, orphan cleanup, README, dead-code sweep

Known gaps: deleting a listing does not delete its Cloudinary files
(orphans are cleaned periodically from the Cloudinary dashboard); the 3–10
photo count is enforced by the verification checklist, not by the upload form.

## ⚠️ Security history (read this)

An earlier version committed two things that should never have been public:

1. Hardcoded admin emails + PINs — **removed in Phase 1**. The PIN system is
   gone entirely.
2. A `.env.local` file containing a Gemini API key — **removed in Phase 1**
   and the key was deleted in AI Studio. Treat anything in old Git history
   as leaked.

Never commit `.env.local`, service-account keys, or passwords.
