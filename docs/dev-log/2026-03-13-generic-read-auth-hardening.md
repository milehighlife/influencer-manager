# 2026-03-13 Generic Read Auth Hardening

## Why This Slice Happened

Generic organization-scoped read routes were a known risk area because some controllers still relied on service-layer tenant scoping without explicit route-level role metadata.

That left too much trust in authenticated context alone for endpoints that should stay internal-facing.

## What Changed

- added explicit `@Roles(...)` metadata to:
  - `GET /campaigns`
  - `GET /users`
  - `GET /users/:id`
  - `GET /reports/posts/:id/summary`
  - `GET /reports/actions/:id/summary`
  - `GET /reports/missions/:id/summary`
  - `GET /reports/campaigns/:id/summary`
  - `GET /reports/influencers/:id/summary`
- kept internal planner/reporting reads available to internal roles only
- kept `users` reads limited to `organization_admin`
- preserved tenant scoping in service-layer queries
- added route-level e2e coverage for campaigns, users, and reports auth boundaries

## Access Rules Confirmed

- `organization_admin`, `campaign_manager`, `campaign_editor`, `analyst`, and `viewer` can access internal campaign reads where intended
- `organization_admin`, `campaign_manager`, `campaign_editor`, `analyst`, and `viewer` can access report summary reads
- `organization_admin` alone can access user directory reads
- `influencer` is blocked from these generic internal surfaces
- unauthenticated requests are denied

## Why This Approach

This slice keeps the fix narrow:

- no schema changes
- no endpoint redesign
- no payload widening
- no changes to tenant scoping rules

The change makes the real route contract explicit and provable instead of depending on implicit service behavior.

## Deferred

- route-level auth-boundary audits for the remaining lower-priority generic read endpoints
- broader review of whether every internal read route should share a centralized role policy helper
