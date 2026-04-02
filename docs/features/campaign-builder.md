# Campaign Builder

This feature spec covers the first desktop planning surface for agency and administrator users.

Canonical references:

- [Product Instructions](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/product-instructions.md)
- [Domain Glossary](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/domain-glossary.md)
- [Lifecycle State Diagrams](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/lifecycle-state-diagrams.md)
- [Tenant Isolation](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/tenant-isolation.md)
- [Analytics Layer](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/analytics-layer.md)
- [Metrics Catalog](/Volumes/WOMBATSSD/jeffpanis/Sites/influencer-manager/docs/metrics-catalog.md)

## Goal

Provide a first desktop planning UI where agency users can:

- list campaigns
- create campaigns under companies
- view a campaign planning detail page
- add missions to a campaign
- add actions to a mission
- assign influencers to actions

## Scope

This desktop planning slice stays focused on operational campaign structure management:

- desktop login and role gate
- campaign list with server-backed company, client, and mission summary context
- campaign list controls backed by server-side filtering, sorting, pagination, and search
- URL-backed planner-list query state that survives reload and normal navigation
- campaign planning detail with nested mission and action structure
- inline mission creation
- inline action creation
- influencer assignment creation with backend lookup search
- inline campaign editing
- inline mission and action editing
- mission and action deletion with confirmation
- assignment removal from actions
- mission sequencing controls
- mission scheduling controls
- lightweight planner filters for action scanning
- read-only timeline visibility for campaign pacing and schedule structure

This slice does not add:

- reporting dashboards
- deliverable review UI
- creator workflows
- file uploads
- drag-and-drop planning or calendar-style views
- inline timeline editing, resizing, or dependency modeling

## Backend Contract

The desktop planning UI reuses existing authenticated APIs:

- `POST /auth/login`
- `GET /auth/me`
- `GET /clients`
- `GET /companies`
- `GET /campaigns/planner-list`
- `GET /campaigns`
- `POST /companies/:companyId/campaigns`
- `GET /campaigns/:id/planning-view`
- `PATCH /campaigns/:id`
- `POST /campaigns/:campaignId/missions`
- `PATCH /missions/:id`
- `DELETE /missions/:id`
- `POST /missions/:missionId/actions`
- `PATCH /actions/:id`
- `DELETE /actions/:id`
- `GET /influencers`
- `POST /actions/:actionId/assignments`
- `DELETE /action-assignments/:id`

The builder now uses a dedicated planner-safe campaign list read model instead of stitching list rows together from generic campaign rows plus per-campaign planning-view fetches.

The planner list endpoint returns only list-safe campaign planning context:

- campaign identity fields
- status
- campaign dates
- company display context
- client display context
- mission counts
- mission scheduling summary counts
- standard created and updated timestamps

The planner list endpoint now also supports server-backed list controls:

- stable pagination with explicit page and page size
- deterministic sorting by `updated_at`, `created_at`, `start_date`, `end_date`, `name`, and `status`
- filtering by `status`, `company_id`, and `client_id`
- text search across campaign, company, and client names
- filtering by mission-derived campaign `schedule_state`
- deterministic tie-breaking when the primary sort field matches across campaigns

This remains separate from `GET /campaigns/:id/planning-view`, which continues to serve the nested planning detail view.

The desktop runtime smoke suite now also proves planner-list continuity in the real browser:

- URL-backed query state survives detail -> back navigation
- URL-backed query state survives reload
- company and client filters work together against backend query truth
- schedule-state filtering works in the live browser
- combined query changes continue to reflect backend-refetched list state

Supporting admin lookup controls now also rely on backend lookup search instead of silently truncated first-page lists:

- `GET /clients` with `search`
- `GET /companies` with `search` and optional `client_id`
- `GET /influencers` with `search`

These lookup calls stay narrow and organization-scoped. They power campaign filters, create flows, and assignment selectors without implying that the first loaded page is a complete directory.

Planner-list `schedule_state` is defined narrowly from mission scheduling counts:

- `scheduled`: the campaign has at least one mission and every mission has both `start_date` and `end_date`
- `unscheduled`: the campaign has no missions, or every mission has neither `start_date` nor `end_date`
- `partial`: any campaign with missions that is neither fully scheduled nor fully unscheduled

These semantics are campaign-list read-model semantics only. They do not change mission or action scheduling rules.

## UI Structure

Current desktop surfaces:

- `Campaign List`
- `Campaign Detail`

`Campaign Detail` contains the first campaign builder stack:

- campaign summary
- mission sections
- action sections
- assignment creation and removal controls

## Editing Capabilities

