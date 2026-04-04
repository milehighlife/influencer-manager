# Project Audit Report

## Executive Summary

The influencer-manager monorepo is a well-structured NestJS + React + React Native application with solid fundamentals — proper JWT auth guards, organization-scoped data access, typed DTOs, and reasonable test scaffolding. However, the audit uncovered **5 critical IDOR vulnerabilities** where update/delete operations bypass organization checks via a TOCTOU pattern, **no rate limiting** on any endpoint including login, **open CORS** allowing all origins, and **31 npm vulnerabilities** (1 critical, 16 high). The frontend stores JWT tokens in localStorage (XSS-extractable) and has near-zero component test coverage. Addressing the Critical and High items below would substantially harden the application.

---

## Critical

Issues that could cause data loss, security breaches, or outages. Fix immediately.

### C1. IDOR: Update/Delete operations bypass organization scope (TOCTOU race)

Multiple services verify organization ownership via `findOne()` then execute `update()`/`delete()` using only `{ where: { id } }` — without `organization_id` in the write clause. A concurrent request or a malicious actor can exploit the gap between the check and the write.

**Affected files and lines:**

| Service | Method | File | Lines |
|---------|--------|------|-------|
| ClientsService | `update()` | `apps/api/src/modules/clients/clients.service.ts` | 72-78 |
| ClientsService | `remove()` | `apps/api/src/modules/clients/clients.service.ts` | 81-85 |
| CompaniesService | `update()` | `apps/api/src/modules/companies/companies.service.ts` | 93-103 |
| CompaniesService | `remove()` | `apps/api/src/modules/companies/companies.service.ts` | 106-111 |
| MissionsService | `update()` | `apps/api/src/modules/missions/missions.service.ts` | 230-243 |
| MissionsService | `remove()` | `apps/api/src/modules/missions/missions.service.ts` | 246-251 |

**Why it matters:** A user in Organization A can modify or delete records belonging to Organization B by sending a PATCH/DELETE with the target record's UUID. The `findOne()` guard is necessary but not sufficient because it's a separate query.

**Fix:** Add `organization_id` to every Prisma `update`/`delete` where clause:

```typescript
// Before (vulnerable)
async update(organizationId: string, id: string, dto: UpdateClientDto) {
  await this.findOne(organizationId, id);
  return this.prisma.client.update({
    where: { id },
    data: dto,
  });
}

// After (safe)
async update(organizationId: string, id: string, dto: UpdateClientDto) {
  await this.findOne(organizationId, id);
  return this.prisma.client.update({
    where: { id, organization_id: organizationId },
    data: dto,
  });
}
```

Apply the same pattern to all 6 methods listed above.

---

### C2. No rate limiting on login or any endpoint

No `@nestjs/throttler` or any rate-limiting mechanism exists. The `/auth/login` endpoint accepts unlimited password attempts.

**File:** `apps/api/src/app.module.ts` (no ThrottlerModule import)
**File:** `apps/api/src/main.ts` (no middleware)

**Why it matters:** Enables brute-force credential attacks, credential stuffing, and denial-of-service.

**Fix:** Install and configure `@nestjs/throttler`:

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 minute window
      limit: 30,    // 30 requests per window (global default)
    }]),
    // ...
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})

