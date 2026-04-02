# 2026-03-15 Influencer Digest Refresh Runtime Smoke

## Summary

Extended the creator Maestro runtime smoke to prove that `Status` refreshes to backend truth after creator write actions.

This pass stayed intentionally narrow:

- no new creator features
- no workflow redesign
- no digest history changes
- no tenant or creator-ownership changes

## Why

The creator workspace already had truthful digest semantics and runtime proof for:

- login
- assignment navigation
- deliverable submission
- rejected resubmission
- post linking
- `My Posts` refresh
- post-performance detail

The remaining runtime-confidence gap was whether `Status` actually refreshed after those writes, or whether the tab could show stale digest rows after navigation.

## What Changed

- invalidated `status-digest` on creator assignment start, deliverable submit, and post-link mutations
- added a focus-based refresh on `Status` so returning to the tab re-reads backend truth
- added deterministic digest row ids keyed by:
  - assignment signal type + assignment id
  - post signal type + post URL token
- extended the existing Maestro smoke to assert:
  - submit -> reviewer-waiting digest signal
  - rejected resubmit -> reviewer-waiting digest signal
  - post link -> linked-post digest signal

## Runtime Contract Proven

- `Status` remains a bounded latest-signals digest, not history
- creator writes update backend truth first
- returning to `Status` refreshes digest rows from backend truth
- the digest remains bounded and deterministic while still reflecting the new saved state
- runtime assertions now use stable digest row ids instead of wrapped text

## Notes

- the linked-post signal can sit lower in the digest than assignment-review signals, so the smoke now scrolls before asserting that row
- this slice verifies digest freshness after writes; it does not add unread semantics, push notifications, or a durable creator event feed
