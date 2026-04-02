# Pre-Production Checklist

This checklist is for moving the current codebase from local validation into a production-ready deployment posture.

## Environment and Infrastructure

- Confirm production `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `EXPO_PUBLIC_API_URL`, and Redis connection settings are set per environment.
- Run Prisma migrations against a non-local staging PostgreSQL instance.
- Verify Redis is available for worker-enabled environments.
- Separate API and worker process configuration if workers will not run inside the web process.
- Confirm backup and restore procedures for PostgreSQL before first production data load.

## Authentication and Access Control

- Replace seed credentials and ensure no seeded users are deployed to production.
- Rotate `JWT_SECRET` to a strong production secret.
- Confirm role mappings for `organization_admin`, `campaign_manager`, `campaign_editor`, `analyst`, and `viewer`.
- Review all write endpoints to ensure `viewer` and other read-only roles cannot mutate organization data.
- Confirm organization context is always resolved from authenticated context, not request payloads.

## Tenant Safety

- Validate that all production queries remain organization-scoped.
- Smoke test cross-tenant access denial for list, detail, workflow, and report endpoints.
- Review any direct Prisma usage added after this checklist to ensure `organization_id` filtering is present.
- Verify composite tenant-safe foreign keys are present in the deployed schema.

## Workflow Integrity

- Validate lifecycle transitions for campaigns, missions, actions, assignments, and deliverables in staging.
- Confirm rejection flows preserve review reason and allow work to re-enter execution where intended.
- Verify assignment completion only occurs after approval and post linkage requirements are met.
- Confirm audit log entries are written for assignment and deliverable review actions.

## Reporting and Analytics

- Validate summary refresh behavior after post create, update, delete, and snapshot creation.
- Confirm report endpoints return correct organization-scoped data with and without filters.
- Verify `performance_snapshots` remain append-only in the deployed API.
- Confirm import logs are created and updated correctly for metric sync jobs.
- Recalculate a sample campaign summary directly from raw snapshots and compare with stored summaries.

## Background Jobs

- Run a live `metric_sync` job in staging.
- Validate the success path:
  - queue enqueue
  - worker execution
  - adapter response normalization
  - snapshot creation
  - import log completion
- Validate the failure path:
  - adapter failure
  - import log status `failed`
  - no snapshot written
- Confirm workers can start cleanly when enabled and API can start cleanly when disabled.

## API Quality

- Run unit, e2e, and integration tests in CI for the API workspace.
- Verify request validation and error responses for key workflow endpoints.
- Confirm pagination defaults and upper bounds for list endpoints.
- Add rate limiting and request logging if not already configured at the deployment layer.
- Confirm health checks exist for API, database, and Redis readiness at the platform layer.

## Mobile Readiness

- Validate Expo app login and campaign browsing against a live staging API.
- Confirm `EXPO_PUBLIC_API_URL` points to the correct API base with the `/api` prefix behavior verified.
- Test authenticated bootstrap with expired or revoked tokens.
- Validate primary navigation tabs and detail flows on both iOS and Android.
- Confirm mobile release builds do not fall back to `localhost`.

## Security and Compliance

- Review password hashing settings and login behavior under production load.
- Confirm secrets are not committed and are injected through deployment tooling.
- Review audit log retention and any privacy requirements for user and influencer notes.
- Define retention rules for raw platform metadata in `import_logs`.
- Add production monitoring and alerting for auth failures, job failures, and database errors.

## Operational Readiness

- Document deployment steps for API, worker, database migration, and mobile configuration.
- Define rollback steps for schema migrations and API deploys.
- Create an incident checklist for queue failures, snapshot ingestion failures, and summary drift.
- Assign ownership for product decisions that affect lifecycle rules, reporting definitions, and platform integrations.
- Replace remaining placeholder business docs before relying on the repo as the operating source of truth.
