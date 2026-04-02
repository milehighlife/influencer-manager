# Influencer Campaign Manager

Monorepo scaffold for a multi-tenant SaaS platform covering a React Native mobile app, a NestJS API, shared TypeScript packages, infrastructure assets, and product architecture documentation.

## Workspace Layout

- `apps/mobile`: Expo-based React Native client
- `apps/api`: NestJS backend API
- `packages/shared`: Shared TypeScript types, validation, constants, and utilities
- `packages/config`: Centralized tooling configuration placeholders
- `infrastructure`: Local infrastructure and deployment assets
- `docs`: Product and architecture documentation

## Getting Started

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and adjust values as needed.
3. Run `npm run dev:api` or `npm run dev:mobile` for focused development.
4. Run `npm run dev` to start all long-running workspace dev tasks through Turbo.

## Staging Readiness

- API liveness endpoint: `GET /api/health/live`
- API readiness endpoint: `GET /api/health/ready`
- Dedicated worker dev process: `npm run dev:worker`
- Dedicated worker prod process: `npm run start:worker --workspace @influencer-manager/api`
- Container staging target: `infrastructure/docker/docker-compose.staging.yml`

Typical staging rollout order:

1. Deploy database and Redis.
2. Run `npm run db:deploy`.
3. Start the API process.
4. Start the worker process with `ENABLE_JOB_WORKERS=true`.

## Local Staging-Like Validation

If Docker is available:

1. `docker compose -f infrastructure/docker/docker-compose.staging.yml up --build`
2. Seed the database from a one-off API container or local shell.
3. Run `infrastructure/scripts/staging/smoke-test.sh`

If Docker is not available:

1. Start local PostgreSQL and Redis.
2. Run `NODE_ENV=staging npm run db:deploy`
3. Start the API with `NODE_ENV=staging npm run start:prod --workspace @influencer-manager/api`
4. Start the worker with `NODE_ENV=staging npm run start:worker --workspace @influencer-manager/api`
5. Run `infrastructure/scripts/staging/smoke-test.sh`
