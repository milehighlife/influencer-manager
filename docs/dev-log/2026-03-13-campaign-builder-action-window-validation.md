# 2026-03-13 Campaign Builder Action Window Validation

## Why This Slice

Mission scheduling was already enforced as a strict sequential planning rule.

The next safe step was to extend schedule integrity downward so action execution windows cannot drift outside the parent mission they belong to.

## What Changed

- added server-side action window validation for action create and update paths
- added planner-side validation for inline action creation and editing
- exposed `start_window` in the desktop action editor, not just `end_window`
- surfaced parent mission window guidance directly in the action forms

## Current Scheduling Rules

- action `start_window` and `end_window` remain optional
- if both are present, `start_window` must be on or before `end_window`
- if a mission has dates, any provided action window value must stay inside the mission date window
- same-day boundary alignment is allowed

Examples:

- valid: action starts on the same day the mission starts
- valid: action ends on the same day the mission ends
- invalid: action starts before the mission start date
- invalid: action ends after the mission end date

## Why Server-Side Validation Was Added

This rule is part of planning integrity, not just web-form ergonomics.

The API now rejects invalid action windows so:

- invalid dates cannot be persisted from non-web clients
- tenant-safe planning behavior remains consistent across clients
- mission scheduling remains meaningful as the parent planning boundary

## Backend Impact

- backend changed only in the existing action service
- no schema changes
- no new endpoints
- no lifecycle changes

## Deferred Work

- action-to-action conflict checks within a mission
- timeline or calendar-style scheduling UI
- broader scheduling completeness requirements for partially scheduled actions
- machine-readable error code envelopes beyond the current API error style
