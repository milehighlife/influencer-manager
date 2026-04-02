# 2026-03-15 Influencer Link-Post Runtime Smoke

## Summary

Extended the iOS Simulator Maestro smoke for the creator workspace to cover the remaining creator write path around published post linkage.

This pass stayed intentionally narrow:

- no new creator features
- no backend contract expansion
- no workflow redesign
- no tenant or creator-ownership changes

## Why

The creator workspace already had runtime proof for:

- login
- `Status`
- assignment search/detail/back continuity
- deliverable submit
- rejected reopen and resubmit
- `My Posts` summary rendering
- post-performance detail

The remaining meaningful runtime gap was a real post-link write and the resulting refresh behavior.

## What Changed

- extended `apps/mobile/maestro/creator-workspace-smoke.yaml` to:
  - open an approved assignment
  - link another published post from the approved deliverable
  - return to assignment detail and confirm the linked post is rendered there
  - navigate to `My Posts`
  - confirm backend-backed summary totals update after the link write
  - confirm the newly linked post renders in the posts list
- extended `apps/mobile/scripts/run-creator-runtime-smoke.sh` so the runtime smoke:
  - derives a deterministic approved deliverable target from live backend seed data
  - injects expected post-summary totals after the runtime write
  - injects a deterministic external post id for the new linked post
  - launches Expo Go and opens the local Expo URL before Maestro takes over
- added a few runtime-stable mobile hooks where wrapped text was too brittle for assertion:
  - link-post form input ids
  - visible assignment-detail post marker keyed by `external_post_id`
  - visible `My Posts` row marker keyed by `external_post_id`

## Runtime Contract Proven

- creator can open a real approved assignment and enter the mobile `Link Post` flow
- creator can submit the minimum post-link payload through the live UI
- assignment detail refetches and renders the newly linked post after the write
- `My Posts` summary totals update from backend truth after the write
- `My Posts` renders the newly linked post after navigation/refetch
- existing tracked-post performance detail still works after the new link-post flow

## Notes

- this remains a small iOS Simulator smoke, not a full mobile e2e matrix
- the flow is intentionally seed-aware and still resets local data by default
- the app still needs to be opened once in Expo Go before the runtime script can clear the right experience storage
- this slice proves link-post creation and refresh truth, not a broader creator post-history redesign
