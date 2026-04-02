# Lifecycle State Diagrams

Workflow states are validated in the service layer. Invalid state changes are rejected before persistence.

## Campaign Status

States:

- `draft`
- `planned`
- `active`
- `paused`
- `completed`
- `archived`

Allowed transitions:

- `draft -> planned`
- `planned -> active`
- `planned -> archived`
- `active -> paused`
- `active -> completed`
- `paused -> active`
- `completed -> archived`

## Mission Status

States:

- `planned`
- `active`
- `completed`

Allowed transitions:

- `planned -> active`
- `active -> completed`

## Action Status

States:

- `draft`
- `scheduled`
- `active`
- `awaiting_submission`
- `under_review`
- `completed`

Allowed transitions:

- `draft -> scheduled`
- `scheduled -> active`
- `active -> awaiting_submission`
- `active -> completed`
- `awaiting_submission -> under_review`
- `under_review -> active`
- `under_review -> completed`

## Action Assignment Status

States:

- `assigned`
- `accepted`
- `in_progress`
- `submitted`
- `approved`
- `rejected`
- `completed`

Allowed transitions:

- `assigned -> accepted`
- `accepted -> in_progress`
- `in_progress -> submitted`
- `submitted -> approved`
- `submitted -> rejected`
- `rejected -> in_progress`
- `approved -> completed`

Notes:

- rejection returns the assignment to active execution work rather than closing it
- assignment completion is explicit and only occurs after approval and posting requirements are satisfied

## Deliverable Status

States:

- `pending`
- `submitted`
- `approved`
- `rejected`

Allowed transitions:

- `pending -> submitted`
- `submitted -> approved`
- `submitted -> rejected`
- `rejected -> submitted`

Notes:

- rejection requires a reason
- the reviewer cannot approve their own submission if they are also the submitter

## Review Flow

The current execution workflow is:

`assigned -> accepted -> in_progress -> submitted -> approved/rejected -> completed`

Deliverables follow a parallel review path:

`pending -> submitted -> approved/rejected`

Rejected work loops back into execution rather than creating a terminal state.
