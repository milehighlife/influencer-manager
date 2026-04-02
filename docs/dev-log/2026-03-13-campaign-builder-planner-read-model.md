# 2026-03-13 Campaign Builder Planner Read Model

## Why This Slice

The desktop campaign list had started depending on generic campaign rows, company lookups, and one planning-view request per campaign to assemble the data the planner actually needed.

That pushed read-model responsibility into the web client and made the list less scalable than the rest of the planning flow.

## What Changed

- added a dedicated `GET /campaigns/planner-list` endpoint for the desktop planner
- moved company and client display context into the backend list response
- added mission scheduling summary counts to the list response
- removed the web campaign list fan-out pattern that fetched one planning view per campaign
- simplified the web list hook to use one server-backed planner list query

## Read Model Shape

The new planner list response returns:

- campaign id
- campaign name
- status
- campaign start and end dates
- company id and name
- client id and name
- mission count
- scheduled mission count
- partial mission count
- unscheduled mission count
- created and updated timestamps

This stays intentionally narrower than the full campaign planning view.

## Backend Scope

The backend change is limited to a new planner-safe list endpoint inside the existing campaigns module.

It reuses the current campaign filters and tenant scoping rules, then adds a second scoped mission query to compute per-campaign mission scheduling counts for the current page.

No schema changes were required.

## Web Impact

The desktop planner no longer reconstructs campaign list rows from:

- generic campaign list data
- company lookups
- per-campaign planning-view fetches

The list now renders from a stable backend response and keeps the richer `planning-view` call only for campaign detail.

## Deferred

- richer list filtering and sorting beyond the current company filter
- direct campaign list support for timeline density summaries
- campaign list pagination enhancements for larger organizations
- any editable timeline or calendar planning work
