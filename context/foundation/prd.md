---
project: "Training Manager"
version: 1
status: draft
created: 2026-09-19
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: # TODO: qps — see Open Questions
  data_volume: # TODO: data_volume — see Open Questions
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

# Training Manager

## Vision & Problem Statement

A trainee reporting body measurements today sends links and works in generic data sheets with no personalized filtering. Weight and circumferences have to be compared by hand, so it is hard to tell whether the body actually changed.

The insight that makes this worth building: the product is the up/down delta versus the previous entry (arrow + difference next to each measurement), not another list of numbers. Data currently lives in spreadsheets and shared links that nobody owns as a reporting system. At 100× the user base the comparison remains per-trainee versus the previous entry.

## User & Persona

Primary persona: the trainee (trenujący). They feel the pain at the moment of reporting a new body measurement (weight, chest, waist, arms, thigh, calf, hips, navel circumference). Today they send a link or dump numbers into a sheet; they cannot see at a glance what changed. In the product they create, edit, and delete their own measurement entries, add notes, and see the delta versus the previous entry.

### Secondary persona

The trainer (trener). They need a preview of protégés' entries instead of chasing links. They do not create the trainee's measurements in the MVP; they look.

## Success Criteria

### Primary
- A trainee can register, add at least two body-measurement entries, see each entry's up/down arrow and difference versus the previous entry, and edit or delete an entry.
- A linked trainer can register, link that existing trainee by email, and preview the trainee's measurement list.

### Secondary
- A trainee can narrow the measurement list by date.

### Guardrails
- A trainer cannot create, edit, or delete a trainee's measurements.

## User Stories

### US-01: Trainee logs a measurement and sees the delta versus the previous entry

- **Given** a logged-in trainee with at least one prior body-measurement entry
- **When** they add a new measurement (date, weight, circumferences, optional note)
- **Then** they see it on the list with an up/down arrow and the difference versus the previous entry, and they can edit or delete the entry

#### Acceptance Criteria
- Each listed measurement shows the difference versus the immediately previous entry
- A first entry has no fake comparison — no delta until a previous entry exists
- The trainee can edit or delete an entry they created
- A trainer is not part of this path

## Functional Requirements

### Accounts
- FR-001: Trainee can register with email and password and pick the trainee role. Priority: must-have
  > Socrates: Counter-argument considered: "open sign-up with a role picker invites junk trainer/trainee accounts." Resolution: kept; self-serve trainee sign-up stays.
- FR-002: Trainer can register with email and password and pick the trainer role. Priority: must-have
  > Socrates: Counter-argument considered: "trainer accounts can wait — proving the trainee journal first is the real MVP." Resolution: kept; trainer sign-up stays in this 3-week MVP.

### Body measurements
- FR-003: Trainee can add a body-measurement entry with date, weight, chest, waist, arms, thigh, calf, hips, navel circumference, and an optional note. Priority: must-have
  > Socrates: No counter-argument; it stands as written.
- FR-004: Trainee can edit a previous measurement entry. Priority: must-have
  > Socrates: Counter-argument considered: "edit lets people rewrite history; the delta then lies." Resolution: kept; edit stays.
- FR-005: Trainee can delete a measurement entry. Priority: must-have
  > Socrates: Counter-argument considered: "delete breaks the delta chain — previous/next comparison becomes ambiguous." Resolution: kept; delete stays; delta uses the remaining previous entry.
- FR-006: Trainee can see a list of entries showing date, measurements, and an up/down arrow plus the difference versus the previous entry. Priority: must-have
  > Socrates: Counter-argument considered: "arrows without color don't indicate whether a drop or an increase is good." Resolution: kept; arrow + numeric difference vs previous; good/bad coloring is not in this FR.
- FR-009: Trainee can narrow the measurement list by date. Priority: nice-to-have
  > Socrates: Counter-argument considered: "the list will be short; date filter is unused until there's months of data." Resolution: kept as nice-to-have; out of MVP unless time remains.

### Trainer preview
- FR-007: Trainer can link an existing trainee by email, with no pending/accept ceremony. Priority: must-have
  > Socrates: Counter-argument considered: "invite is a whole sub-product (send, accept, pending) — too big for a 3-week measurements MVP." Resolution: revised; trainer links an existing trainee by email instead of an invite flow.
- FR-008: Trainer can preview measurement entries of protégés they linked. Priority: must-have
  > Socrates: Counter-argument considered: "trainer preview doesn't need deltas — a raw list is enough for v1." Resolution: kept; trainer sees the same list the trainee sees, including arrows + difference.

## Non-Functional Requirements

- A trainee's measurements are visible only to that trainee and to trainers who linked them.

## Business Logic

Each new body-measurement entry is compared to the immediately previous remaining entry; the product shows an up/down arrow and the numeric difference per field.

The rule consumes a trainee's entry — date, weight, chest, waist, arms, thigh, calf, hips, navel circumference. Notes are not compared. The comparison target is the immediately previous remaining entry for that trainee (after edits and deletes).

The output is, for each numeric field, an up or down arrow plus the numeric difference versus that previous entry. The oldest remaining entry has no delta.

The trainee encounters this on the measurement list, next to each entry. A linked trainer sees the same list, including arrows and differences.

## Access Control

Login with email and password. Anyone can register and pick a role: trainer or trainee.

- Trainee: create, edit, and delete their own body-measurement entries; add notes on an entry.
- Trainer: preview entries of protégés they linked. No reply to trainee notes in MVP.
- Pairing: a trainer links an existing trainee by email (no pending/accept ceremony); the trainer then sees that protégé's entries.
- Unauthenticated users do not get the journal.

## Non-Goals

- No trainer replies to trainee notes — trainer preview is read-only on notes.
- No personalized trainer questions on an entry — the trainee is not answering a trainer questionnaire when logging.
- No nutrition journal (module 2) — body measurements only for this MVP.
- No training-results journal (module 3) — body measurements only for this MVP.
- No mobile app — web only for this MVP.
- No good/bad coloring of deltas — kept out of MVP; arrow + numeric difference versus the previous entry only.
- Date filter on the measurement list is nice-to-have — out of MVP unless time remains.

## Open Questions

None captured as blocking during shaping. Uncertainties raised were resolved in place (pairing simplified to email-link; good/bad coloring of deltas kept out of MVP).

1. **What is the expected request volume (qps ballpark)?** — TBD by user. `target_scale.users` is `small`; qps was not captured. Block: no.
2. **What is the expected data volume?** — TBD by user. `target_scale.users` is `small`; data_volume was not captured. Block: no.