// auth.controller.ts — stricter limit on login
@Throttle({ default: { ttl: 900000, limit: 5 } }) // 5 attempts per 15 min
@Post('login')
```

---

### C3. Unbounded query in `findPlatformMismatches` — no pagination

**File:** `apps/api/src/modules/action-assignments/action-assignments.service.ts`, lines 746-815

```typescript
const assignments = await this.prisma.actionAssignment.findMany({
  where: { organization_id: organizationId },
  include: { action: true, influencer: true },
  // NO take/skip — returns ALL assignments for the entire organization
});
```

**Why it matters:** An organization with thousands of assignments will cause memory exhaustion and request timeouts. Includes nested relations, amplifying the data volume.

**Fix:** Add pagination parameters, or process in batches. At minimum add a hard limit:

```typescript
const assignments = await this.prisma.actionAssignment.findMany({
  where: { organization_id: organizationId },
  include: { action: true, influencer: true },
  take: 500, // Hard upper bound
});
```

---

### C4. npm dependency vulnerabilities — 1 critical, 16 high

`npm audit` reports 31 vulnerabilities including:

| Package | Severity | Issue |
|---------|----------|-------|
| `handlebars` 4.0.0-4.7.8 | Critical | XSS / code injection |
| `undici` <=6.23.0 | High | HTTP smuggling, WebSocket overflow |
| `path-to-regexp` 8.0.0-8.3.0 | High | ReDoS (transitive via `@nestjs/core`) |
| `d3-color` <3.1.0 | High | ReDoS (via `react-simple-maps`) |
| `lodash` <=4.17.23 | High | Prototype pollution |
| `node-forge` <=1.3.3 | High | Certificate chain bypass |

**Fix:** Run `npm audit fix` for auto-fixable issues. For transitive dependencies that can't be auto-fixed, add `overrides` in root `package.json` or replace the upstream package.

---

## High

Significant problems that will bite you eventually. Fix this sprint.

### H1. CORS allows all origins

**File:** `apps/api/src/main.ts`, line 10

```typescript
const app = await NestFactory.create(AppModule, {
  cors: true, // Allows requests from ANY origin
});
```

**Why it matters:** Enables cross-site request forgery from any domain. An attacker's site can make authenticated API calls if the user has a valid token.

**Fix:**

```typescript
const app = await NestFactory.create(AppModule, {
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  },
});
```

---

### H2. JWT stored in localStorage — extractable via XSS

**File:** `apps/web/src/state/auth-store.ts`, lines 23, 41, 45

The access token is persisted in `window.localStorage` and read back on page load. Any XSS vulnerability (even from a third-party script) can exfiltrate the token.

**Why it matters:** localStorage is accessible to all JavaScript on the page. A single XSS vector gives an attacker a fully authenticated session.

**Fix (short-term):** Acceptable for an internal tool with no user-generated HTML. Ensure no `dangerouslySetInnerHTML` or unvalidated URL rendering exists (audit confirms none currently).

**Fix (long-term):** Move to httpOnly cookie-based sessions issued by the API. The API sets the cookie; the browser sends it automatically; JavaScript cannot read it.

---

### H3. N+1 sequential DB calls in `refreshCampaignHierarchy`

**File:** `apps/api/src/modules/reports/analytics-aggregation.service.ts`, lines 99-113

```typescript
for (const mission of missionIds) {
  await this.refreshMissionSummary(organizationId, mission, tx);
}
for (const action of actionIds) {
  await this.refreshActionSummary(organizationId, action, tx);
}
for (const post of postIds) {
  await this.refreshPostSummary(organizationId, post, tx);
}
for (const influencer of influencerIds) {
  await this.refreshInfluencerSummary(organizationId, influencer, tx);
}
```

Each loop iteration issues its own DB queries. A campaign with 10 missions, 50 actions, 200 posts, and 30 influencers produces ~290 sequential round-trips.

**Fix:** Replace sequential loops with `Promise.all` for concurrent execution within the transaction, or batch the aggregation into single queries per entity type.

---

### H4. Race conditions in assignment status transitions

**Files:**
- `apps/api/src/modules/action-assignments/action-assignments.service.ts`, lines 255-283 (`accept`, `start`)
- `apps/api/src/modules/action-assignments/action-assignments.service.ts`, lines 402-458 (`complete`)
- `apps/api/src/modules/deliverables/deliverables.service.ts`, lines 107-150 (`update`)

Pattern: The current status is read with `findOne()` outside a transaction, validated, then updated in a separate call. Two concurrent requests can both read the same state and both "succeed."

**Why it matters:** An assignment could be moved from `in_progress` to `submitted` twice, or approved and rejected simultaneously.

**Fix:** Move the read + validate + write into a single `$transaction` with a `SELECT ... FOR UPDATE` pattern:

```typescript
await this.prisma.$transaction(async (tx) => {
  const assignment = await tx.actionAssignment.findUniqueOrThrow({
    where: { id, organization_id: organizationId },
  });
  if (assignment.assignment_status !== expectedStatus) {
    throw new ConflictException('Status has changed');
  }
  return tx.actionAssignment.update({ where: { id }, data: { ... } });
});
```

---

### H5. No CI/CD pipeline

**File:** `.github/workflows/` — empty directory (only `.gitkeep`)

**Why it matters:** No automated testing, linting, type-checking, or security scanning on pull requests. Regressions and vulnerabilities slip through.

**Fix:** Create a GitHub Actions workflow that runs on PR:

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - run: npx tsc --noEmit -p apps/web/tsconfig.json
      - run: npx tsc --noEmit -p apps/api/tsconfig.json
      - run: npm test --workspaces --if-present
      - run: npm audit --audit-level=high
```