The current builder supports inline editing rather than separate edit pages.

Editable fields:

- campaign: `name`, `start_date`, `end_date`, `status`
- mission: `name`, `description`, `sequence_order` through move controls
- mission scheduling: `start_date`, `end_date`
- action: `title`, `platform`, `required_deliverables`, `instructions`, `end_window`, `status`
- action scheduling: `start_window`, `end_window`

Schedule edits now use an explicit clear contract:

- `null` means clear the saved schedule value
- omitted fields mean leave the saved value unchanged
- empty date inputs in the web planner are converted to explicit `null` on update

This keeps the planner, API, timeline, and planner-list schedule-state semantics aligned after a user removes saved dates.

The desktop client narrows campaign and action status choices to legal current-or-next states so planners get fewer avoidable validation errors.

Mission sequencing is intentionally explicit in this slice:

- planners move missions up or down
- the client rewrites normalized `sequence_order` values through existing mission update APIs
- the planning view remains stable after refresh because the backend already sorts missions by `sequence_order`

Mission scheduling is also handled inside the existing mission edit flow:

- planners edit mission `start_date` and `end_date` inline
- the client validates that mission dates stay ordered
- when campaign dates exist, the client validates that mission dates stay inside the campaign window
- the existing mission update API persists those fields without widening the backend surface
- the API now enforces non-overlap and sequence-aware mission scheduling rules so invalid mission timelines cannot be persisted outside the planner
- mission schedule fields can be explicitly cleared back to `null` without being silently ignored

Campaign schedule editing now follows the same contract:

- campaign `start_date` must be on or before campaign `end_date`
- campaign dates may be cleared back to `null`
- when campaign dates are present, they must still include any already-scheduled mission boundaries
- clearing campaign dates removes the campaign-window restriction without changing mission-level scheduling rules

Action scheduling now extends that scheduling integrity downward:

- action `start_window` and `end_window` remain optional
- if both action window values are set, the start window must be on or before the end window
- any action window value that is provided must stay inside the parent mission date window when the mission has dates
- fully scheduled sibling actions in the same mission must not overlap
- same-day boundary alignment is allowed, so actions may start on the same day the mission starts and end on the same day the mission ends
- the planner validates action windows before save, and the API now enforces the same rule so invalid action windows cannot be persisted outside the web client
- action window fields can also be explicitly cleared back to `null`, preserving current partial-scheduling semantics

## Timeline View

The current planner now includes a read-only timeline section inside `Campaign Detail`.

It is intentionally a visibility slice, not a new scheduling system.

The timeline shows:

- campaign window context when campaign dates exist
- a derived frame when campaign dates are missing but mission or action dates exist
- missions in `sequence_order`
- nested action timing inside each mission
- clear `Scheduled`, `Partial schedule`, and `Unscheduled` states
- visible mission gaps when current dates expose them

The timeline intentionally does not add:

- drag scheduling
- resize handles
- calendar month/week views
- dependency editing
- bulk rescheduling controls

## Deletion Flows

The current builder supports:

- mission deletion
- action deletion
- assignment removal from an action

Deletion remains backed by the existing API behavior:

- deleting a mission removes its child actions
- deleting an action removes its child assignments

The web UI requires a browser confirmation step before destructive actions.

## Assignment Management

Action sections support:

- inline visibility of currently assigned influencers
- backend lookup search over organization influencers
- assignment creation through existing action-assignment APIs
- assignment removal from the action detail section

This slice keeps assignment management intentionally narrow:

- no reassignment history
- no bulk staffing
- no assignment editing beyond add/remove

## Planning UX Improvements

To keep the first desktop surface operational without overbuilding:

- mission sections are grouped and collapsible
- mission headers surface order, visible action counts, and assignment counts
- mission headers surface saved schedule dates directly in the planning view
- action cards surface platform, status, deliverable counts, and assignee list inline
- action cards surface saved action windows inline
- action-level filtering supports status, platform, and staffing state
- editing stays close to the content being changed
- destructive actions are explicit and confirmed
- read-only roles can still inspect planning structure without mutation controls
- mission create now applies the same locally-known campaign-window and sibling-overlap validation as mission edit
- planner-side validation surfaces the conflicting sibling mission when possible
- planner-side validation surfaces the parent mission window when an action window drifts outside it
- planner-side validation surfaces the conflicting sibling action when fully scheduled windows overlap
- a read-only schedule overview surfaces campaign, mission, and action pacing without interrupting the current inline editing flow
- unscheduled and partially scheduled missions or actions remain visible in the timeline instead of disappearing from planner context
- visible mission gaps are surfaced as informational cues only
- campaign list empty states now distinguish between true no-data and no-results-for-current-query

