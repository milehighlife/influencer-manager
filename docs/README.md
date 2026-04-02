# Docs Table of Contents

## Purpose

This file is the canonical entry point for documentation discovery in this repository.

Use it to find the right reference docs before planning, implementing, reviewing, or documenting changes.

## Documentation Workflow Rules

- Review `docs/README.md` first before starting implementation or writing new documentation.
- Open the specific referenced docs that apply to the task before changing code or product behavior.
- Treat the referenced canonical docs as the source of truth unless code has clearly and intentionally diverged.
- Add new docs to the correct `docs/` subfolder instead of creating ad hoc files at random paths.
- Update the matching table entry in this file whenever a doc in `docs/` is added or changed.
- Avoid duplicate docs; update an existing canonical file when it already covers the topic.

## Date Source

- Preferred source is git history.
- Git history is not available from this checkout, so the `Created` and `Updated` values below use local filesystem creation and modification dates.
- `Last Update` is a brief content summary of the most recent meaningful known state of each document.

## Directory Map

- `docs/README.md`: canonical docs inventory and workflow rules
- `docs/*.md`: root-level product, domain, workflow, analytics, and operational references
- `docs/features/`: feature-specific reference docs
- `docs/dev-log/`: dated implementation and QA logs

## Table of Contents

### Product

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Product Instructions | [`product-instructions.md`](product-instructions.md) | Current product scope, hierarchy, roles, and operating decisions. | 2026-03-11 | 2026-03-13 | Updated supported scope to include influencer-linked users and mobile influencer self-service. |
| Roadmap | [`roadmap.md`](roadmap.md) | Current completed foundations and next delivery phases. | 2026-03-11 | 2026-03-13 | Added completed influencer workspace slice and clarified staged next phases. |
| Influencer Campaign Manager Checklist | [`influencer-manager-checklist.md`](influencer-manager-checklist.md) | Legacy broad checklist draft retained for reference. | 2026-03-11 | 2026-03-11 | Legacy checklist content predating the normalized operational checklist structure. |

### Domain / Data Model

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Domain Glossary | [`domain-glossary.md`](domain-glossary.md) | Canonical business vocabulary and role/entity terms. | 2026-03-11 | 2026-03-13 | Added influencer-linked user terminology and creator self-service terms. |
| ERD | [`erd.md`](erd.md) | Relationship chain and entity ownership reference. | 2026-03-11 | 2026-03-12 | Documented current operational chain, tenant-safe lineage, and summary entities. |

### Workflow / Lifecycle

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Lifecycle State Diagrams | [`lifecycle-state-diagrams.md`](lifecycle-state-diagrams.md) | Service-enforced lifecycle states and legal transitions. | 2026-03-11 | 2026-03-12 | Captured current transition rules, including rejected assignment re-entry and explicit completion. |

### Analytics / Metrics

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Metrics Catalog | [`metrics-catalog.md`](metrics-catalog.md) | Raw metric definitions and current summary formulas. | 2026-03-11 | 2026-03-12 | Clarified snapshot source-of-truth rules and engagement-rate calculations. |
| Analytics Layer | [`analytics-layer.md`](analytics-layer.md) | Current analytics, import-log, queue, and summary architecture. | 2026-03-11 | 2026-03-12 | Documented queue structure, placeholder adapters, and persisted summary layers. |

### Architecture

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Tenant Isolation | [`tenant-isolation.md`](tenant-isolation.md) | Authorization, tenant boundaries, and organization-scoped data rules. | 2026-03-11 | 2026-03-13 | Clarified that generic internal reads like campaigns, users, and reports are route-level role-protected in addition to tenant-scoped. |

