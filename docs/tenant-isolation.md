# Tenant Isolation

## Tenant Model

The system is single-database, multi-tenant. `Organization` is the tenant boundary.

Every operational table includes `organization_id`.

## Authorization Source of Truth

The API does not trust `organization_id` from request bodies for authorization.

Authenticated requests resolve:

- current user
- current organization
- current role
- linked influencer profile when the authenticated role is `influencer`

This context is derived from the JWT payload and enforced in guards and service-layer queries.

## Request Enforcement

`organization-context.guard` injects the current organization context into the request.

Service methods then scope all reads and writes by `organization_id`.

This means a valid record id is not enough to gain access if the record belongs to another organization.

## Schema Enforcement

Tenant safety is reinforced at the database level through composite relations that include:

- `organization_id`
- entity `id`

This prevents cross-tenant foreign key references between parent and child records.

Examples:

- company must belong to the same organization as its client
- campaign must belong to the same organization as its company
- action assignment must belong to the same organization as both its action and influencer
- post and performance snapshot lineage must stay inside one organization

## Operational Tables

Current operational tables carrying `organization_id` include:

- users
- clients
- companies
- campaigns
- missions
- actions
- influencers
- action_assignments
- deliverables
- posts
- performance_snapshots
- influencer_ratings
- influencer_notes
- audit_logs
- import_logs

Summary tables are also organization-scoped so report reads remain tenant-safe.

## Role Enforcement

Tenant isolation and authorization are related but separate:

- tenant isolation answers which organization data a user may touch
- roles answer what actions that user may perform inside that organization

Examples:

- `viewer` can read organization-scoped data but cannot mutate planning workflows
- `campaign_manager` can create and update planning and execution records in their organization
- `organization_admin` has broad access inside the organization
- `influencer` can only access assignments, deliverables, posts, and performance tied to that user’s linked influencer profile inside the organization
- generic internal read surfaces such as `/campaigns`, `/users`, and `/reports/*` are not creator-facing endpoints and are restricted by role metadata at the route level

## Practical Query Rules

The current implementation follows these rules:

- every list endpoint filters by authenticated `organization_id`
- every single-record lookup includes `organization_id`
- parent-child validation is performed inside the same organization scope
- reports and summaries only read rows for the authenticated organization
- route-level role checks now explicitly protect generic organization read endpoints so authenticated influencer users cannot access internal campaign, user, or report surfaces

## Current Limitation

The current auth model is single-organization-per-user. A separate multi-membership join table is not implemented yet.
