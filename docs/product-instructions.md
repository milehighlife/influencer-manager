# Product Instructions

## Documentation Discovery

Start with [docs/README.md](README.md) before implementation work.

Use it to find the canonical reference docs for product rules, domain model, workflow states, analytics behavior, and operational guidance.

If a document in `docs/` is added or updated, update `docs/README.md` in the same change.

## Product Purpose

Influencer Campaign Manager is a multi-tenant SaaS platform for planning, executing, and measuring influencer campaigns.

The current product scope supports:

- organization-scoped users and roles
- influencer-linked authenticated users
- clients and companies
- campaign planning through missions and actions
- influencer assignment workflows
- deliverable review
- published post tracking
- raw performance snapshot storage
- first-pass dashboard summaries
- mobile influencer self-service for assignments, deliverables, posts, and basic post metrics

The system is designed so campaign attribution remains explicit from planning through reporting.

## Core Hierarchy

The operational hierarchy is:

Organization -> Client -> Company -> Campaign -> Mission -> Action -> Action Assignment -> Deliverable -> Post -> Performance Snapshot

Influencers exist independently of campaigns and only participate through `action_assignments`.

Campaigns belong to companies, not directly to clients.

## Product Principles

- Preserve explicit relationships for reporting accuracy.
- Keep every operational record organization-scoped.
- Treat raw performance snapshots as the source of truth.
- Keep workflow state changes auditable.
- Prefer simple, service-enforced business rules over implicit behavior.

## Current User Roles

The current backend supports these roles:

- `organization_admin`
- `campaign_manager`
- `campaign_editor`
- `analyst`
- `viewer`
- `influencer`

Operationally:

- `organization_admin` has full organization access.
- `campaign_manager` can create and manage planning and execution records.
- `campaign_editor` exists in the shared auth model for future scoped write access.
- `analyst` is read-focused and intended for reporting access.
- `viewer` is read-only.
- `influencer` is limited to self-service access for that user’s linked influencer profile.

## Planning Decisions

Campaign planning is structured intentionally:

- campaigns group work for a company
- missions break a campaign into stages or objectives
- actions define specific platform tasks
- influencers are attached to actions through assignments only

The planning API supports nested views so mobile and web clients can render:

- campaign
- company
- missions
- actions
- assignments
- influencer summaries

## Execution Decisions

Execution currently supports:

- assignment acceptance and progress tracking
- deliverable submission using metadata and URL-based placeholders
- internal review approval or rejection
- post linkage after publication
- influencer-scoped mobile self-service for assignments, deliverables, posts, and post metrics

The current implementation does not include:

- file storage providers
- external provider auth flows
- advanced workflow automations

## Reporting Decisions

Reporting is based on raw `performance_snapshots` and persisted summary tables.

Current summary levels:

- post
- action
- mission
- campaign
- influencer

Current dashboard metrics focus on:

- total impressions
- total engagement
- engagement rate
- total posts
- total influencers
- last snapshot timestamp

## Architecture Boundaries

Platform-specific ingestion logic must stay outside core domain services.

The current architecture separates:

- core campaign and execution services
- platform integration adapters
- BullMQ job orchestration
- import logging
- analytics aggregation

## Current Non-Goals

The codebase does not yet implement:

- live social platform credentials and auth flows
- advanced attribution modeling
- full analytics dashboards or charting UI
- background analytics pipelines beyond first-pass aggregation
