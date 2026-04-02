# 2026-03-13 Campaign Builder Live Browser Smoke

## Why this slice

API request-level scheduling truth and jsdom planner integration coverage were already strong, but the desktop planner still lacked a small real-browser smoke pass against the running web app and local API.

The goal of this slice was to prove runtime confidence for the highest-value planner flows with:

- real login and session bootstrap
- real navigation
- real network requests
- real React Query invalidation and refetch behavior

## What changed

The web workspace already had Playwright wiring and a narrow planner smoke spec. This slice hardened that path and validated it against the live stack.

Runtime coverage now proves:

- login into the desktop planner with seeded internal credentials
- campaign list to campaign detail navigation
- planner-list search against backend campaign, company, and client lookup
- planner-list runtime filtering, sorting, and pagination behavior
- representative combined planner-list query-state behavior after refetch
- invalid campaign date-order blocking in the real browser
- campaign date clear/edit persistence
- mission date clear/edit persistence
- action window clear/edit persistence
- assignment add/remove persistence
- action delete and mission delete confirmation flows

## Production fixes made

Two small production fixes were required to make the browser path match the already-verified planner contract:

1. Schedule edit inputs in the planner now expose real accessible labels for browser and assistive targeting.
2. Action window dates now render on the local planner day in the browser instead of drifting a day because of UTC-only display formatting.

No backend code changed in this slice.

## Test workflow

Run locally with:

- `npm run test:smoke --workspace @influencer-manager/web`

Local assumptions:

- API available at `http://127.0.0.1:3000/api`
- Playwright starts the web app on `http://127.0.0.1:4173`
- seeded internal planner account:
  - `avery.chen@northstar.example`
  - `AdminPass123!`
- the planner-list smoke path may seed a small disposable batch of draft campaigns through the live API so pagination and combined query-state assertions are deterministic

## What stayed intentionally small

- no large browser matrix
- no calendar/timeline editing coverage
- no creator/mobile/browser coverage
- no replacement of existing jsdom or API request-level suites

This remains a smoke layer, not a full end-to-end platform test suite.
