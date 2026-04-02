# 2026-03-13 Campaign Builder Scheduling

## Scope

Extended the desktop campaign builder with mission-level scheduling controls inside the existing planning experience.

This pass focused on:

- mission `start_date` editing
- mission `end_date` editing
- mission schedule visibility in the planning view
- lightweight client-side schedule validation

## Why This Fit the Current Model

This slice stayed aligned with the current domain model:

- no hierarchy changes
- no lifecycle changes
- no new mission or campaign relationships
- no backend schema changes

Mission scheduling already exists in the mission model, so the safest implementation was to surface those fields in the existing inline mission editor.

## API Usage

This slice stayed web-only and reused the existing mission update flow:

- `PATCH /missions/:id`
- `GET /campaigns/:id/planning-view`

No backend controller or service changes were required.

## Validation Added

The planner now validates:

- mission start date must be on or before mission end date
- when campaign dates exist, mission dates must stay inside the campaign window

These checks are currently enforced in the web client for planner clarity and to avoid broadening the backend contract in this slice.

## Planner UX Changes

Updated the mission editor to:

- show editable mission start and end date fields
- display the campaign date window as context when available
- show saved mission dates in the mission header after refresh
- disable mission save when schedule validation fails

## Deferred

- backend-enforced campaign-window validation for mission dates
- action-window conflict checks against mission dates
- broader timeline visualization
- calendar or drag-based scheduling UI
