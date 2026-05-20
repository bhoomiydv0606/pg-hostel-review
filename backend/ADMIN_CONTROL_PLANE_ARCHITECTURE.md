# Admin Control Plane Architecture

## Goal

Rebuild the PG platform admin as a production-ready control plane that can safely operate:

- listings and pricing quality
- review and photo moderation
- user governance
- analytics and product signals
- real-time availability oversight

The admin should not behave like a client-side utility screen. It should behave like an internal SaaS product backed by audited APIs, role-based permissions, and backend-owned aggregates.

## Operating Principles

1. The admin backend is the source of truth for privileged actions.
2. Every destructive or trust-sensitive action must be auditable.
3. Admin dashboards should read from summary endpoints, not fan out client-side joins across collections.
4. Moderation queues should be asynchronous and queue-backed.
5. Availability and trust signals should update in near real time.

## Target Service Topology

```text
Admin Web App
  -> Admin API Gateway (/api/v1/admin/*)
      -> AuthZ / RBAC service
      -> Listings service
      -> Reviews service
      -> Media moderation service
      -> Users and policy service
      -> Analytics service
      -> System health service

Admin API Gateway
  -> PostgreSQL (source of truth)
  -> Redis (cache, pub/sub, queues, rate limits)
  -> Object storage (images, videos, before-after media)
  -> Worker queues (moderation, analytics aggregation, notifications)
  -> Socket.IO / event stream (real-time alerts, availability changes)
```

## Admin Domain Modules

### 1. Identity and access

- Roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SUPPORT`, `ANALYST`
- Permission scopes:
  - listings:read/write
  - reviews:moderate
  - photos:moderate
  - users:suspend
  - analytics:read
  - system:read
- Requirements:
  - short-lived access tokens
  - rotating refresh tokens
  - forced re-authentication for high-risk actions
  - IP / device logging for privileged sessions
  - step-up verification for role escalation

### 2. Listings control

Admin capabilities:

- approve, deactivate, or soft-delete listings
- inspect trust completeness
- verify transparent pricing coverage
- enforce data quality rules for college mapping and contact details

Backend model additions:

- `listing_moderation_events`
- `listing_quality_snapshots`
- `listing_pricing_audits`
- `listing_status_history`

### 3. Reviews moderation

Admin capabilities:

- approve or reject pending reviews
- inspect proof metadata
- flag suspicious submissions
- recalculate denormalized ratings safely

Backend requirements:

- transactional review approval flow
- moderation reasons and moderator identity
- abuse heuristics and duplicate detection
- background recomputation of aggregate ratings

### 4. Photo and media moderation

Admin capabilities:

- verify resident uploads
- approve or reject before-after submissions
- hide media with policy reasons
- track reviewer notes and moderation timestamps

Backend requirements:

- signed uploads
- media metadata normalization
- object storage lifecycle policies
- moderation queue with retry-safe jobs

### 5. User governance

Admin capabilities:

- suspend or restore users
- inspect role and trust state
- review owner account mix
- audit privileged actions and policy history

Backend requirements:

- `user_status_events`
- `admin_audit_logs`
- ban / restore policies with reason codes
- support for temporary suspensions and appeal states

### 6. Analytics and product intelligence

Admin capabilities:

- most searched filters
- most viewed PGs
- funnel drop-off points
- conversion intent trends
- trust coverage by inventory cohort

Backend requirements:

- append-only event stream
- session-level funnel aggregation jobs
- warehouse-friendly export path
- cached overview summaries for dashboard reads

### 7. Real-time availability oversight

Admin capabilities:

- inspect live room and bed availability
- review booking holds and expiration jobs
- see inventory sync failures

Backend requirements:

- Redis-backed hold management
- Socket.IO or event bus updates
- reconciliation jobs for drift recovery

## Recommended Admin API Surface

```text
GET    /api/v1/admin/overview
GET    /api/v1/admin/listings?status=&city=&page=
PATCH  /api/v1/admin/listings/:listingId
PATCH  /api/v1/admin/listings/:listingId/moderation
GET    /api/v1/admin/reviews?status=pending
PATCH  /api/v1/admin/reviews/:reviewId
GET    /api/v1/admin/photos?status=pending
PATCH  /api/v1/admin/photos/:photoId
GET    /api/v1/admin/users?role=&status=
PATCH  /api/v1/admin/users/:userId/status
GET    /api/v1/admin/analytics/funnel
GET    /api/v1/admin/analytics/search-signals
GET    /api/v1/admin/system/health
GET    /api/v1/admin/audit-logs
```

## Data Strategy

### Source of truth

- PostgreSQL for users, listings, moderation state, availability, and admin audit history

### Derived summary tables

- `admin_overview_daily`
- `listing_quality_snapshot`
- `funnel_stage_rollups`
- `moderation_queue_rollups`

These should be updated asynchronously so the admin dashboard reads pre-aggregated views instead of rebuilding metrics inside the browser.

## Observability and Safety

Required production controls:

- audit logs for every privileged mutation
- structured logs with request id and admin user id
- metrics for queue depth, moderation latency, and API error rate
- alerting for backlog spikes, auth anomalies, and inventory sync failures
- feature flags for new admin tools
- soft delete and rollback for trust-sensitive actions

## Migration Path

### Phase 1

- keep current Firebase-driven UI
- add backend summary endpoints for overview metrics
- log every admin action into an audit trail

### Phase 2

- move listings, reviews, photos, and user governance behind backend APIs
- stop direct browser writes for admin-critical mutations
- cache summary endpoints in Redis

### Phase 3

- add queue-backed moderation workers
- move analytics aggregation to backend jobs
- add real-time availability and incident alerts

## Current Frontend Rebuild Alignment

The current admin rebuild in `src/pages/AdminPage.jsx` is aligned to this target model:

- command center for overview metrics
- dedicated analytics surface
- dedicated system-control surface
- separate operational lanes for listings, reviews, photos, and users

That frontend structure is the right information architecture for the future backend control plane.
