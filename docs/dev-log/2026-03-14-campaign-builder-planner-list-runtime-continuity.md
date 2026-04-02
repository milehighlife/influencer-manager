# 2026-03-14 Campaign Builder Planner-List Runtime Continuity

## Why this slice

The desktop planner already had:

- a backend-driven planner-list read model
- URL-backed query state
- strong API and jsdom coverage
- a small live-browser smoke suite for planner mutation flows

The remaining runtime confidence gap was planner-list continuity in the real browser:

- detail -> back behavior
- reload behavior
- combined company/client filter behavior
- schedule-state runtime behavior
- combined query-state behavior after refetch

## What changed

The existing Playwright smoke suite was extended to prove that planner-list runtime behavior matches the already-implemented contract.

The smoke flow now proves:

- search, status, schedule-state, sort, and pagination can be combined against the real backend
- a non-default list state survives navigation into campaign detail and back
- the same non-default list state survives reload
- company + client filtering works against backend truth in the live browser
- schedule-state filtering produces truthful rows or truthful no-results messaging

## Test workflow

Run locally with:

- `npm run test:smoke --workspace @influencer-manager/web`

Local assumptions:

- API available at `http://127.0.0.1:3000/api`
- Playwright starts the web app on `http://127.0.0.1:4173`
- seeded internal planner account:
  - `avery.chen@northstar.example`
  - `AdminPass123!`
- the smoke path may seed a small disposable batch of draft campaigns through the live API so pagination and continuity assertions are deterministic

## Production fixes

No production behavior changes were required in this slice.

The work was limited to:

- stronger live-browser assertions
- deterministic seeded-data assumptions for list continuity

## What stayed intentionally small

- no broad browser matrix
- no new planner features
- no creator/mobile runtime coverage
- no duplicate coverage of the deeper jsdom scheduling matrix

This remains a small high-signal runtime confidence layer for the desktop planner.
