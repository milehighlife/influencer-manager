# API

NestJS backend for tenant-aware campaign management, operational workflows, reporting, and integrations.

## Structure

- `src/modules`: Domain modules grouped by business capability
- `src/common`: Cross-cutting NestJS utilities and framework concerns
- `src/config`: Environment and runtime configuration
- `src/database`: Database access, migrations, and persistence setup
- `src/jobs`: Queue producers and worker coordination
- `test`: Integration and end-to-end test suites

## Runtime

- HTTP API entrypoint: `src/main.ts`
- Worker entrypoint: `src/worker.ts`
- Liveness endpoint: `GET /api/health/live`
- Readiness endpoint: `GET /api/health/ready`

Useful commands:

- `npm run dev`
- `npm run dev:worker`
- `npm run build`
- `npm run start:prod`
- `npm run start:worker`
