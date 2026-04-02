# Roadmap

This roadmap reflects the current codebase state as of March 12, 2026 and separates completed foundations from the next recommended delivery phases.

## Completed Foundation

The following platform foundations are already implemented:

- multi-app monorepo structure
- Prisma PostgreSQL schema and migrations
- tenant-scoped NestJS API modules
- JWT auth and role-aware access control
- campaign planning workflows
- assignment and deliverable execution workflows
- post tracking and raw performance snapshots
- BullMQ and Redis job foundation
- placeholder platform adapter architecture
- import logs and audit logs
- persisted reporting summaries and dashboard read endpoints
- Expo mobile shell with auth, navigation, and campaign visibility
- first influencer workspace slice on mobile for self-service assignment execution
- real local validation against PostgreSQL and Redis

## Phase 1: Staging Hardening

Goal:

Move from local validation to a stable staging environment.

Primary work:

- deploy PostgreSQL, Redis, API, and worker processes in staging
- run full migration and seed verification outside local development
- add deployment health checks and operational monitoring
- formalize environment configuration and secret management
- validate mobile builds against staging API

Success criteria:

- staging API and workers run continuously
- metric sync jobs succeed and fail cleanly in staging
- mobile app can browse live staged data
- core reports match raw snapshot calculations

## Phase 2: Product Workflow Completion

Goal:

Extend the current planning and execution foundation into a usable day-to-day operations product.

Primary work:

- expand the influencer workspace beyond the first self-service slice
- improve assignment, deliverable, post linking, and review UX
- support more operational filters and saved views
- add company, campaign, and influencer management polish
- improve audit visibility for internal users

Success criteria:

- internal users can manage a campaign from planning through post linkage
- review workflows are usable from client applications, not just API calls
- organization admins can oversee campaign execution without direct database inspection

## Phase 3: Platform Integration Expansion

Goal:

Move from placeholder ingestion adapters to real provider integrations.

Primary work:

- implement provider credential management
- add platform-specific auth and token refresh flows
- replace mock adapter responses with real API ingestion
- normalize provider-specific metric payloads
- improve import logging and retry controls

Success criteria:

- supported platforms can fetch live post metrics
- ingestion jobs are observable and retryable
- raw metrics remain traceable to provider responses

## Phase 4: Analytics Maturity

Goal:

Expand beyond first-pass summaries into stronger reporting and decision support.

Primary work:

- add richer campaign, mission, and influencer breakdowns
- introduce more explicit comparison windows and trend reporting
- define financial and efficiency metrics only after source inputs are agreed
- improve summary refresh orchestration
- harden reconciliation between stored summaries and raw snapshots

Success criteria:

- reporting remains explainable from raw data
- stakeholders can trust campaign and influencer performance rollups
- summary drift can be detected and corrected automatically

## Phase 5: Multi-Channel Product Expansion

Goal:

Broaden product usefulness without compromising data clarity.

Primary work:

- add web-facing workflow experiences if web becomes the primary ops surface
- expand influencer relationship management features
- support additional content and account models such as platform accounts
- evaluate multi-organization membership if required by real customer demand
- add export, scheduling, and operational collaboration features

Success criteria:

- the product supports broader operational teams without weakening tenant safety or reporting lineage

## Ongoing Constraints

The roadmap should continue to respect these implementation boundaries:

- keep raw snapshots as the source of truth
- keep influencer participation explicit through assignments
- keep platform-specific logic outside core domain services
- avoid adding derived financial metrics before source inputs and definitions are fixed
- avoid weakening organization-scoped access for convenience