### Features

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Campaign Builder | [`features/campaign-builder.md`](features/campaign-builder.md) | Feature spec for the desktop agency campaign planning surface. | 2026-03-13 | 2026-03-14 | Updated the builder spec with runtime-confidence coverage for planner-list continuity, combined query behavior, and live-browser list truth. |
| Influencer Workspace | [`features/influencer-workspace.md`](features/influencer-workspace.md) | Feature spec for the first mobile creator self-service slice. | 2026-03-13 | 2026-03-15 | Expanded the creator runtime-smoke contract to cover Status/digest refresh after submit, resubmit, and post-link writes, plus the focus-based digest refresh behavior. |

### Dev Log

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| 2026-03-13 Influencer Workspace | [`dev-log/2026-03-13-influencer-workspace.md`](dev-log/2026-03-13-influencer-workspace.md) | Build log for the initial influencer workspace implementation. | 2026-03-13 | 2026-03-13 | Recorded backend, mobile, seed, and test additions for creator self-service. |
| 2026-03-13 Influencer Workspace QA | [`dev-log/2026-03-13-influencer-workspace-qa.md`](dev-log/2026-03-13-influencer-workspace-qa.md) | QA log for the creator workspace validation and remediation pass. | 2026-03-13 | 2026-03-13 | Recorded creator QA scope, issues fixed, deferred items, and follow-up priorities. |
| 2026-03-13 Influencer Workspace Signals | [`dev-log/2026-03-13-influencer-workspace-signals.md`](dev-log/2026-03-13-influencer-workspace-signals.md) | Build log for creator review signals, filtering, and status visibility improvements. | 2026-03-13 | 2026-03-13 | Recorded creator-facing status language, review signals, filtering, and lightweight notification-ready surfaces. |
| 2026-03-13 Influencer Revision UX | [`dev-log/2026-03-13-influencer-revision-ux.md`](dev-log/2026-03-13-influencer-revision-ux.md) | Build log for rejected-state clarity and resubmission UX improvements. | 2026-03-13 | 2026-03-13 | Recorded the dedicated rejected-state surface, revision timestamps, and one-tap resubmission flow. |
| 2026-03-13 Influencer Notifications | [`dev-log/2026-03-13-influencer-notifications.md`](dev-log/2026-03-13-influencer-notifications.md) | Build log for the lightweight creator activity and notification feed. | 2026-03-13 | 2026-03-13 | Recorded the `Updates` tab, derived event sources, badge decision, and deferred notification-platform work. |
| 2026-03-13 Influencer Status Digest Truth Hardening | [`dev-log/2026-03-13-influencer-status-digest-truth-hardening.md`](dev-log/2026-03-13-influencer-status-digest-truth-hardening.md) | Build log for reframing the creator `Updates` surface as a truthful current-state digest. | 2026-03-13 | 2026-03-13 | Recorded the decision not to fake recent activity history, the new `Status` semantics, and the copy/code changes that made the screen truthful. |
| 2026-03-14 Influencer Post Summary Truth | [`dev-log/2026-03-14-influencer-post-summary-truth.md`](dev-log/2026-03-14-influencer-post-summary-truth.md) | Build log for moving creator post summary cards off page-local totals and onto backend truth. | 2026-03-14 | 2026-03-14 | Recorded the shared post summary payload, truthful `My Posts` totals, and explicit copy when only the latest page of rows is shown. |
| 2026-03-14 Influencer Assignments Query Completeness | [`dev-log/2026-03-14-influencer-assignments-query-completeness.md`](dev-log/2026-03-14-influencer-assignments-query-completeness.md) | Build log for moving creator assignment search and sort to the backend read model. | 2026-03-14 | 2026-03-14 | Recorded the new assignment `search` and `sort_by` query contract, truthful queue copy, and preserved creator ownership boundaries. |
| 2026-03-14 Influencer Assignment Summary Consolidation | [`dev-log/2026-03-14-influencer-assignment-summary-consolidation.md`](dev-log/2026-03-14-influencer-assignment-summary-consolidation.md) | Build log for replacing multi-query creator status counts with one shared assignment summary payload. | 2026-03-14 | 2026-03-14 | Recorded the shared assignment summary, reduced mobile request fan-out, and the copy update that removed misleading “recent” wording from `My Assignments`. |
| 2026-03-14 Influencer Status Digest Row Truth | [`dev-log/2026-03-14-influencer-status-digest-row-truth.md`](dev-log/2026-03-14-influencer-status-digest-row-truth.md) | Build log for moving creator status rows off bounded page-local queries and onto a dedicated digest endpoint. | 2026-03-14 | 2026-03-14 | Recorded the new `GET /influencer/status-digest` contract, bounded latest-signal semantics, deterministic ordering, and truthful status-row scope. |
| 2026-03-14 Influencer Workspace Runtime Smoke | [`dev-log/2026-03-14-influencer-workspace-runtime-smoke.md`](dev-log/2026-03-14-influencer-workspace-runtime-smoke.md) | Build log for the small Maestro-based iOS Simulator smoke suite for the creator workspace. | 2026-03-14 | 2026-03-14 | Recorded the Expo Go runtime workflow, deterministic login reset, and the creator screens now covered in live runtime automation. |
| 2026-03-14 Influencer Workflow Deep Runtime Smoke | [`dev-log/2026-03-14-influencer-workflow-deep-runtime-smoke.md`](dev-log/2026-03-14-influencer-workflow-deep-runtime-smoke.md) | Build log for extending the creator runtime smoke into submit, resubmit, and post-performance flows. | 2026-03-14 | 2026-03-14 | Recorded the repeatable seed-reset workflow, live creator write-path verification, and the new post-performance runtime checks. |
| 2026-03-15 Influencer Link-Post Runtime Smoke | [`dev-log/2026-03-15-influencer-link-post-runtime-smoke.md`](dev-log/2026-03-15-influencer-link-post-runtime-smoke.md) | Build log for extending the creator runtime smoke into real post linking and `My Posts` refresh verification. | 2026-03-15 | 2026-03-15 | Recorded the approved-deliverable link-post write path, assignment-detail refresh proof, backend-backed `My Posts` refresh checks, and the more reliable Expo Go launch setup. |
| 2026-03-15 Influencer Android Runtime Smoke Parity | [`dev-log/2026-03-15-influencer-android-runtime-smoke-parity.md`](dev-log/2026-03-15-influencer-android-runtime-smoke-parity.md) | Build log for extending the existing creator Maestro smoke workflow to Android runtime targets. | 2026-03-15 | 2026-03-15 | Recorded the shared Maestro flow, Android Expo Go launch/reset workflow, and the platform-parity creator flows now exercised through the same runtime contract. |
| 2026-03-15 Influencer Digest Refresh Runtime Smoke | [`dev-log/2026-03-15-influencer-digest-refresh-runtime-smoke.md`](dev-log/2026-03-15-influencer-digest-refresh-runtime-smoke.md) | Build log for proving that Status refreshes to backend truth after creator write actions. | 2026-03-15 | 2026-03-15 | Recorded the status-digest invalidation/focus refresh fix and the new runtime smoke assertions for submit, resubmit, and post-link write outcomes. |
| 2026-03-13 Campaign Builder Foundation | [`dev-log/2026-03-13-campaign-builder-foundation.md`](dev-log/2026-03-13-campaign-builder-foundation.md) | Build log for the first desktop planning surface. | 2026-03-13 | 2026-03-13 | Recorded the `apps/web` architecture, screen scope, reused APIs, and deferred planning work. |
| 2026-03-13 Campaign Builder Editing | [`dev-log/2026-03-13-campaign-builder-editing.md`](dev-log/2026-03-13-campaign-builder-editing.md) | Build log for desktop planning edits, destructive flows, and assignment management. | 2026-03-13 | 2026-03-13 | Recorded inline editing, delete confirmations, assignment removal, and the client-side legal-status guardrails. |
| 2026-03-13 Campaign Builder Sequencing | [`dev-log/2026-03-13-campaign-builder-sequencing.md`](dev-log/2026-03-13-campaign-builder-sequencing.md) | Build log for mission ordering and lightweight planner visibility improvements. | 2026-03-13 | 2026-03-13 | Recorded move-based mission sequencing, action filters, mission/action counts, and the decision to avoid backend changes. |
| 2026-03-13 Campaign Builder Scheduling | [`dev-log/2026-03-13-campaign-builder-scheduling.md`](dev-log/2026-03-13-campaign-builder-scheduling.md) | Build log for mission schedule editing and planner date validation. | 2026-03-13 | 2026-03-13 | Recorded inline mission date editing, campaign-window validation, and the choice to keep the slice web-only. |
| 2026-03-13 Campaign Builder Mission Non-Overlap Validation | [`dev-log/2026-03-13-campaign-builder-mission-non-overlap-validation.md`](dev-log/2026-03-13-campaign-builder-mission-non-overlap-validation.md) | Build log for strict sequential mission scheduling enforcement. | 2026-03-13 | 2026-03-13 | Recorded server-side mission overlap validation, same-day handoff convention, and planner conflict messaging. |
| 2026-03-13 Campaign Builder Action Window Validation | [`dev-log/2026-03-13-campaign-builder-action-window-validation.md`](dev-log/2026-03-13-campaign-builder-action-window-validation.md) | Build log for action scheduling rules inside mission windows. | 2026-03-13 | 2026-03-13 | Recorded server-side and planner-side action-window validation, same-day boundary handling, and preserved partial scheduling behavior. |
| 2026-03-13 Campaign Builder Action Conflict Validation | [`dev-log/2026-03-13-campaign-builder-action-conflict-validation.md`](dev-log/2026-03-13-campaign-builder-action-conflict-validation.md) | Build log for sibling action non-overlap enforcement inside one mission. | 2026-03-13 | 2026-03-13 | Recorded server-side and planner-side sibling action conflict validation, same-day handoff handling, and preserved partial scheduling behavior. |
| 2026-03-13 Campaign Builder Timeline View | [`dev-log/2026-03-13-campaign-builder-timeline-view.md`](dev-log/2026-03-13-campaign-builder-timeline-view.md) | Build log for the first read-only schedule timeline inside campaign detail. | 2026-03-13 | 2026-03-13 | Recorded the timeline visibility slice, derived frame fallback, schedule-state rendering, and intentionally deferred editing capabilities. |
| 2026-03-13 Campaign Builder Planner Read Model | [`dev-log/2026-03-13-campaign-builder-planner-read-model.md`](dev-log/2026-03-13-campaign-builder-planner-read-model.md) | Build log for the server-backed campaign list read model used by the desktop planner. | 2026-03-13 | 2026-03-13 | Recorded the dedicated planner list endpoint, removal of list-level planning-view fan-out, and the narrower backend response shape. |
| 2026-03-13 Campaign Builder Planner List Query Controls | [`dev-log/2026-03-13-campaign-builder-planner-list-query-controls.md`](dev-log/2026-03-13-campaign-builder-planner-list-query-controls.md) | Build log for planner-list sorting, filtering, and pagination refinement. | 2026-03-13 | 2026-03-13 | Recorded the server-backed list controls, web query-state integration, and the decision to keep the endpoint narrow. |
| 2026-03-13 Campaign Builder Planner List Search | [`dev-log/2026-03-13-campaign-builder-planner-list-search.md`](dev-log/2026-03-13-campaign-builder-planner-list-search.md) | Build log for planner-list text search across campaign, company, and client names. | 2026-03-13 | 2026-03-13 | Recorded the narrow backend search addition, web integration, and the decision to avoid local fallback filtering. |
| 2026-03-13 Campaign Builder Planner List Schedule-State Filter | [`dev-log/2026-03-13-campaign-builder-planner-list-schedule-state-filter.md`](dev-log/2026-03-13-campaign-builder-planner-list-schedule-state-filter.md) | Build log for planner-list schedule-state semantics and backend filtering. | 2026-03-13 | 2026-03-13 | Recorded the campaign-level `scheduled`/`partial`/`unscheduled` definitions, backend filter, and thin web integration. |
| 2026-03-13 Campaign Builder Schedule Contract Hardening | [`dev-log/2026-03-13-campaign-builder-schedule-contract-hardening.md`](dev-log/2026-03-13-campaign-builder-schedule-contract-hardening.md) | Build log for campaign date validation and explicit schedule-field clearing semantics. | 2026-03-13 | 2026-03-13 | Recorded the `null = clear` contract, campaign date validation, and the API/web alignment for truthful schedule edits. |
| 2026-03-13 Campaign Builder Live Browser Smoke | [`dev-log/2026-03-13-campaign-builder-live-browser-smoke.md`](dev-log/2026-03-13-campaign-builder-live-browser-smoke.md) | Build log for the small Playwright smoke suite against the running desktop planner and local API. | 2026-03-13 | 2026-03-13 | Recorded the runtime smoke workflow, seeded login assumptions, deterministic planner-list query-control coverage, and the frontend fixes needed for stable live-browser behavior. |
| 2026-03-13 Campaign Builder Admin Scale and Query Continuity | [`dev-log/2026-03-13-campaign-builder-admin-scale-and-query-continuity.md`](dev-log/2026-03-13-campaign-builder-admin-scale-and-query-continuity.md) | Build log for scalable admin lookups, URL-backed planner-list state, mission-create validation parity, and truthful list empty states. | 2026-03-13 | 2026-03-13 | Recorded the backend lookup search additions, web query-state persistence, mission-create validation reuse, and no-results empty-state behavior. |
| 2026-03-14 Campaign Builder Planner-List Runtime Continuity | [`dev-log/2026-03-14-campaign-builder-planner-list-runtime-continuity.md`](dev-log/2026-03-14-campaign-builder-planner-list-runtime-continuity.md) | Build log for live-browser planner-list continuity and combined query-state verification. | 2026-03-14 | 2026-03-14 | Recorded detail -> back continuity, reload continuity, company/client filtering, schedule-state runtime checks, and deterministic seeded-data assumptions for the Playwright smoke suite. |
| 2026-03-13 Generic Read Auth Hardening | [`dev-log/2026-03-13-generic-read-auth-hardening.md`](dev-log/2026-03-13-generic-read-auth-hardening.md) | Build log for route-level auth hardening on generic campaigns, users, and reports reads. | 2026-03-13 | 2026-03-13 | Recorded the explicit read-route role metadata, e2e auth coverage, and confirmation that influencer access remains blocked from internal surfaces. |

