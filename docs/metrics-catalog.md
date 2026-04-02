# Metrics Catalog

## Source of Truth

Raw platform metrics are stored in `performance_snapshots`.

Summary tables are derived from those snapshots and are intended for dashboard reads, not canonical storage.

## Raw Snapshot Metrics

Each snapshot stores:

- `impressions`
- `reach`
- `views`
- `video_views`
- `likes`
- `comments`
- `shares`
- `saves`
- `clicks`
- `conversions`
- `captured_at`

Supporting dimensions:

- `platform`
- `post_id`
- `organization_id`

## Summary Metrics

Current summary tables expose:

- `total_impressions`
- `total_engagement`
- `engagement_rate`
- `total_posts`
- `total_influencers`
- `last_snapshot_at`

Depending on the summary level, rows also include:

- `platform`
- `campaign_id`
- `mission_id`
- `action_id`
- `post_id`
- `influencer_id`

## Metric Definitions

### Total Impressions

The summed `impressions` from the snapshot rows included in the query or persisted summary scope.

### Total Engagement

The current implementation defines engagement as:

`likes + comments + shares + saves + clicks`

`conversions` are stored and queryable as raw data, but they are not currently part of `total_engagement`.

### Engagement Rate

The current implementation calculates:

`total_engagement / total_impressions`

If `total_impressions` is `0`, engagement rate is `0`.

### Total Posts

The count of distinct posts in scope.

Posts can be counted in stored summaries even when a post does not yet have a snapshot.

### Total Influencers

The count of distinct influencers represented by assignments and posts in scope.

### Last Snapshot At

The newest `captured_at` value among the raw snapshots in scope.

## Supported Report Filters

Current report endpoints support:

- `date_from`
- `date_to`
- `platform`
- `campaign_id`
- `influencer_id`

When filters are applied, summaries are computed from raw data for the filtered scope.

## Current Summary Levels

Persisted summary rows exist for:

- post
- action
- mission
- campaign
- influencer

## Current Caveats

- snapshot storage is append-only
- summary rows are refreshed on write and on demand
- raw snapshots remain the authoritative historical record
- advanced financial metrics such as ROI and cost-per-engagement are not yet implemented
