# Mobile App

Expo-based React Native application for campaign operations, creator workflows, and performance visibility.

## Environment

- `EXPO_PUBLIC_API_URL`: API host or full API base. `http://localhost:3000` and `http://localhost:3000/api` both work.

## Structure

- `src/components`: Reusable UI building blocks
- `src/screens`: Screen-level views
- `src/navigation`: Navigation stacks and route definitions
- `src/hooks`: Shared React hooks
- `src/services`: API client modules and session helpers
- `src/state`: Zustand auth state
- `src/providers`: Query and app-level providers

## Current Scope

- Login and authenticated app shell
- Campaign list and campaign planning detail
- Mission and action drill-down views
- Influencer roster screen
- Assignment detail screen

## Runtime Smoke

The mobile creator runtime smoke uses Maestro against Expo Go on both iOS Simulator and Android emulator/device targets.

Local workflow:

1. In one terminal, start Expo for the target platform:
   - iOS: `cd apps/mobile && npx expo start --ios --host localhost`
   - Android: `cd apps/mobile && npx expo start --android --host localhost`
2. In another terminal, run the creator smoke:
   - iOS: `npm run test:runtime:creator --workspace @influencer-manager/mobile`
   - Android: `npm run test:runtime:creator:android --workspace @influencer-manager/mobile`

The smoke script:

- verifies the local API and Expo dev server are running
- reseeds the local database by default so the creator workflow write paths stay repeatable
- clears the creator app session before launch so login stays deterministic:
  - iOS clears the creator experience storage inside Expo Go
  - Android clears Expo Go app data on the target runtime device
- launches Expo Go and opens the local Expo project URL before runtime assertions begin
- signs in with the seeded creator account
- verifies `Status`, `My Assignments`, assignment detail/back continuity, and `My Posts`
- verifies a real in-progress deliverable submission
- verifies `Status` refreshes to the updated backend digest after deliverable submission
- verifies a rejected assignment reopen-and-resubmit flow
- verifies `Status` refreshes to the updated backend digest after rejected resubmission
- verifies a real approved-deliverable post-link write and assignment-detail refresh
- verifies `Status` refreshes to the updated backend digest after the post-link write
- verifies `My Posts` summary/list refresh after the post-link write
- verifies post-performance detail navigation and rendering

To skip the automatic local reseed, set `RESET_CREATOR_RUNTIME_SEED=0` before running the smoke command.

Android-specific notes:

- the Android smoke expects a booted emulator or connected device with Expo Go installed
- the runner uses `adb reverse` for `8081` and `3000` so the same localhost Expo/API workflow stays valid on Android
