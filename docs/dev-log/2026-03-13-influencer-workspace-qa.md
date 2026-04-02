# 2026-03-13 Influencer Workspace QA

## QA Scope

Validated the first influencer mobile workspace slice against the seeded creator account:

- email: `nina@creatormail.example`
- password: `CreatorPass123!`

Target flow:

- Login
- My Assignments
- Assignment Detail
- Submit Deliverable
- Link Post
- My Posts
- Post Performance

## Issues Found

### Fixed

- detail screens had no explicit back navigation, which made the creator flow depend on gestures
- metric rows could collapse creator-facing labels when the value text was long
- creator-facing copy still used admin-leaning login language
- the original creator seed only exposed one approved assignment, which made it impossible to validate accept, start, submit, and rejected-state behavior
- the reseed path broke after linking `users` to `influencers` because delete order no longer respected the new foreign key
- assignment detail continued to present generic post-link copy even when a deliverable already had a linked post

### Deferred

- the mobile UI still does not explain multi-post deliverables deeply, even though the domain model allows them
- creator-facing notification or badge behavior for review outcomes is still out of scope for this pass

## Product Decisions Reinforced

- creator access remains organization-scoped and linked to one influencer profile
- creators only see assignments, deliverables, posts, and performance that belong to their linked influencer
- raw snapshots remain the source of truth for creator-visible metrics
- creator workflow states continue to follow the canonical assignment lifecycle

## Follow-Up Priorities

1. add creator-facing review outcome notifications or badges
2. add clearer multi-post guidance in post-linking flows
3. add richer post history and trend views beyond the latest snapshot plus summary
