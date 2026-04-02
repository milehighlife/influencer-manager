# Influencer Workspace

This feature spec covers the first mobile self-service slice for authenticated influencers.

Canonical references:

- [Product Instructions](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/product-instructions.md)
- [Domain Glossary](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/domain-glossary.md)
- [Lifecycle State Diagrams](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/lifecycle-state-diagrams.md)
- [Tenant Isolation](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/tenant-isolation.md)
- [Analytics Layer](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/analytics-layer.md)
- [Metrics Catalog](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/metrics-catalog.md)

## Goal

Provide a mobile-first workspace where an authenticated influencer can:

- view only their own assignments
- open assignment details and instructions
- accept or start work when the lifecycle allows it
- submit deliverables
- link approved deliverables to published posts
- review their linked posts and basic post-level metrics

## Scope

This slice is limited to:

- influencer-scoped assignment list and detail
- deliverable submission using text and URL metadata
- post linkage to approved deliverables
- post performance read access using existing reporting summaries

This slice does not add:

- file uploads
- external provider authentication
- influencer-side analytics dashboards beyond post-level metrics
- multi-influencer accounts or public creator signup

## Backend Contract

The mobile app uses these influencer-scoped endpoints:

- `GET /influencer/assignments`
- `GET /influencer/assignments/:id`
- `GET /influencer/status-digest`
- `POST /influencer/assignments/:id/accept`
- `POST /influencer/assignments/:id/start`
- `POST /influencer/assignments/:id/deliverables`
- `POST /influencer/deliverables/:id/posts`
- `GET /influencer/posts`
- `GET /influencer/posts/:id/performance`

All requests remain JWT-authenticated and organization-scoped. Ownership is enforced by the authenticated user’s linked `influencer_id`, not by client-provided ids.

Current read-model notes:

- `GET /influencer/assignments` returns paginated assignment rows plus a creator-scoped status summary used by mobile review-state cards
- `GET /influencer/status-digest` returns a bounded creator-scoped digest of the latest workflow signals ordered by `updated_at`-style signal timestamps
- `GET /influencer/posts` returns paginated post rows plus a creator-scoped post summary used by `My Posts`
- the row list and the summary are related but not interchangeable:
  - summaries represent the full backend-scoped result set for their contract
  - row lists remain paginated

## Mobile Surface

The influencer workspace uses a dedicated role-aware mobile navigator with:

- `Status`
- `My Assignments`
- `Assignment Detail`
- `Submit Deliverable`
- `Link Post`
- `My Posts`
- `Post Performance`

The manager workflow surface remains separate.

## Supported Creator Flow Today

The currently supported creator journey is:

1. sign in with an influencer-linked user account
2. review creator-owned assignments in `My Assignments`
3. open assignment detail for brief, status, deliverables, and linked posts
4. accept or start work when the assignment state allows it
5. submit URL-based or note-based deliverables while the assignment is `in_progress`
6. link published posts from approved deliverables
7. review linked posts in `My Posts`
8. review post-level metrics in `Post Performance`
9. monitor current review outcomes and creator-actionable status from `Status`, badges, filtered queues, and status summaries

## State-Based Behavior

- `assigned`: the creator can accept the assignment
- `accepted`: the creator can start work
- `in_progress`: the creator can submit deliverables
- `submitted`: the creator sees creator-facing "Awaiting Review" status signals but cannot submit again yet
- `approved`: the creator can link published posts and sees approved-state cues that post linkage is the next valid step
- `rejected`: the creator can resume work, review rejection context, and resubmit after returning to `in_progress`
- `completed`: the creator can review linked posts and performance, but the assignment no longer needs action

## Rejected / Revision Workflow

When an assignment is rejected, the mobile UI now surfaces a dedicated revision section instead of relying only on a badge or a generic status line.

Current rejected-state behavior:

- creator sees a `Changes Requested` review signal
- latest reviewer feedback is shown as creator-facing copy
- previous submission and latest deliverable update timestamps are shown when available
- the UI explains the next valid sequence:
  - review the requested changes
  - resume the assignment
  - update the work
  - resubmit for review
- a `Resubmit Deliverable` CTA reopens the assignment and routes directly into the submission screen

This preserves the canonical lifecycle rule that rejected work must return to `in_progress` before a new submission is made.

## Creator Review Signals

The mobile creator surface currently uses lightweight, workflow-derived signals instead of a persistent read/unread notification platform.

Current signals include:

- creator-friendly status labels such as `Awaiting Review` and `Changes Requested`
- `Status`, a creator-only bounded latest-signals digest backed by a dedicated creator-scoped endpoint
- assignment summary cards for:
  - awaiting review
  - approved
  - changes requested
  - completed
- influencer-tab badge count for attention-needed creator updates
- assignment detail review-result cards
- post-history tracking state such as `Tracked` and `Pending`

These are presentation-only signals layered on top of the existing workflow states.

Current summary-count contract:

- creator review-state cards are backed by one shared backend assignment summary payload, not multiple independent per-status list reads
- this keeps the review-state cards consistent with one another and reduces mobile request fan-out
- the visible queue is still a separate paginated read, but the summary no longer races across multiple count sources

## Creator Status Digest

The current phase-1 status experience is a lightweight in-app `Status` digest.

Supported item types today:

