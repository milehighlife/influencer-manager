# 2026-03-13 Campaign Builder Action Conflict Validation

## Why This Slice

Mission windows were already enforced, but fully scheduled sibling actions inside the same mission could still overlap.

This slice closes that gap so mission planning remains useful as actions become more tightly scheduled.

## What Changed

- added server-side sibling action overlap validation for action create and update
- added planner-side sibling action conflict validation for inline action creation and editing
- preserved the existing action-window ordering rule
- preserved the existing mission-boundary rule
- preserved partial scheduling by only checking sibling conflicts when the current action has both `start_window` and `end_window`

## Current Conflict Rule

- fully scheduled sibling actions in the same mission must not overlap
- same-day handoff is allowed
- partially scheduled actions are still allowed
- sibling conflict checks only apply when both the current action and the sibling action have complete windows

Example:

- valid: action B starts at the exact time action A ends
- invalid: action B starts before action A ends

## Why Server-Side Validation Was Added

The planner should not be the only place that understands scheduling integrity.

Server-side enforcement ensures:

- invalid action windows cannot be persisted from non-web clients
- tenant-safe planning behavior stays consistent across surfaces
- mission scheduling remains meaningful when multiple actions are scheduled inside one phase

## Backend Impact

- backend changed only in the existing action service
- no schema changes
- no new endpoints
- no lifecycle changes

## Deferred Work

- timeline or calendar visualization for action schedules
- planner-side bulk rescheduling tools
- partial-schedule completeness requirements
- cross-action dependency modeling beyond simple non-overlap
