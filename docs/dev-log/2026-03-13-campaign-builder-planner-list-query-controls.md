# 2026-03-13 Campaign Builder Planner List Query Controls

## Why This Slice Happened

The desktop planner list had already moved off client-side planning-view fan-out, but larger organizations still needed stronger server-backed list controls.

This slice makes the planner list read model production-usable without widening it into a detail endpoint.

## What Changed

- extended `GET /campaigns/planner-list` with:
  - server-side pagination
  - deterministic sorting
  - server-side filtering by `status`, `company_id`, and `client_id`
- kept the response narrow and planner-safe
- updated the web planner list to use the new backend query contract directly
- removed the remaining pressure to re-derive list behavior from frontend helpers

## Backend Notes

- the planner list endpoint remains organization-scoped on the server
- planner-safe roles remain explicit on the route
- no schema changes were required
- no planning-view detail was added to the list response

Returned list data still stays focused on:

- campaign identity and status
- company and client display context
- campaign dates
- mission summary counts
- created and updated timestamps

## Frontend Notes

- the web list now treats pagination, sorting, and filtering as backend responsibilities
- the page adds minimal controls for:
  - client
  - company
  - status
  - sort field
  - sort direction
  - page size
- the campaign list no longer needs list-level reconstruction logic

## Deferred Work

- server-backed search across campaign names or company/client text
- richer list-level schedule-state filters if they become product-critical
- more advanced table behaviors for very large organizations
- detail-level planner performance work beyond the list surface
