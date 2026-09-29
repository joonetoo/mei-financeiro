---
name: zero-data-loss
description: >
  Mandatory data-safety checklist for any app that persists Joel's own data
  client-side (Supabase, a REST API, localStorage, IndexedDB — any backend).
  Load this BEFORE writing the storage/save logic of a new app, and when
  reviewing or debugging an existing one for data-loss risk. Triggers on:
  building a new personal/financial/business app for Joel, adding
  persistence to an app, "salvar dados", "backup", reports of data looking
  reset/zeroed/missing, or any request to audit an app for data safety.
  Grew out of a real incident on 2026-09-14 where financas-casa (household
  finance) silently wiped real entries after a transient network blip, and a
  matching latent bug was found and fixed in the MEI app before it could
  bite. Joel's own words: "tolerância zero a perda de dados" — treat this
  literally for these apps; they hold real financial/business data he
  cannot reconstruct if it's gone. See [[financas-casa-architecture]] and
  [[mei-financeiro-architecture]] in this project's memory for the full
  incident writeups and exact code if working on either app again.
---

# Zero data loss — mandatory checklist

Joel's apps (financas-casa, MEI, and any future one built the same way) hold
real financial/business records with no source of truth except what the app
itself persists. There is no tolerance for silently losing or overwriting
real data. Every point below is non-negotiable for any app in this
category — don't skip one because "it probably won't happen."

## The root-cause pattern (what actually bit us)

A `storage.get()` helper conflated **two completely different situations**
into one `null` return: "this row genuinely doesn't exist yet" and "the
fetch failed" (network blip, CORS, a Supabase hiccup). The app treated both
as "start fresh with seed/empty data" — and then its own autosave effect
immediately wrote that empty state back over the real row, permanently
erasing everything the user had entered. This is the single most dangerous
shape of bug in this class of app: **a transient read failure becomes a
permanent write failure**, because reads and writes are chained without a
success check in between.

Every rule below exists to close one specific way that pattern (or a
sibling of it) causes real loss.

## Required patterns — implement all of these, every time

1. **Never conflate "empty" with "failed."** A storage read must return a
   tri-state, not a boolean-ish null: `{value}` (real data), `{value: null}`
   (confirmed empty — no error, row genuinely absent), or `{failed: true}`
   (error/exception). Only `{value: null}` is allowed to fall through to
   seed/default data.

2. **Retry before giving up.** On `{failed: true}`, retry the read a few
   times with backoff (e.g. 3 tries, ~800ms/1.6s/2.4s) before treating it as
   a real failure — most real-world failures are transient (a phone
   switching from wifi to cellular, a cold Supabase connection).

3. **On confirmed failure, stop — don't proceed with a fallback state.**
   Show a clear "couldn't load, check your connection, try again" screen and
   **never set the loaded/ready flag that gates autosave.** If the
   loaded-gate is never set, the autosave effect can never fire, and a bad
   read can never become a bad write. This is the single fix that would
   have prevented the original incident.

4. **Serialize writes — never let two saves race.** If a save effect fires
   on every state change with no queue, rapid edits (or a slow network) can
   let an *older* write's network request complete *after* a newer one,
   silently reverting the newer edit. Use a simple mutex: track
   `saving`/`pendingRewrite` flags; if a save is requested while one is in
   flight, don't fire a second one — mark it pending and re-fire once the
   current one finishes, always reading the *latest* state at fire time.

5. **Flush on hide, don't trust a debounce timer alone.** If saves are
   debounced (e.g. 300ms after the last keystroke) and the user backgrounds
   the tab/app or closes it inside that window, the last edit is lost
   forever. Listen for `visibilitychange` (state `hidden`) and `pagehide`
   and force an immediate flush of any pending save.

6. **Every destructive action needs a safety net, sized to the blast
   radius:**
   - Deleting a single item (a row, an entry): instant delete is fine, but
     show an **undo toast for at least 8–10 seconds** (not less — real
     users need a moment to notice and react; this was tested and 5–6s was
     confirmably too short). Keep the removed item + its original index in
     closure, splice it back in on undo.
   - Deleting a larger unit (a month, a whole client/entity, "reset
     everything"): require an explicit **two-step confirm** (arm on first
     click, confirm on second, expire the arm after ~4s) *and* still offer
     an undo toast afterward — confirmation prevents the misclick, undo
     covers "I confirmed but changed my mind."
   - **Replacing all data wholesale (import/restore a backup file):** never
     apply on file-select alone. Parse it, validate its shape, then show an
     explicit "this will replace ALL your current data with `<filename>` —
     are you sure?" step before writing anything.

