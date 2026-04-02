# 2026-03-13 Influencer Revision UX

## Scope

Tightened the creator rejected-state and revision flow in the mobile influencer workspace.

## QA Findings Addressed

- rejected assignments needed a single dedicated surface that explained what happened and what to do next
- creators needed a clearer resubmission path that respected the canonical `rejected -> in_progress -> submitted` workflow
- revision context needed timestamps so creators could tell which submission and review cycle they were looking at
- the creator status-signal pass needed validation that filtering, badges, and creator-friendly labels still held together

## Improvements Shipped

- added a dedicated `Changes Requested` section on rejected assignments
- surfaced reviewer feedback, previous submission time, and latest deliverable update time
- added creator-friendly revision steps in assignment detail and submission screens
- added a one-tap `Resubmit Deliverable` path that reopens rejected work before routing into submission
- kept multi-post guidance lightweight but visible where approved deliverables already have linked posts
- revalidated creator status labels, filters, search, sort, and badge-driven status visibility

## Affected Screens

- `My Assignments`
- `InfluencerAssignmentDetailScreen`
- `SubmitDeliverableScreen`
- `LinkPostScreen`

## Deferred

- dedicated creator notification feed
- true revision timeline or version history model
- deeper multi-post guidance beyond inline helper copy
