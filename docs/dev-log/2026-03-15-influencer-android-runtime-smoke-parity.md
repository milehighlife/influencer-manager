# 2026-03-15 Influencer Android Runtime Smoke Parity

## Summary

Extended the existing Maestro-based creator runtime smoke workflow to support Android runtime targets in addition to the existing iOS Simulator path.

This pass stayed intentionally narrow:

- no new creator features
- no backend contract changes
- no workflow redesign
- no tenant or creator-ownership changes

## Why

The creator workspace already had a strong iOS runtime smoke path proving:

- login
- `Status` digest rendering
- assignment list/detail/back continuity
- deliverable submission
- rejected resubmit flow
- approved assignment continuity
- link-post creation
- `My Posts` summary/list refresh after linking
- post-performance detail

The next remaining runtime-confidence gap was platform parity. The same creator workflow contract needed to be runnable through Android runtime automation without creating a second product workflow.

## What Changed

- generalized `apps/mobile/scripts/run-creator-runtime-smoke.sh` so it can target:
  - iOS Simulator
  - Android emulator or connected Android device
- kept one shared Maestro creator flow and generated the correct Expo Go `appId` per platform at runtime
- added Android runtime setup steps in the runner:
  - detect `adb`
  - detect a booted emulator or connected device
  - verify Expo Go is installed
  - run `adb reverse` for `8081` and `3000`
  - clear Expo Go app data so creator login stays deterministic
  - open the local Expo project URL in Expo Go
- replaced bottom-tab coordinate taps with stable tab button ids
- replaced back-navigation text taps with a shared back button id
- added a dedicated npm script for Android creator smoke execution

## Runtime Contract Proven

The Android creator smoke targets the same product-truth contract as the current iOS smoke:

- creator login through the real mobile UI
- bounded `Status` digest rendering
- `My Assignments` search, list rendering, detail navigation, and back continuity
- deeper creator write-path coverage through the existing submit/resubmit/link flows
- `My Posts` summary and list refresh truth after runtime navigation and writes
- post-performance detail navigation and rendering

## Notes

- This remains a small runtime smoke layer, not a full mobile device matrix.
- The Android path assumes a booted emulator or connected device with Expo Go installed.
- The runner still resets local seed data by default so write-path checks remain repeatable.
- The shared Maestro flow now relies on explicit tab and back-button ids instead of iOS-specific bottom-bar coordinates.
