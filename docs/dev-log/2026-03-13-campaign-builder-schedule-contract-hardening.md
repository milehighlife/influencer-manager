# 2026-03-13 Campaign Builder Schedule Contract Hardening

## Why

Campaign, mission, and action schedule fields were editable in the planner, but clearing a saved date was not a truthful end-to-end operation.

The web forms tended to turn empty inputs into omitted fields, and the API services treated omitted values as "leave unchanged." That meant the planner could visually imply a date had been cleared while the backend still retained the old schedule value.

## What Changed

- added API-side campaign date validation so `start_date` cannot be later than `end_date`
- added campaign update validation so new campaign windows cannot exclude already scheduled mission dates
- preserved mission and action scheduling rules while making schedule fields explicitly clearable
- updated planner edit forms so cleared campaign, mission, and action date inputs send `null`
- updated DTO handling so update payloads preserve explicit clears instead of collapsing them into ignored `undefined`

## Contract

Scheduling update semantics are now:

- `null` = clear this saved schedule field
- omitted field = leave the saved value unchanged

This contract now applies to:

- campaign `start_date`
- campaign `end_date`
- mission `start_date`
- mission `end_date`
- action `start_window`
- action `end_window`

## Product Behavior Preserved

- campaign hierarchy is unchanged
- mission non-overlap and strict sequential phase rules are unchanged
- action window and sibling conflict rules are unchanged
- same-day handoff remains allowed
- partial mission and action scheduling remains supported

## Why This Fits The Current Model

The planner list and read-only timeline already surface `scheduled`, `partial`, and `unscheduled` states. Those views are only trustworthy if a planner can actually remove saved dates and have the backend persist that new state.

This slice hardens the scheduling contract without widening the planner surface or changing the existing scheduling rules.

## Deferred

- richer campaign schedule conflict visualization
- bulk date clearing or bulk rescheduling tools
- timeline editing
- calendar-style schedule editing
- broader machine-readable error-code cleanup across scheduling endpoints
