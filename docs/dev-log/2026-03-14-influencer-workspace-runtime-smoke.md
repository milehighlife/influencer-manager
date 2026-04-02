# 2026-03-14 Influencer Workspace Runtime Smoke

## Summary

Added a small Maestro-based runtime smoke layer for the creator workspace on iOS Simulator.

This slice complements existing unit, integration, typecheck, and export coverage with real runtime checks for:

- app launch into the already-loaded Expo Go project
- deterministic creator login
- `Status` digest rendering
- `My Assignments` search and detail/back continuity
- `My Posts` summary and row rendering

## Why

The creator workspace data contracts were already truthful, but there was still no runtime automation layer proving real navigation, session bootstrapping, and network-backed mobile rendering.

The goal was not broad e2e coverage. The goal was a small, durable smoke path for the highest-value creator screens.

## Runtime Contract

The smoke now proves:

- Expo Go can reopen the already-loaded project from its recent project list
- the creator session can be reset deterministically by clearing the Expo Go experience storage for this app
- the seeded creator can sign in through the real mobile UI
- `Status` shows bounded latest-signal digest copy and a backend-backed top row
- `My Assignments` search narrows the queue, detail opens, and back returns to the same filtered list context
- `My Posts` shows backend-backed summary totals and a rendered post row after runtime scrolling

## Implementation Notes

- Added a Maestro flow at `apps/mobile/maestro/creator-workspace-smoke.yaml`
- Added a local runner script at `apps/mobile/scripts/run-creator-runtime-smoke.sh`
- Added stable `testID` hooks for the login form and assignment search input
- The runner fetches live backend truth first and passes deterministic row assertions into Maestro as environment variables
- The runner clears only the creator app's Expo Go `RCTAsyncLocalStorage` experience directory before launch so login remains deterministic without inventing app-only reset behavior

## Local Workflow

1. Start the app in Simulator once:
   - `cd apps/mobile`
   - `npx expo start --ios --host localhost`
2. Run the smoke:
   - `npm run test:runtime:creator --workspace @influencer-manager/mobile`

## Guardrails Preserved

- no tenant-isolation changes
- no creator ownership changes
- no fake event/history semantics
- no new creator workflow breadth
- no mobile-client source-of-truth changes
