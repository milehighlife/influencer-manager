# 2026-03-13 Campaign Builder Admin Scale and Query Continuity

## Why This Slice

Desktop planner QA exposed four remaining admin-side weaknesses that were not core blockers but did undermine planner truth and scale:

- lookup controls silently capped org data at the first 100 rows
- campaign-list query state was lost on reload and normal list-detail navigation
- mission create lacked the same client-side schedule validation already present in mission edit
- filtered planner-list empty states read like missing data instead of no-results-for-current-query

The goal of this slice was to harden those behaviors without widening planner scope or moving backend truth into frontend helpers.

## What Changed

### Admin Lookup Scale

Supporting planner lookups now use backend search instead of first-page capped local data:

- clients: `GET /clients?search=...`
- companies: `GET /companies?search=...&client_id=...`
- influencers: `GET /influencers?search=...`

On the web side, campaign filters, campaign creation, and assignment flows now use those search-backed lookup requests. The UI no longer implies that a single preloaded page is the complete org directory.

### Planner-List Query Continuity

Campaign-list query state now lives in URL query params instead of local-only component state:

- `search`
- `client_id`
- `company_id`
- `status`
- `schedule_state`
- `sort_by`
- `sort_direction`
- `page`
- `limit`

That preserves context across:

- reload
- list -> detail -> back navigation
- shareable planner URLs

### Mission Create Validation Parity

Mission create now reuses the same locally-known schedule validation already used by mission edit:

- campaign-window violations are blocked before submit
- sibling mission overlap is blocked before submit
- same-day handoff remains allowed
- partial scheduling remains allowed

The planner still relies on the API as the final source of truth, but it no longer sends avoidable mission-create roundtrips for constraints it already knows.

### Empty-State Truthfulness

Campaign-list empty states now distinguish between:

- no campaigns yet
- no campaigns match the current query

That keeps planner feedback truthful when search and filters narrow the list to zero rows.

## Backend Changes

Small backend additions were required to make admin lookups truthful at scale:

- added `search` support to client list queries
- added `search` support to company list queries
- added `search` support to influencer list queries

These remained narrow lookup-oriented changes and preserved server-side tenant scoping.

## Tests

Added or updated coverage for:

- backend lookup search behavior
- URL-backed planner-list query state hydration
- backend lookup usage in web filters
- no-results vs no-data empty-state rendering
- mission create local validation parity
- existing browser smoke flows that rely on company and influencer lookup controls

## Deferred

- richer async combobox UX for admin lookups
- denser planner-list/table presentation
- saved planner views or presets
- broader bulk staffing/admin workflows
