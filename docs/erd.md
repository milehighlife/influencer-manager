# ERD

## Primary Relationship Chain

The current operational schema is:

Organization
-> Client
-> Company
-> Campaign
-> Mission
-> Action
-> Action Assignment
-> Deliverable
-> Post
-> Performance Snapshot

Influencer joins the chain at `Action Assignment`.

## Entity Relationships

### Organization

- has many users
- has many clients
- has many companies
- has many campaigns
- has many missions
- has many actions
- has many influencers
- has many action assignments
- has many deliverables
- has many posts
- has many performance snapshots
- has many audit logs
- has many import logs

### Client

- belongs to one organization
- has many companies

### Company

- belongs to one organization
- belongs to one client
- has many campaigns

### Campaign

- belongs to one organization
- belongs to one company
- has many missions
- has many influencer ratings

### Mission

- belongs to one organization
- belongs to one campaign
- has many actions

### Action

- belongs to one organization
- belongs to one mission
- has many action assignments

### Influencer

- belongs to one organization
- has many action assignments
- has many influencer ratings
- has many influencer notes

### Action Assignment

- belongs to one organization
- belongs to one action
- belongs to one influencer
- has many deliverables
- is unique per `(action_id, influencer_id)`

### Deliverable

- belongs to one organization
- belongs to one action assignment
- has many posts

### Post

- belongs to one organization
- belongs to one deliverable
- has many performance snapshots
- has many import logs

### Performance Snapshot

- belongs to one organization
- belongs to one post
- is append-only by `(post_id, captured_at)`

### Influencer Rating

- belongs to one organization
- belongs to one influencer
- belongs to one campaign
- belongs to one rater user

### Influencer Note

- belongs to one organization
- belongs to one influencer
- belongs to one author user

### Audit Log

- belongs to one organization
- stores entity and parent entity references by type and id

### Import Log

- belongs to one organization
- belongs to one post
- records ingestion status and metadata

## Summary Model Relationships

The analytics layer stores persisted summaries for:

- post
- action
- mission
- campaign
- influencer

These rows are derived from operational records and raw snapshots. They are not the source of truth.

## Tenant Safety Model

All operational tables include `organization_id`.

Parent-child relationships are tenant-safe through composite references on `(organization_id, id)`, which prevents cross-organization linkage even if an id is known.

## Domain Rules Reflected in the ERD

- campaigns belong to companies, not directly to clients
- influencers never attach directly to campaigns
- assignments create the explicit bridge between campaign work and influencer participation
- posts only exist through deliverables
- snapshots only exist through posts
