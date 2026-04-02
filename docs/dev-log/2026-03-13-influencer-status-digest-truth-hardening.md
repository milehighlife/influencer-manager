# 2026-03-13 Influencer Status Digest Truth Hardening

## Scope

Hardened the creator mobile `Updates` surface so it no longer implies a recent activity timeline that the backend does not actually persist.

This pass stayed intentionally narrow:

- no new backend event model
- no unread state
- no push notifications
- no new workflow states
- no changes to creator ownership or tenant boundaries

## Why This Step

The existing mobile `Updates` tab was derived from current assignment and post state on every load, but the UI still used language like:

- `Recent creator updates`
- `No recent updates`
- `activity trail`

That wording implied a durable or recent event feed even though the screen was actually a current-state reconstruction.

The truthful fix was to stop presenting current-state rows as recent history.

## Decision

The screen is now a **current-state digest**, not a recent activity feed.

That means:

- each row reflects a workflow or tracking condition that is true right now
- the screen answers “what currently needs attention” and “what status exists right now”
- it does **not** answer “what changed since I last checked?”

## Data Source

The screen still uses the existing creator-scoped mobile reads:

- `GET /influencer/assignments`
- `GET /influencer/posts`

No backend endpoint or schema change was added in this pass.

That was intentional: the codebase does have audit logs, but it does not yet expose a clean creator-facing durable history model that would make “recent updates” truthful.

## UX / Copy Changes

- Renamed the visible tab and screen title from `Updates` to `Status`
- Replaced recent-activity wording with current-state wording
- Changed row titles to current-state language such as:
  - `Assignment awaiting acceptance`
  - `Submission currently in review`
  - `Approved and ready to post`
  - `Revision currently required`
  - `Post currently linked`
  - `Metrics currently available`
- Changed row timestamps to read as `Last updated ...` instead of implying an event just happened
- Updated empty-state and guidance copy to explain that the screen reflects what is currently true, not a durable event history

## Code Shape Changes

- Renamed the mobile helper/query semantics from notification/feed language to status/digest language
- Kept the existing creator attention-count behavior, but framed it as “needs action now” instead of unread/recent activity

## Backend Changes

None.

This was a product-truth and mobile read-model correction, not a backend event-feed implementation.

## Deferred

- a true creator-visible durable activity/event feed
- explicit creator history semantics backed by audit-log or event records
- unread/read state
- push notifications