---

### H6. No global exception filter — error responses may leak internals

**File:** `apps/api/src/main.ts` — no `useGlobalFilters()` call

NestJS default error handling in development mode includes stack traces and internal class names in HTTP responses.

**Fix:** Add a global exception filter:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;
    response.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.message
        : 'Internal server error',
    });
  }
}
```

---

### H7. Missing database indexes on frequently queried columns

**File:** `db/schema.prisma`

| Model | Column(s) | Used in | Lines |
|-------|-----------|---------|-------|
| `Influencer` | `email`, `location`, `audience_description` | `CONTAINS` search in `influencers.service.ts:41-59` | 367, 370, 382 |
| `ActionAssignment` | `due_date` | `ORDER BY` in `findOverdue` | 406 |
| `ActionPerformanceSummary` | `action_id` | Lookups | 656 |
| `MissionPerformanceSummary` | `mission_id` | Lookups | 675 |
| `CampaignPerformanceSummary` | `campaign_id` | Lookups | 694 |
| `InfluencerPerformanceSummary` | `influencer_id` | Lookups | 713 |

The `CONTAINS` / `mode: "insensitive"` searches on unindexed text columns cause full table scans.

**Fix:** Add indexes in `schema.prisma`. For text search, consider PostgreSQL `pg_trgm` GIN indexes:

```prisma
@@index([organization_id, due_date])      // ActionAssignment
@@index([action_id])                       // ActionPerformanceSummary
@@index([mission_id])                      // MissionPerformanceSummary
@@index([campaign_id])                     // CampaignPerformanceSummary
@@index([influencer_id])                   // InfluencerPerformanceSummary
```

---

## Medium

Quality and performance improvements. Plan for next sprint.

### M1. `forbidUnknownValues: false` in ValidationPipe

**File:** `apps/api/src/main.ts`, line 19

While `whitelist: true` strips unknown properties, `forbidUnknownValues: false` allows unexpected nested objects. Should be `true` for defense-in-depth.

---

### M2. Missing `@MaxLength` on string DTO fields

**Files:**
- `apps/api/src/modules/clients/dto/create-client.dto.ts`, lines 5-26
- `apps/api/src/modules/influencers/dto/create-influencer.dto.ts`, lines 10-78
- `apps/api/src/modules/companies/dto/create-company.dto.ts`

String fields like `name`, `email`, `phone`, `location`, and URL fields lack `@MaxLength()` constraints. A malicious client can send multi-megabyte strings.

**Fix:** Add `@MaxLength(255)` (or appropriate limit) to all string fields in DTOs.

---

### M3. Logging interceptor is a no-op

**File:** `apps/api/src/common/interceptors/logging.interceptor.ts`, lines 1-17

The `intercept()` method passes through without logging anything — no request timing, no method/path, no response status.

**Fix:** Implement structured request logging (method, path, status, duration, user ID).

---

### M4. Frontend test coverage is near zero

**Existing tests:**
- `apps/web/src/utils/format.spec.ts` — 3 basic utility tests
- `apps/web/src/utils/campaign-builder.spec.ts` — ~10 utility tests
- `apps/web/src/services/api/campaign-builder-api.spec.ts` — 9 API layer tests
- `apps/web/src/pages/campaign-list.integration.spec.tsx` — 2 integration tests
- `apps/web/src/pages/campaign-scheduling.integration.spec.tsx` — large integration suite

**Not tested at all:** LoginPage, AppShell, all detail pages, all list pages (except CampaignList partial), all hooks, auth flow, error boundaries.

---

### M5. Hardcoded test credentials in LoginPage

**File:** `apps/web/src/pages/LoginPage.tsx`, lines 11-12

```typescript
const [email, setEmail] = useState("avery.chen@northstar.example");
const [password, setPassword] = useState("AdminPass123!");
```

Pre-filled credentials ship in the production bundle. Use environment variables to conditionally populate in dev only.

---

### M6. State initialization anti-pattern in CampaignMetricsEditPage

**File:** `apps/web/src/pages/CampaignMetricsEditPage.tsx`, lines 92-94

```typescript
if (initialRows.length > 0 && rows.length === 0) {
  setRows(initialRows);
}
```

This state update runs during render, violating React rules and risking infinite re-render loops. Move to `useEffect`.

---

### M7. No code splitting — all pages eagerly imported

**File:** `apps/web/src/App.tsx`, lines 12-25

All 15 page components are statically imported. The entire app ships as a single 525KB JS chunk.

**Fix:** Use `React.lazy()` + `Suspense` for route-level code splitting:

```typescript
const CampaignDetailPage = React.lazy(() =>
  import('./pages/CampaignDetailPage').then(m => ({ default: m.CampaignDetailPage }))
);
```

---

### M8. Docker API image uses single-stage build

**File:** `infrastructure/docker/api/Dockerfile`, lines 1-18

The production image includes dev dependencies, source TypeScript files, and build tools — inflating image size.

**Fix:** Multi-stage build: build stage with all deps, production stage copies only `dist/`, `node_modules` (pruned to production), and `prisma/`.

---

## Low

Nice-to-haves and minor cleanup.

### L1. Stale `prop-types` dependency in root package.json

**File:** `package.json`, line 26 — `"prop-types": "^15.8.1"` appears unused. React 19 with TypeScript does not need it.

---

### L2. Two PNG test screenshots tracked in git

**Files:** `test.png` (128KB), `expo-after-tap.png` (92KB) in repo root. Should be `.gitignore`d or moved to a docs directory.

---

### L3. `.env` missing variables defined in `.env.example`

**File:** `.env` is missing `API_HOST`, `API_BASE_PATH`, `REDIS_HEALTHCHECK_ENABLED`, `VITE_API_URL` compared to `.env.example`. The runtime config has defaults for all of these, so it works, but the mismatch is confusing for new developers.

---

### L4. `InfluencerRating` uses `onDelete: SetNull` for assignment FK

**File:** `db/schema.prisma`, line 538

When an action assignment is deleted, its ratings lose the `action_assignment_id` link rather than being cascade-deleted. Orphaned ratings with no assignment context may cause confusion in reports.

---

### L5. Docker staging compose has placeholder secrets

**File:** `infrastructure/docker/docker-compose.staging.yml`, lines 51, 74

```yaml
JWT_SECRET: replace-me-with-a-real-staging-secret
```

Hardcoded placeholder. Should pull from Docker secrets or environment.

---

### L6. Missing `React.memo` on pure leaf components

**Files:** `apps/web/src/components/StatusBadge.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `StarRating.tsx`

These are pure presentational components that receive simple props. Wrapping in `React.memo` avoids unnecessary re-renders in large lists.

---

### L7. `setTimeout` without cleanup on unmount

**File:** `apps/web/src/pages/InfluencerListPage.tsx`, line 346

```typescript
setTimeout(() => setClientOpen(false), 150);
```

If the component unmounts during the 150ms window, this triggers a state update on an unmounted component. Use a ref-guarded timeout or `useEffect` cleanup.

---
