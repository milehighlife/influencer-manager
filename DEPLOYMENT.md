# Deployment Guide — Railway

Deploy the Influencer Manager as three services on Railway with PostgreSQL and Redis.

## Architecture

| Service | Domain | Source |
|---------|--------|--------|
| API (NestJS) | api.devomob.com | `railway.toml` (root) |
| Admin (React) | admin.devomob.com | `apps/web/railway.toml` |
| Influencer PWA (React) | app.devomob.com | `apps/influencer/railway.toml` |

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub Repo**
3. Connect your GitHub account and select `milehighlife/influencer-manager`

## Step 2: Provision Database & Redis

1. In the project dashboard, click **+ New** → **Database** → **PostgreSQL**
2. Click **+ New** → **Database** → **Redis**
3. Railway auto-generates `DATABASE_URL` and `REDIS_URL` connection strings

## Step 3: Create the API Service

1. Click **+ New** → **GitHub Repo** → select the repo
2. Railway will detect `railway.toml` in the root — this configures the API service
3. Name the service: **API**
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (Railway reference) |
| `JWT_SECRET` | Generate a random 32+ char string |
| `JWT_EXPIRES_IN` | `1h` |
| `CORS_ALLOWED_ORIGINS` | `https://admin.devomob.com,https://app.devomob.com` |
| `ENABLE_JOB_WORKERS` | `true` |
| `REDIS_HEALTHCHECK_ENABLED` | `true` |
| `API_BASE_PATH` | `api` |

5. Railway automatically sets `PORT` — do not override it

## Step 4: Create the Admin Frontend Service

1. Click **+ New** → **GitHub Repo** → select the repo
2. Set **Root Directory** to `apps/web`
3. Name the service: **Admin**
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.devomob.com` |

5. Railway will use `apps/web/railway.toml` for build/start config
6. The build produces static files served via `npx serve`

## Step 5: Create the Influencer PWA Service

1. Click **+ New** → **GitHub Repo** → select the repo
2. Set **Root Directory** to `apps/influencer`
3. Name the service: **Influencer**
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.devomob.com` |

5. Railway will use `apps/influencer/railway.toml` for build/start config

## Step 6: Configure Custom Domains

For each service in Railway:

1. Go to **Settings** → **Networking** → **Custom Domain**
2. Add the domain:
   - API: `api.devomob.com`
   - Admin: `admin.devomob.com`
   - Influencer: `app.devomob.com`
3. Railway provides a CNAME target for each

## Step 7: DNS Configuration

At your domain registrar (for devomob.com), add CNAME records:

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `<railway-provided-target>` |
| CNAME | `admin` | `<railway-provided-target>` |
| CNAME | `app` | `<railway-provided-target>` |

Railway will auto-provision SSL certificates once DNS propagates.

## Step 8: Run Database Migrations

The API service start command includes `npm run db:deploy` which runs migrations automatically on each deploy. For the first deploy:

1. Open the API service in Railway
2. Check the deploy logs to confirm migrations ran successfully
3. To seed initial data, use Railway's CLI:

```bash
railway run npm run db:seed
```

## Step 9: Verify Health Checks

Once deployed, verify each service:

```bash
# API health
curl https://api.devomob.com/api/health/live
# Expected: {"status":"ok","service":"influencer-manager-api",...}

curl https://api.devomob.com/api/health/ready
# Expected: {"status":"ok","checks":{"database":"ok","redis":"ok"}}

# Admin frontend
curl -I https://admin.devomob.com
# Expected: 200 OK

# Influencer PWA
curl -I https://app.devomob.com
# Expected: 200 OK
```

## Step 10: Post-Deploy Checklist

- [ ] API health check returns OK
- [ ] Database migrations applied (check API logs)
- [ ] Admin login works at admin.devomob.com
- [ ] Influencer login works at app.devomob.com
- [ ] CORS allows both frontends to call the API
- [ ] JWT authentication works (login, protected routes)
- [ ] PWA manifest loads correctly (check app.devomob.com/manifest.json)
- [ ] SSL certificates active on all three domains

## Environment Variable Reference

### API Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | — | `production` |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | — | Redis connection string |
| `JWT_SECRET` | Yes | — | Auth signing key (24+ chars) |
| `JWT_EXPIRES_IN` | No | `1h` | Token expiration |
| `CORS_ALLOWED_ORIGINS` | Yes | — | Comma-separated frontend URLs |
| `ENABLE_JOB_WORKERS` | No | `false` | Enable BullMQ workers |
| `REDIS_HEALTHCHECK_ENABLED` | No | `false` | Include Redis in health check |
| `API_BASE_PATH` | No | `api` | URL prefix for all routes |
| `PORT` | Auto | 3000 | Set by Railway — do not override |

### Frontend Services (Admin & Influencer)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Full API URL (e.g., `https://api.devomob.com`) |

## Troubleshooting

**API returns 500 on startup:** Check `DATABASE_URL` is correct and the Postgres plugin is running.

**CORS errors in browser console:** Verify `CORS_ALLOWED_ORIGINS` includes the exact frontend URLs (with `https://`, no trailing slash).

**Frontend shows login but API calls fail:** Ensure `VITE_API_URL` was set *before* the build — it's baked in at build time, not runtime.

**Health check fails:** The readiness check at `/api/health/ready` requires database connectivity. Ensure the Postgres plugin is provisioned and linked.

**PWA not installable:** The manifest requires HTTPS. Custom domains with Railway auto-provision SSL.
