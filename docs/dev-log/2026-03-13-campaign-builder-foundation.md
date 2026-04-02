# 2026-03-13 Campaign Builder Foundation

## Scope

Built the first desktop planning surface for agency and administrator users.

This pass focused on the smallest useful planning UI:

- authenticated desktop entry
- campaign list
- campaign creation
- campaign detail planning view
- mission creation
- action creation
- influencer assignment creation

## UI Architecture

Created a new `apps/web` workspace using:

- React
- Vite
- TypeScript
- React Query
- Zustand

The web app intentionally reuses the existing backend and shared type model instead of introducing a separate planning API layer.

## API Usage

This slice reuses existing APIs only:

- auth login and me
- company list
- campaign list and planning view
- campaign create under company
- mission create under campaign
- action create under mission
- influencer list
- assignment create under action

No backend schema changes or new planning endpoints were required.

## Screens Added

- login
- campaign list
- campaign detail

The campaign detail page includes the first nested planning builder:

- mission sections
- action sections
- influencer assignment controls

## Product Decisions

- kept the desktop surface focused on agency/admin planning, not creator work
- allowed read-only desktop access for non-influencer read roles
- blocked influencer users from this surface
- derived some campaign-list display data client-side instead of changing backend list responses in this step

## Deferred

- editing existing campaigns, missions, and actions
- removing assignments
- richer influencer search and filtering
- analytics and reporting desktop surfaces
- design-system polish beyond the initial operational foundation
