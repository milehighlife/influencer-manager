# 2026-03-14 Influencer Status Digest Row Truth

## Summary

Hardened the creator `Status` row list so it is no longer reconstructed from bounded assignment and post pages. The mobile screen now reads a dedicated creator-scoped digest endpoint that returns the latest workflow signals in a deterministic bounded order.

## Why

Creator status counts were already truthful after the earlier summary consolidation, but the visible row list still depended on partial list queries:

- `assignments?page=1&limit=50`
- `posts?page=1&limit=50`

That meant the screen could miss newer or more relevant rows once a creator owned enough records to push signals beyond those page-local fetches.

## Decision

The `Status` screen remains a bounded latest-signals digest, not a history feed.

The row contract is now:

- creator-scoped
- tenant-scoped
- bounded by explicit `limit`
- ordered by latest signal timestamp descending
- not a promise of full history

## Backend Contract

Added:

- `GET /influencer/status-digest`

Response shape:

```json
{
  "items": [
    {
      "id": "post-metrics-post-1",
      "type": "post_metrics_available",
      "title": "Metrics currently available",
      "description": "Current instagram performance counts are available for your linked post.",
      "updated_at": "2026-03-13T14:00:00.000Z",
      "badge_status": "active",
      "badge_label": "Tracked",
      "attention": false,
      "destination": {
        "type": "post",
        "post_id": "post-1",
        "post_url": "https://instagram.com/p/demo"
      }
    }
  ],
  "limit": 20,
  "attention_count": 2
}
```

Supported signal types:

- `assignment_awaiting_acceptance`
- `submission_in_review`
- `assignment_approved`
- `assignment_revision_required`
- `assignment_completed`
- `post_linked`
- `post_metrics_available`

## Implementation Notes

- assignment signals come from creator-owned assignments in relevant lifecycle states
- linked-post signals come from creator-owned posts
- metrics signals come from latest tracked snapshots per creator-owned post
- all rows are merged and sorted by `updated_at` descending, with `id` as the tiebreaker
- the attention badge count remains separate so the tab badge stays truthful even when row items are bounded

## Outcome

- creator status rows no longer depend on whichever paginated assignment/post pages were already fetched
- the screen copy now explicitly describes bounded latest signals
- the row list is truthful, deterministic, and scalable without pretending to be full history
