# 2026-03-13 Campaign Builder Planner List Search

## Why This Slice Happened

The planner list already had a dedicated backend read model and server-backed sort, filter, and pagination controls.

The next scaling gap was campaign lookup for larger organizations. Planners still had no direct backend search across campaign, company, and client names.

## What Changed

- extended `GET /campaigns/planner-list` with a `search` query parameter
- applied server-side substring search across:
  - campaign name
  - company name
  - client name
- kept pagination, sorting, and existing filters intact
- kept the response shape narrow and planner-safe
- added a simple web search input wired directly to the backend query param

## Backend Notes

- tenant scoping remains server-side
- planner-safe role access remains explicit on the route
- search is case-insensitive substring matching
- no full-text infrastructure or schema changes were added
- the generic `/campaigns` list contract was intentionally left unchanged

## Frontend Notes

- the web planner list now uses backend search directly
- there is no local fallback filtering or list reconstruction
- search resets pagination back to page 1 so the list state stays predictable

## Deferred Work

- database-backed full-text search if campaign volume eventually warrants it
- search highlighting in the web list
- saved list views that combine search with filters and sort presets