## Runtime Confidence

The desktop planner now has three complementary validation layers:

- backend request-level tests for planner reads and writes
- jsdom integration coverage for planner forms and mutation/refetch behavior
- a small Playwright smoke suite against the running web app and local API

The live-browser smoke intentionally stays narrow, but it now covers:

- login and campaign-detail navigation
- representative planner mutation flows
- planner-list search, filters, sort, pagination, and combined query behavior
- planner-list continuity across detail -> back and reload

## Runtime Smoke Coverage

The desktop planner now has a small real-browser smoke suite for local runtime confidence.

Run it with:

- `npm run test:smoke --workspace @influencer-manager/web`

Local assumptions:

- the API is running on `http://127.0.0.1:3000/api`
- Playwright starts the web app locally on `http://127.0.0.1:4173`
- the seeded internal planner user is available:
  - `avery.chen@northstar.example`
  - `AdminPass123!`
- the planner-list smoke path may seed a small disposable batch of draft campaigns through the real API so pagination and combined query-state assertions stay deterministic

Current smoke coverage stays intentionally narrow and high-signal:

- login and navigation to campaign detail
- planner-list search against backend campaign, company, and client lookup
- planner-list runtime filtering, sorting, and pagination behavior
- representative combined planner-list query-state behavior after refetch
- invalid campaign date-order blocking in the browser
- representative campaign date clear/edit persistence
- representative mission date clear/edit persistence
- representative action window clear/edit persistence
- representative assignment add/remove flow
- representative action delete and mission delete flow with confirmation

The smoke suite is meant to complement the API e2e coverage and jsdom integration coverage, not replace them.

Two browser-path fixes are now part of the current planner contract:

- planner schedule edit inputs expose real accessible labels so browser automation and assistive tooling can target them reliably
- action window dates render on the local planner day in the browser, while all-day campaign and mission dates stay calendar-stable

## Planner List Query Continuity

The campaign list now treats URL query params as the source of truth for:

- `search`
- `client_id`
- `company_id`
- `status`
- `schedule_state`
- `sort_by`
- `sort_direction`
- `page`
- `limit`

That means planner list context survives:

- reload
- navigation from list to detail and back
- shareable internal planner URLs

## Planning Rules Reused

This UI preserves the canonical hierarchy rather than redefining it:

- campaign -> mission -> action -> action assignment
- influencers are assigned through actions only
- campaigns belong to companies
- all access remains organization-scoped

The desktop UI relies on authenticated context and existing tenant-safe API enforcement rather than client-provided organization ids.

Mission scheduling now follows an explicit planning rule:

- missions are strict sequential phases inside a campaign
- sibling missions must not overlap
- a later mission cannot start before the prior mission ends
- same-day handoff is allowed, so a mission may start on the same date another mission ends

## Current Role Behavior

- `organization_admin` and `campaign_manager` can create campaigns, missions, actions, and assignments
- `analyst` and `viewer` can open the desktop planning surface in read-only mode
- `influencer` is blocked from the desktop planning UI and remains on the mobile self-service path

## Current Known Limitations

- the first desktop slice is a single-page planning workspace, not a full admin design system
- admin lookups are now search-backed, but still use lightweight search-plus-select controls rather than richer async combobox patterns
- assignment editing is limited to add/remove, with no reassignment history or bulk staffing tools
- mission sequencing uses explicit move controls rather than drag-and-drop
- mission scheduling enforcement now exists in both the planner and the API, and action windows are now constrained to stay inside their parent mission windows
- action scheduling now enforces mission-window boundaries and sibling action non-overlap, and the planner now includes a read-only schedule timeline for visibility only
- sibling action overlap is now blocked when both actions are fully scheduled, but partially scheduled actions still defer conflict checking until a full window exists
- the campaign list now uses a dedicated backend read model with server-side sort, filter, and pagination controls, but campaign detail still intentionally relies on the richer planning-view endpoint for nested mission and action structure
- planner-list text search is substring-based over campaign, company, and client names rather than full-text indexed search
- planner-list schedule-state filtering is based on mission scheduling counts only and does not reflect action-level scheduling density
- the timeline does not yet support direct manipulation, denser calendar views, or dependency mapping
- reporting and analytics remain outside this desktop planning slice

## Deferred Work

- richer campaign editing such as description and company changes
- mission scheduling controls beyond current date fields, such as editable timeline or calendar views
- richer action scheduling views beyond the current read-only timeline and inline conflict checks
- assignment management beyond add/remove
- saved planning filters, bulk actions, and denser staffing views
- desktop analytics and reporting surfaces
