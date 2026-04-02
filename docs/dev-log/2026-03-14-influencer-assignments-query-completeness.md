# 2026-03-14 Influencer Assignments Query Completeness

## Scope

Moved creator assignment search and sort semantics out of the first fetched mobile page and into the backend influencer workspace read model.

## Completed

- extended the influencer assignment query contract with:
  - `search`
  - `sort_by`
- moved creator assignment search to the backend across:
  - campaign name
  - mission name
  - action title
  - platform
  - canonical assignment status strings
- moved creator assignment sorting to the backend for:
  - due date
  - recently updated
- updated `My Assignments` so search, status filtering, and sort operate against backend truth instead of page-local arrays
- updated subtitle and empty-state copy so the screen no longer implies full local completeness when only the first page of rows is shown
- preserved tenant scoping and creator ownership checks server-side

## Notes

- the mobile queue remains paginated
- this slice makes search/filter/sort truthful at scale without adding broader mobile pagination UX

## Follow-Up

- add mobile pagination controls if creator queue depth makes first-page browsing too limiting
- consider richer queue segmentation only if product needs more than truthful backend search/filter/sort
