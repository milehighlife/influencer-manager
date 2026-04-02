# Domain Glossary

## Core Tenant Terms

### Organization

The top-level tenant boundary. Every operational record belongs to exactly one organization.

### User

An authenticated user who acts within one organization and has one current role in that organization. A user may optionally be linked to an `Influencer` record for creator self-service access.

### Role

The authorization level attached to a user. Current roles are `organization_admin`, `campaign_manager`, `campaign_editor`, `analyst`, `viewer`, and `influencer`.

## Commercial Structure

### Client

The customer account managed by an organization.

### Company

A brand or business unit that belongs to a client. Campaigns are created under companies.

## Campaign Planning Terms

### Campaign

A marketing initiative for a company. Campaigns are the top-level planning and reporting unit inside the campaign workflow.

### Mission

A stage or objective inside a campaign. Missions segment campaign work into explicit phases.

### Action

A specific platform task inside a mission, such as an Instagram Reel, TikTok post, or YouTube review.

### Influencer

A long-lived creator profile owned by an organization. Influencers are reusable across campaigns.

An influencer may also be linked to a `User` record for authenticated mobile self-service.

### Action Assignment

The join entity between an action and an influencer. This is the only supported way an influencer participates in campaign work.

An assignment tracks:

- assignment status
- timing
- expected deliverable count
- submitted deliverable count

## Execution Terms

### Deliverable

A required asset or submission attached to an action assignment. Deliverables move through their own review status.

### Post

A published social post linked to a deliverable. Posts are the bridge between execution records and performance data.

### Performance Snapshot

An append-only record of raw platform metrics for a post at a point in time.

## Review and Evaluation Terms

### Influencer Rating

A structured campaign-level evaluation of an influencer across scoring dimensions such as quality, reliability, fit, communication, and brand safety.

### Influencer Note

A freeform internal note attached to an influencer for relationship history and context.

## Audit and Ingestion Terms

### Audit Log

An immutable record of state changes or important entity updates. Used for workflow traceability.

### Import Log

A record of an ingestion job attempt for a post. Tracks platform, status, timestamps, errors, and raw metadata.

## Analytics Terms

### Post Performance Summary

A persisted summary row for one post based on raw snapshots.

### Action Performance Summary

A persisted summary row that aggregates reporting data across posts linked to assignments under one action.

### Mission Performance Summary

A persisted summary row that aggregates reporting data across a mission.

### Campaign Performance Summary

A persisted summary row that aggregates reporting data across a campaign.

### Influencer Performance Summary

A persisted summary row that aggregates reporting data for one influencer across linked assignments and posts.

## Supporting Terms

### Organization-Scoped Access

The rule that application reads and writes must be filtered by `organization_id`, derived from authenticated context rather than client input.

### Planning View

A frontend-oriented nested campaign response that includes company, missions, actions, assignments, and influencer summaries.

### Raw Metrics

The platform counts stored exactly as collected in `performance_snapshots`.

### Derived Metrics

Metrics computed from raw values, such as engagement rate and aggregated summary totals.
