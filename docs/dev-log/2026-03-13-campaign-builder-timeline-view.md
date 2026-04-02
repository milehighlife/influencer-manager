# 2026-03-13 Campaign Builder Timeline View

## Why This Slice

Mission and action scheduling rules are already enforced in the planner and API.

The next practical step was not more scheduling logic. It was better visibility so planners can see the shape of a campaign schedule without opening every mission and action editor.

## What Changed

- added a read-only timeline section to `Campaign Detail`
- added campaign window context at the top of the planner
- rendered mission rows in `sequence_order`
- nested action schedule visibility under each mission
- surfaced scheduled, partial, and unscheduled states in a consistent way
- surfaced visible gaps between missions when dates expose them

## What The Timeline Shows

- campaign start and end dates when present
- a derived schedule frame when campaign dates are missing but planner dates exist
- mission timing and order
- action timing inside each mission
- fallback schedule-state labels when bars cannot be rendered cleanly

## Representation Rules

- scheduled missions/actions show a proportional bar when a timeline frame exists
- partially scheduled missions/actions remain visible and are labeled `Partial schedule`
- unscheduled missions/actions remain visible and are labeled `Unscheduled`
- mission gaps are informational only and do not introduce new validation rules

## Read-Only Decision

This slice intentionally stays read-only.

Deferred on purpose:

- drag scheduling
- resize handles
- calendar month/week views
- dependency editing
- bulk rescheduling

That keeps the planner operational without turning timeline visibility into a second editing system.

## Backend Changes

None.

Existing campaign planning data already contained the mission and action schedule fields needed for this visibility layer.

## Deferred Work

- denser timeline layouts for large campaigns
- editable timeline interactions
- calendar views
- dependency or critical-path style planning
- richer schedule conflict visualization beyond current inline validation