### Operational / Checklists

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Pre-Production Checklist | [`pre-production-checklist.md`](pre-production-checklist.md) | Operational readiness checklist for staging and production hardening. | 2026-03-11 | 2026-03-12 | Aligned launch-readiness checks with current auth, jobs, analytics, and mobile behavior. |

### Other

| Title | File | Description | Created | Updated | Last Update |
|---|---|---|---|---|---|
| Docs Table of Contents | [`README.md`](README.md) | Canonical docs inventory and maintenance rules. | 2026-03-11 | 2026-03-15 | Updated to track the link-post runtime-smoke log and refreshed influencer workspace runtime coverage. |
| Codex Master Prompt | [`codex-master-prompt.md`](codex-master-prompt.md) | Empty placeholder file reserved for future prompt guidance. | 2026-03-11 | 2026-03-11 | No substantive content yet. |
| Influencer Manager Instructions | [`influencer-manager-instructions.md`](influencer-manager-instructions.md) | Empty placeholder file reserved for future instructions. | 2026-03-11 | 2026-03-11 | No substantive content yet. |

## Maintenance Rule

Whenever a document in `docs/` is added or updated, `docs/README.md` must be updated in the same change.

## Prompt Rule

Copy and reuse this in future implementation prompts:

> Before starting work, review `docs/README.md` and then open the relevant referenced docs. If you add or update any documentation, update `docs/README.md` in the same change.
