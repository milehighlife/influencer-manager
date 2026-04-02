# 2026-03-14 Influencer Post Summary Truth

## Scope

Hardened `My Posts` so the summary cards describe the full creator-scoped post result set, not only the first rendered page.

## Completed

- extended the influencer post list response with a backend-computed summary payload
- added creator-scoped post totals for:
  - linked posts
  - tracked posts with at least one snapshot
  - pending sync posts
  - latest tracked snapshot timestamp
- kept the post row list paginated and separate from summary truth
- updated `My Posts` to render summary cards from the backend summary instead of the current page length
- added creator-facing copy that explains when only the latest page of rows is being shown
- added service and mobile API tests for the new summary contract

## Notes

- no new endpoint was added; the existing `GET /influencer/posts` response now carries the truthful summary payload alongside paginated rows
- summary truth remains creator-scoped and organization-scoped server-side

## Follow-Up

- add mobile pagination controls if creators need to browse deep post history without narrowing the platform filter
- consider a richer creator post-history surface only if product needs more than the current paginated list plus summary truth
