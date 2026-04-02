# 2026-03-13 Influencer Notifications

## Scope

Built the next creator-focused mobile slice after revision UX and creator status signals: a lightweight in-app notification surface.

This pass stayed intentionally narrow:

- no push notifications
- no persistent read or unread model
- no schema changes
- no new workflow states
- no admin notification center

## Why This Step

The creator workspace already exposed:

- creator-friendly status labels
- rejected-state revision guidance
- assignment filtering
- post tracking visibility

The remaining product gap was visibility over time. Creators could see the current state of one assignment, but they still lacked a single place to answer:

- what changed recently
- whether a reviewer approved or rejected work
- whether a post was linked
- whether metrics were updated

## Data Sources Used

This feed is derived from existing creator-scoped mobile data:

- `GET /influencer/assignments`
- `GET /influencer/posts`

No backend endpoint or database model was added.

The feed uses existing timestamps already exposed by those resources:

- assignment `assigned_at`
- assignment `updated_at`
- post `posted_at`
- latest snapshot `captured_at`

## UX Decisions

- Added an `Updates` tab to the influencer mobile navigator.
- Kept the tab badge lightweight and attention-based instead of pretending to be a true unread count.
- Used creator-friendly event titles such as:
  - `New assignment received`
  - `Deliverable approved`
  - `Changes requested`
  - `Post linked successfully`
  - `Metrics updated`
- Deep-linked feed items back to assignment detail or post performance where the next useful destination already existed.
- Kept the existing `My Assignments` and `My Posts` surfaces intact instead of merging them into a larger inbox redesign.

## Screens Touched

- `AppNavigator.tsx`
- `CreatorUpdatesScreen.tsx`
- `creator-workspace.ts`
- `use-influencer-workspace-queries.ts`

## Backend Changes

None.

This slice was intentionally implemented as a mobile-only derived feed because the existing creator-scoped data already supported it.

## Deferred

- persistent read/unread state
- push notifications
- finer event precision from audit logs
- real-time delivery
- richer creator trend/history views beyond the latest snapshot event
