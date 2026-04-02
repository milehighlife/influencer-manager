# 2026-03-13 Campaign Builder Sequencing

## Scope

Extended the desktop campaign builder with the next planning-usability slice:

- mission sequencing
- lightweight planner filters
- stronger mission and action visibility

This pass stayed web-only and reused existing mission update APIs.

## Implementation Notes

Mission sequencing was implemented with explicit move controls instead of drag-and-drop.

Reasons:

- existing mission models already expose `sequence_order`
- the current `PATCH /missions/:id` endpoint already supports sequence updates
- move-up and move-down controls keep the behavior small, explicit, and easy to validate

The web client now rewrites normalized mission sequence values and relies on the existing planning view ordering to keep mission order stable after refresh.

## Planner Visibility Improvements

Added lightweight planning aids to the campaign detail screen:

- mission headers show visible action counts and total assignment counts
- action cards show assignment counts inline
- filter controls support:
  - action status
  - platform
  - staffing state

This keeps the planning view easier to scan without expanding into a broader design-system pass.

## API Usage

No backend changes were required.

This slice reuses:

- `GET /campaigns/:id/planning-view`
- `PATCH /missions/:id`

## Deferred

- drag-and-drop sequencing
- mission sequencing across filtered subsets with bulk reorder affordances
- saved planner filters
- mission scheduling controls beyond the current date fields
- denser staffing and capacity views
