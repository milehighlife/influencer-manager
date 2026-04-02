You are working inside the Influencer Campaign Manager monorepo.

Your role is to implement features while strictly following the architecture and domain rules defined in the documentation.

Before making any changes you MUST read these documents:

docs/product-instructions.md
docs/pre-production-checklist.md
docs/domain-glossary.md
docs/erd.md
docs/lifecycle-state-diagrams.md
docs/metrics-catalog.md
docs/analytics-layer.md
docs/tenant-isolation.md
docs/roadmap.md

These documents define the system architecture and are the source of truth.

Never invent architecture or relationships that conflict with these documents.

If code conflicts with the documentation, prefer the documentation and flag the discrepancy.

---

PROJECT OVERVIEW

This system is a multi-tenant influencer campaign management platform.

The application allows organizations to:

- manage clients
- manage brands or companies
- create campaigns
- break campaigns into missions
- define influencer actions
- assign influencers to actions
- collect deliverables
- track published posts
- import platform metrics
- generate analytics and reporting

Campaigns are modular and structured.

Hierarchy:

Organization
Client
Company
Campaign
Mission
Action
ActionAssignment
Deliverable
Post
PerformanceSnapshot

Influencers participate in campaigns through ActionAssignments.

Influencers must never be directly attached to campaigns or missions.

---

SYSTEM ARCHITECTURE

The repository is a monorepo with the following structure:

apps/
    mobile/     → React Native Expo app
    api/        → NestJS backend

packages/
    shared/     → shared types and validation

db/
    schema
    migrations
    seeds

docs/
    architecture documentation

infrastructure/
    docker
    scripts
    deployment

---

TECHNOLOGY STACK

Mobile:
React Native
Expo
TypeScript

Backend:
NestJS
TypeScript

Database:
PostgreSQL

Jobs:
Redis
BullMQ

Analytics:
PostgreSQL aggregates
Materialized views or summary tables

---

TENANT ISOLATION RULE

Every operational table must contain:

organization_id

Every query must filter by organization_id.

Users must never access data outside their organization.

Never trust organization_id provided by client requests.

Always derive organization context from authenticated user.

---

DATA MODEL RULES

clients belong to organizations

companies belong to clients

campaigns belong to companies

missions belong to campaigns

actions belong to missions

influencers belong to organizations

action_assignments connect influencers to actions

deliverables belong to action_assignments

posts belong to deliverables

performance_snapshots belong to posts

influencer_ratings belong to influencers and campaigns

influencer_notes belong to influencers

---

CAMPAIGN STRUCTURE RULE

Campaigns are modular and mission-based.

Campaign
  → Missions
      → Actions
          → ActionAssignments
              → Deliverables
                  → Posts
                      → PerformanceSnapshots

Assignments represent influencer participation.

Mission participation is derived from assignments.

Campaign participation is derived from assignments.

---

LIFECYCLE STATES

Campaign states:

draft
planned
active
paused
completed
archived

Mission states:

planned
active
completed

Action states:

draft
scheduled
active
awaiting_submission
under_review
completed

Assignment states:

assigned
accepted
in_progress
submitted
approved
rejected
completed

State transitions must follow lifecycle-state-diagrams.md.

Do not allow illegal state transitions.

Log all state transitions in audit_logs.

---

METRICS RULES

Raw platform metrics must be preserved.

Examples:

impressions
likes
comments
shares
views
reach

Derived metrics must never overwrite raw metrics.

Examples:

engagement_rate
cost_per_engagement
campaign_roi

Derived metrics should be calculated in analytics layers.

---

ANALYTICS LAYER

Operational tables should not power dashboards directly.

Analytics pipeline:

Operational tables
→ Performance snapshots
→ Aggregation tables
→ Dashboard queries

Example aggregation tables:

post_performance_summary
action_performance_summary
mission_performance_summary
campaign_performance_summary
influencer_performance_summary

---

BACKGROUND JOBS

Background workers handle:

metric imports
platform sync
analytics aggregation

Use BullMQ queues.

Do not perform long-running work in API request handlers.

---

PLATFORM INTEGRATIONS

External platforms include:

Instagram
TikTok
YouTube
Twitter/X

Platform integrations must be implemented using adapter patterns.

Adapters should expose methods such as:

fetchPostMetrics()
normalizeMetrics()
validatePayload()

Do not mix platform-specific logic with core domain services.

---

CODE QUALITY RULES

Always prefer:

clear naming
explicit relationships
service-layer business logic
small functions
predictable architecture

Avoid:

deep controller logic
business logic in DTOs
cross-module coupling

Controllers call services.

Services contain business logic.

Repositories handle database access.

---

DATABASE RULES

Every operational table must include:

id
organization_id
created_at
updated_at

Use explicit foreign keys.

Add indexes for:

organization_id
campaign_id
mission_id
action_id
influencer_id
post_id

---

API DESIGN

Use REST endpoints.

Support:

pagination
filtering
sorting

List endpoints should support:

page
limit

Example:

GET /campaigns
GET /missions
GET /actions
GET /influencers

---

DEVELOPMENT APPROACH

When implementing a feature:

1. Identify entities involved.
2. Confirm relationships from ERD.
3. Confirm lifecycle states if applicable.
4. Implement service-layer logic.
5. Add validation and DTOs.
6. Ensure tenant isolation.
7. Add audit logging where relevant.
8. Add tests if the repo supports them.

Never skip domain validation.

---

WHAT YOU SHOULD NOT DO

Do not invent new entities unless the docs explicitly require them.

Do not bypass tenant isolation.

Do not attach influencers directly to campaigns.

Do not mix analytics logic with operational services.

Do not implement platform-specific logic outside the integration layer.

Do not introduce breaking schema changes without migration scripts.

---

WHEN IN DOUBT

If a requested change conflicts with documentation:

Stop.

Explain the conflict.

Ask for clarification before proceeding.

---

OUTPUT STYLE

Prefer small commits and incremental changes.

When generating code:

Explain what files are being created or modified.

Keep code readable and production-ready.

Do not add unnecessary complexity.