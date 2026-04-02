# Analytics Layer

## Current Scope

The analytics layer is intentionally narrow in the current implementation. It supports raw snapshot ingestion, persisted summary refresh, and dashboard-oriented read endpoints.

## Layer Structure

### Operational Layer

The operational system produces the entities that reporting depends on:

- campaigns
- missions
- actions
- action assignments
- deliverables
- posts

### Snapshot Layer

`performance_snapshots` store raw platform counts for a post at a point in time.

Design decisions:

- snapshots are append-only
- historical values are preserved
- raw rows are the source of truth for later recalculation

### Ingestion Layer

Background job infrastructure exists through BullMQ and Redis.

Current queues:

- `metric_sync`
- `post_refresh`
- `campaign_aggregation`

Current platform adapter placeholders exist for:

- Instagram
- TikTok
- YouTube
- Twitter/X

The adapters currently return validated placeholder metrics. Live provider auth and credentials are not implemented yet.

### Import Tracking Layer

`import_logs` record each ingestion attempt and capture:

- organization
- platform
- post
- queue status
- timestamps
- error details
- raw metadata

### Aggregation Layer

Persisted summaries are stored for:

- post performance
- action performance
- mission performance
- campaign performance
- influencer performance

Aggregation currently rolls up raw snapshot data into:

- total impressions
- total engagement
- engagement rate
- total posts
- total influencers
- last snapshot timestamp

### Reporting Layer

Current report endpoints:

- `GET /reports/posts/:id/summary`
- `GET /reports/actions/:id/summary`
- `GET /reports/missions/:id/summary`
- `GET /reports/campaigns/:id/summary`
- `GET /reports/influencers/:id/summary`
- `POST /reports/campaigns/:id/refresh-summary`

## Refresh Strategy

The current system uses a hybrid refresh model:

- refresh on snapshot creation
- refresh on post creation and post changes
- refresh on explicit campaign summary requests
- refresh on read when a stored summary is missing

This keeps dashboard reads fast without treating summary rows as the canonical source.

## Traceability Rules

Reporting is intended to remain traceable all the way back to raw post snapshots.

The current implementation preserves traceability by:

- keeping snapshots immutable
- keeping the post-to-deliverable-to-assignment lineage explicit
- keeping influencer participation explicit through assignments
- separating platform adapters from core domain services

## Current Boundaries

Not implemented yet:

- live provider credential management
- advanced attribution models
- materialized views managed by the database
- charting or visualization layers
- multi-step warehouse-style transformations

The current design is an operational reporting foundation, not a full analytics warehouse.
