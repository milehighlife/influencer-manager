# Database Layer

This database layer uses Prisma with PostgreSQL as the source of truth for the core operational schema.

## What Was Created

- `schema.prisma`: Prisma schema for the core tenant-aware domain
- `migrations/202603110001_initial/migration.sql`: Initial SQL migration
- `seed.ts`: Realistic seed data for one organization and its campaign structure

## How To Run Migrations

1. Install dependencies with `npm install`.
2. Ensure `DATABASE_URL` is set in your environment.
3. Run `npm run db:migrate`.

For production deployment, run:

```bash
npm run db:deploy
```

## How To Seed

Generate the Prisma client first if needed:

```bash
npm run db:generate
```

Then seed the database:

```bash
npm run db:seed
```
