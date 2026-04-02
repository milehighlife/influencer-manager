# 2026-03-14 Influencer Workflow Deep Runtime Smoke

Extended the iOS Simulator Maestro smoke layer from creator read/navigation checks into the deeper creator workflow actions:

- deliverable submission
- rejected-state reopen and resubmission
- post-performance detail navigation

## Why

The creator workspace already had truthful backend contracts and a small runtime smoke for login, tabs, list/detail navigation, and summary rendering.

The next remaining runtime gap was the action-heavy creator path:

- a real deliverable submit
- a real rejected-state resubmit
- a real trip into post-performance detail

## What Changed

- Expanded `apps/mobile/maestro/creator-workspace-smoke.yaml` to cover:
  - in-progress assignment submission
  - rejected assignment resubmission
  - approved assignment search/detail/back continuity
  - post-performance detail rendering and return navigation
- Extended `apps/mobile/scripts/run-creator-runtime-smoke.sh` so the runtime suite:
  - reseeds the local database by default for repeatable creator workflow state
  - fetches live backend truth before running Maestro
  - derives deterministic runtime assertions for:
    - status digest copy
    - submit target assignment
    - rejected resubmit target assignment
    - approved search/detail target
    - tracked post performance detail
- Added a few runtime-stable automation hooks in the mobile app where the default accessibility surface was too brittle:
  - assignment row ids
  - post row ids
  - deliverable submission draft input ids

## Runtime Contract Proven

- creator login through the real mobile UI
- `Status` digest rendering and bounded-copy semantics
- `My Assignments` queue rendering
- real submit flow:
  - open in-progress assignment
  - submit deliverable metadata
  - return to assignment detail
  - navigate back to queue
  - confirm visible row state now matches reviewer-waiting backend truth
- real rejected flow:
  - open rejected assignment
  - review revision context
  - reopen and resubmit
  - return to assignment detail
  - navigate back to queue
  - confirm visible row state now matches reviewer-waiting backend truth
- real post flow:
  - open `My Posts`
  - open a tracked post
  - confirm post-performance summary and raw snapshot rendering
  - navigate back to posts without breaking state continuity

## Notes

- This remains a small runtime smoke layer, not a full mobile e2e matrix.
- The suite is intentionally seed-aware and resets local seeded data by default so the write-path checks are repeatable.
- The smoke does not create a durable creator event feed, broader analytics views, or Android runtime coverage.