- assignment awaiting acceptance
- submission currently in review
- approved and ready to post
- revision currently required
- assignment currently complete
- post currently linked
- metrics currently available for a linked post

Current behavior:

- the screen is creator-scoped and backed by `GET /influencer/status-digest`
- it does not introduce a new persistent event or notification model
- it does not implement persistent read or unread state
- it is not a durable event history feed and should not be read as “what changed recently”
- each row reflects a current workflow or tracking condition that is still true right now
- rows are intentionally bounded to a backend-enforced limit and ordered by the latest signal timestamp descending
- the timestamp shown on each row is the latest relevant record update or metric capture time, not a durable event-log timestamp
- the influencer-tab badge remains a lightweight attention-needed count, not a true unread count
- rows deep-link back to assignment detail or post performance when a clean destination exists
- the screen refetches on pull-to-refresh and when the Status tab regains focus so saved creator writes refresh backend truth

Current row source types:

- assignment awaiting acceptance
- submission currently in review
- approved and ready to post
- revision currently required
- assignment currently complete
- post currently linked
- metrics currently available

The digest is intentionally not complete history:

- it shows the latest bounded set of creator workflow signals
- it does not promise exhaustive historical coverage
- it no longer depends on whichever assignment or post rows happened to be fetched for adjacent paginated mobile screens

## Runtime Verification

The creator workspace now has a small runtime smoke layer in addition to unit/integration coverage.

Current runtime-smoke scope:

- launches Expo Go on iOS Simulator and Android emulator/device targets through the same Maestro smoke flow
- resets the local seeded creator dataset before the smoke unless explicitly disabled
- clears the creator app session before launch so login remains deterministic:
  - iOS clears the creator experience storage inside Expo Go
  - Android clears Expo Go app data on the target runtime device
- opens the local Expo project URL in Expo Go before runtime assertions begin
- signs in with the seeded creator account
- verifies `Status` renders backend-backed latest-signal rows and bounded digest copy
- verifies `My Assignments` search + filtered row visibility + detail navigation + back continuity
- verifies real deliverable submission changes assignment detail and queue state to reviewer-waiting truth
- verifies `Status` refreshes to the backend-backed reviewer-waiting signal after deliverable submission
- verifies rejected assignment revision context and the reopen-and-resubmit path
- verifies `Status` refreshes to the backend-backed reviewer-waiting signal after a rejected resubmission
- verifies real post-link creation from an approved deliverable and assignment-detail refresh after the write
- verifies `Status` refreshes to the backend-backed linked-post signal after a real post-link write
- verifies `My Posts` summary counts and rendered rows refresh truthfully after a real post-link write
- verifies `My Posts` summary cards, one rendered post row, and post-level performance detail after runtime navigation

Current workflow assumptions:

- local API is running
- Expo dev server is running from `apps/mobile`
- Expo Go is installed on the target runtime environment
- for iOS, the app has already been opened once in Expo Go so the runtime script can clear the correct Expo Go experience storage
- for Android, a booted emulator or connected device is available and `adb` can reach it
- the smoke resets the local seeded creator workflow state by default so submit/resubmit flows are repeatable

This smoke layer verifies real runtime navigation and network-backed rendering, but it is intentionally small:

- it does not replace backend or integration coverage
- it does not provide a full device-matrix or full creator workflow matrix

Summary-card behavior on adjacent screens:

- `Status` uses the shared assignment summary payload for creator review-state counts
- `My Assignments` uses the same summary payload for its top review-state cards
- `My Posts` uses a backend-computed summary for:
  - linked posts
  - with metrics
  - awaiting sync
  - latest tracked snapshot
- these summary cards do not derive totals from the current page of rows

## Revision Guidance UI

Creator revision guidance currently lives in two places:

- `Assignment Detail`
  - explains what happened
  - shows reviewer feedback
  - shows what to do next
  - exposes the `Resubmit Deliverable` action
- `Submit Deliverable`
  - carries forward the latest requested change
  - shows the previous submission date and latest deliverable update date
  - explains when submission is blocked because the assignment has not yet been resumed

## Current Known Limitations

- deliverable submission is metadata and URL based; file upload is not part of this slice
- post performance is currently post-level only; creator dashboards and trend views are out of scope
- post linkage can support more than one post per deliverable, but the mobile UI still explains the multi-post use case lightly rather than as a dedicated flow
- creator status rows are backed by a bounded latest-signals digest; there is still no persistent unread model, durable event history, or real-time delivery yet
- creator revision history is lightweight and derived from current deliverable records; there is no separate revision timeline model
- `My Assignments` and `My Posts` still show one paginated page of rows at a time on mobile
- when more matching rows exist than are shown in the current mobile page, the UI now states that explicitly instead of implying full in-memory completeness

## Workflow Rules

This feature reuses the canonical execution rules rather than redefining them:

- assignment transitions must remain legal
- posts can only be linked from approved deliverables
- post linkage preserves `ActionAssignment -> Deliverable -> Post -> PerformanceSnapshot` traceability
- raw snapshots remain the source of truth for displayed metrics

## Phase 2 Candidates

- richer creator history and metric trend views
- richer creator history behavior such as read state or a true durable event feed if product usage justifies it
- more explicit multi-post guidance for deliverables that produce more than one published post
- richer revision history if campaigns need a true versioned submission timeline
