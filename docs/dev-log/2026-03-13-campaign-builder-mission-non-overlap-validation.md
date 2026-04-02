# 2026-03-13 Campaign Builder Mission Non-Overlap Validation

## Scope

Added strict mission scheduling validation to the campaign builder and the mission API.

This pass focused on:

- server-side mission non-overlap validation
- sequence-aware mission scheduling enforcement
- planner-side overlap messaging
- preserving the existing mission, action, and assignment hierarchy

## What Changed

Mission scheduling is now treated as a strict sequential planning rule:

- sibling missions must not overlap
- later missions cannot start before earlier missions end
- same-day handoff is allowed

The web planner still validates mission dates before save, but the API now also enforces these rules so invalid mission schedules cannot be persisted outside the web client.

## Why This Fits the Current Model

This slice did not change:

- the campaign -> mission -> action -> action assignment hierarchy
- lifecycle state models
- tenant boundaries
- mission ownership or reporting lineage

The change only strengthens mission scheduling rules that already belong inside the mission model.

## Boundary Convention

The current convention is inclusive same-day handoff:

- `mission_n.start_date >= mission_n-1.end_date`

This means one mission may start on the same date the prior mission ends without being treated as an overlap.

## Backend Change

Mission create and update now reject:

- end date before start date
- dates outside the campaign window
- overlap with sibling missions
- sequence/date conflicts caused by mission ordering

The backend change stayed limited to mission service validation and reused existing mission update APIs.

## Deferred

- dedicated machine-readable error-code envelopes
- action-window conflict checks
- timeline and calendar UX
- additional server-side rules for partially scheduled missions
