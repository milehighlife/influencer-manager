# 2026-03-13 Campaign Builder Editing

## Scope

Extended the first desktop campaign builder slice so agency users can manage existing planning structure instead of only adding new records.

This pass focused on:

- campaign editing
- mission editing
- action editing
- mission deletion
- action deletion
- assignment removal
- inline planning usability improvements

## UI Changes

Updated the desktop campaign detail screen to support inline editing in place:

- campaign editor for `name`, `dates`, and `status`
- mission editor for `name` and `description`
- action editor for `title`, `platform`, `required_deliverables`, `instructions`, `end_window`, and `status`

The page now also supports:

- mission deletion with confirmation
- action deletion with confirmation
- assignment removal with confirmation
- clearer grouping of mission sections and action cards
- inline assignee visibility next to each action

## API Usage

This slice still reused existing backend APIs only:

- `PATCH /campaigns/:id`
- `PATCH /missions/:id`
- `DELETE /missions/:id`
- `PATCH /actions/:id`
- `DELETE /actions/:id`
- `DELETE /action-assignments/:id`

No backend schema or controller changes were required.

## Product Decisions

- kept editing inline to avoid introducing a heavier admin routing model too early
- limited status editing to legal current-or-next transitions in the client
- kept destructive actions explicit with confirmation instead of silent one-click removal
- preserved read-only inspection for non-planning internal roles

## Deferred

- campaign description editing
- company reassignment
- bulk staffing and assignment reassignment flows
- mission sequencing controls
- richer planning filters and saved views
- desktop analytics surfaces
