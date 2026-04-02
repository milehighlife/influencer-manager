# 2026-03-13 Campaign Builder Planner List Schedule-State Filter

## Why This Slice Happened

The planner list already exposed mission scheduling summary counts, but it still lacked a server-backed schedule-state filter.

Before adding that filter, the campaign-level meanings of `scheduled`, `partial`, and `unscheduled` needed to be made explicit so the API, counts, and UI all matched.

## Schedule-State Semantics

For planner-list usage, campaign schedule state is derived from mission scheduling only:

- `scheduled`: the campaign has at least one mission and every mission has both `start_date` and `end_date`
- `unscheduled`: the campaign has no missions, or every mission has neither `start_date` nor `end_date`
- `partial`: the campaign has missions and is neither fully scheduled nor fully unscheduled

This keeps the filter aligned to the mission summary counts already returned by the planner list.

## What Changed

- extended `GET /campaigns/planner-list` with a `schedule_state` filter
- applied campaign-level schedule-state filtering on the server
- kept pagination, sorting, search, and existing filters intact
- added a simple web filter control wired directly to the backend query param

## Backend Notes

- tenant scoping remains server-side
- planner-safe role access remains explicit on the route
- the generic `/campaigns` list contract was intentionally left unchanged
- no schema changes were required

## Frontend Notes

- the planner list now treats schedule-state filtering as a backend responsibility
- the web filter only selects one of the backend-defined values
- there is no local inference layer acting as the source of truth

## Deferred Work

- action-level schedule-state semantics
- denser planner schedule summaries at list level
- saved list views combining schedule state with search and sort presets
