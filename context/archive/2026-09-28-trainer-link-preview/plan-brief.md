# Trainer links a trainee and previews the list — Plan Brief

> Full plan: `context/changes/trainer-link-preview/plan.md`

## What & Why

A trainer links an existing trainee by email and previews that trainee's measurement list, including the arrow and difference versus the previous entry. The product is that comparison. The trainer should see the same list the trainee sees, without creating or editing entries and without an invite flow.

## Starting Point

Trainees can register, log measurements, and see deltas. Trainers can register and land on `/dashboard`, which shows only a welcome line. `measurements` are readable only by the owning trainee. `profiles` has no email, and the Worker only has the anon key, so the app cannot look up an email with a normal query.

## Desired End State

A trainer submits a trainee's email and then sees that trainee's notes and deltas. They can link more than one trainee. The dashboard lists those emails A–Z and shows one list: the one just opened during this visit, or the most recently linked protégé when they sign in again. An email that is not an existing trainee profile shows `No trainee with that email`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| How many protégés | Many links, one list at a time | FR-008 is plural, and stacking every journal mixes several deltas on one screen |
| Who can be linked | A `profiles` row with role `trainee` | That is the trainee identity the app already stores |
| Failed email | `No trainee with that email` | Unknown, trainer, self, and never-opened accounts must look the same |
| Blank email | `Enter an email address` | An empty field is not a lookup, so it must not use the not-found sentence |
| Repeat link | No second row; show that list | A retry is safe and must not become the latest link |
| Unlink | Out of this slice | FR-007 and FR-008 only require link and preview |
| Fresh visit | Most recently linked list | Sign-in opens `/dashboard` with no query, and a click does not stick after that |
| Same-timestamp tie | Lower `trainee_id` | Two links can share `linked_at`; the preview has to be stable |
| Protégé order | Email A–Z | The list stays put when a new email is linked |
| Email match | Trim and lowercase | The stored email and `auth.users.email` have to match the same way |
| Lookup | Database function, no client insert | `profiles` has no email and the Worker cannot read `auth.users` |

## Scope

**In scope:**

- Link an existing trainee by email, with many links per trainer
- Preview one linked list, including notes and deltas
- One failure sentence, and a separate blank-email sentence

**Out of scope:**

- Unlink, invites, and distinct failure reasons
- Remembering the last clicked protégé across sign-in
- Trainer writes, note replies, and a trainee-facing "who linked me"
- Creating a profile for someone who never opened the journal

## Architecture / Approach

`trainer_links` stores the trainer, the trainee, the normalized email, and `linked_at`. `link_trainee_by_email` is the only insert path: it checks the caller is a trainer, finds a trainee profile for that email, and inserts idempotently. A trainer `SELECT` policy on `measurements` allows rows for linked trainees. `/api/trainer-links` redirects to `?trainee=` on success. `/dashboard` reuses `listMeasurements` and `MeasurementList`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Link storage | Table, function, trainer read policy | The function must not reveal which miss it hit, and clients must not insert links directly |
| 2. Link request | Email post, one failure sentence, duplicate opens that list | A repeat must not refresh `linked_at` |
| 3. Trainer preview | A–Z emails and one measurement list | An unknown `trainee` query must not look like an empty journal |

**Prerequisites:** S-02 and S-03 are done. Local Supabase for the migration and `npm run db:types`.
**Estimated effort:** About 2–3 sessions across 3 phases.

## Open Risks & Assumptions

- The migration role can create a definer function that reads `auth.users`. Linking depends on that.
- The email stored at link time is the email shown later. Nothing in this app changes a user's email.
- Several trainers may link the same trainee. The requirements allow that, and this slice does not notify the trainee.

## Success Criteria (Summary)

- A trainer links a trainee by email and sees that trainee's notes, arrows, and differences.
- A bad email always shows `No trainee with that email`, and a second submit of a good email shows that list without a new row.
- After sign-in, the list is the most recently linked protégé, while the trainee's own journal and the trainer's inability to save a measurement stay as they are.
