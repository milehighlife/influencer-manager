# 2026-03-14 Influencer Assignment Summary Consolidation

## Scope

Replaced the creator’s multiple independent per-status count queries with one shared backend assignment summary payload.

## Completed

- extended the influencer assignment list response with a creator-scoped summary payload
- added status counts for all canonical assignment states
- updated `My Assignments` to render top review-state cards from the shared summary payload
- updated `Status` to use the same shared assignment summary instead of separate count queries
- removed the mobile multi-query count fan-out that previously fetched one list request per status card group
- updated copy on `My Assignments` so the summary card describes current state rather than “what changed most recently”
- added service and mobile API tests for the shared summary contract

## Notes

- this slice reduced request volume and eliminated the old card-to-card mismatch risk caused by separate status queries
- the visible assignment queue is still its own paginated read, but the creator-facing summary source is now singular and truthful

## Follow-Up

- if product later wants queue and summary to refresh atomically in one mobile request everywhere, consider a dedicated creator workspace aggregate response
- keep future creator count surfaces on shared backend summaries rather than reintroducing per-status list fan-out