7. **Keep a rotating automatic backup, independent of the main save.**
   After every *successful* (not failure-fallback) load, once per calendar
   day, write a snapshot of the just-loaded good state to a separate
   key/row (e.g. `<main-key>-backup-<day-of-week 0-6>`, same table/DB — no
   new infrastructure needed). This gives up to 7 rolling days of
   known-good checkpoints to manually restore from if every other safety
   net fails. Never update a backup slot mid-session on every edit — only
   once per day, from a confirmed-good load, so a same-day bad write can't
   also corrupt the backup.

8. **Point-in-time export stays valuable — remind the user it exists.**
   An in-app "export data as JSON" button is what actually saved the day in
   the real incident (Joel had one from the day before). Keep it, and
   periodically remind users of apps like this to use it — it's a backup
   outside the system's own blast radius entirely (a manually downloaded
   file survives literally any bug in the app or the database).

9. **A failed save must be visible and must retry.** The storage `set`
   wrapper must THROW (or return failure) on an API error — a wrapper that
   only `console.error`s lets the save queue show "salvo" while the edit
   lives only in memory (found in MEI 2026-09-24). On failure: show a
   red "erro ao salvar" that stays visible on phone too, and retry on a
   timer (5s) until it succeeds. Also make sure a full re-render doesn't
   reset the indicator back to "salvo" (keep the save mode in a variable
   and render from it).

10. **Dates are LOCAL, never `toISOString().slice(0,10)`.** That is UTC —
    in Brazil after 21:00 it's already tomorrow, so entries get the wrong
    day and "today" views are wrong. Use a `localISO(d)` from
    getFullYear/getMonth/getDate. Apps left open for days (PWA on a phone)
    must also recompute "today" on `visibilitychange` + a 60s interval.

11. **New stored fields are additive only**, created in the load-time
    migration with a default (`if(!state.x) state.x = ...`) and never
    rewriting existing shapes — so old backups and imports still load.

12. **Two devices must never overwrite each other.** Saving the whole state
    as one row is last-writer-wins: a device left open for hours (stale
    state) will erase what another device saved, and it happens even with
    NO edit if the app saves on hide/close unconditionally (found in both
    MEI and financas-casa on 2026-09-26, proven on a test copy: a video
    added "on the phone" vanished when the "Mac" tab was merely hidden).
    Required: (a) a `dirty` flag — only save on hide/pagehide/load when
    something was actually edited here; (b) pull the latest row on
    `visibilitychange→visible`, window `focus` and every ~30s while
    visible, but only when not dirty/saving; (c) conditional write —
    `update ... where id=key and updated_at=<the one this device last
    read/wrote>`, 0 rows = conflict; (d) on conflict, never overwrite:
    save the local state to `<key>-conflito-<datetime>`, load the cloud
    version, show a sticky banner. Test by simulating the other device
    with a direct REST write to the test copy.

## When reviewing an existing app for this class of bug

Read the storage layer and the save-trigger effect first, specifically
looking for: (a) any path where a failed fetch can reach the same code path
as "genuinely empty," (b) any effect that saves on every state change with
no queue/mutex, (c) any delete/reset/import that mutates state with no
confirm or undo, (d) whether a debounce timer could eat the last edit on
close. Don't assume "it hasn't broken yet" means it's safe — the financas-casa
bug existed from the start and only manifested the first time a real
network hiccup coincided with a page load.

## Testing this class of fix yourself

If you (Claude) are verifying an undo/toast timer by clicking through it
yourself via a browser tool: **tool round-trip latency in that environment
can easily exceed 10 real seconds across just 2-3 separate tool calls** —
a "the undo button didn't work" result is very often just your own
test taking longer than the timeout, not a real bug. Verify by doing the
delete-click and the undo-click in the *same* batched tool call
(zero gap), or by reading `console.log` instrumentation / DOM text
immediately rather than trusting a screenshot's timing. Confirm via a
direct read of the actual backing store (e.g. a raw Supabase REST query),
not just what's rendered, before concluding data was really lost — and
never leave test/debug data (or debug `console.log` calls) behind in
whatever real user data store you're testing against; clean up immediately
via a direct API call if a test touches it.

**Test on a copy, never on the real row.** Give the storage key an
override that only works in dev (Vite: `(import.meta.env.DEV &&
import.meta.env.VITE_STORAGE_KEY) || '<real-key>'`), upsert a copy of the
real row under `<key>-teste`, run the dev server with that env var, and
test every destructive flow there. Before deploy, grep the production
build for the test key (must be 0 hits) and diff the real row against a
snapshot taken before testing (must be identical). To test date-dependent
logic, load the app from a temporary local HTML page that swaps
`window.Date` for a subclass offset to the target date, then delete that page.
