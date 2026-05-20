# Production Backend Architecture

## Goal

Make the PG platform production-ready with:

- user authentication
- listings database
- reviews system
- admin dashboard
- real-time availability

This design uses the existing `backend/` stack as the base:

- `Express`
- `Prisma`
- `PostgreSQL`
- `Socket.IO`
- `Redis`

## Current State

The repo is in a hybrid state:

- frontend still reads and writes heavily through Firebase Auth + Firestore
- `backend/` already exists with Express, Prisma, PostgreSQL schema, and Socket.IO
- backend routes are still placeholders
- Firestore rules are too permissive for production ownership and moderation logic

## Recommended Target State

Use the backend as the system of record for all transactional data.

### Core Services

1. API service
- Node.js + Express
- REST APIs for auth, listings, reviews, admin, availability
- versioned routes under `/api/v1`

2. Primary database
- PostgreSQL via Prisma
- normalized relational model for users, listings, rooms, beds, reviews, bookings, moderation, analytics

3. Cache and realtime coordinator
- Redis
- cache hot listing reads
- pub/sub for availability updates and invalidation
- rate-limit counters and session storage if needed

4. Realtime gateway
- Socket.IO
- room/bed availability updates
- admin moderation notifications
- booking status changes

5. Object storage
- Cloudinary or S3-compatible storage for media
- backend issues signed upload or verifies upload metadata
- store final media metadata in PostgreSQL

6. Background workers
- BullMQ or equivalent backed by Redis
- async jobs for review moderation, image verification, denormalized counters, notifications

## High-Level Architecture

```text
React Web App
  -> API Gateway / Express App
      -> Auth module
      -> Listings module
      -> Reviews module
      -> Availability module
      -> Admin module
      -> Analytics module
  -> Socket.IO Gateway

Express App
  -> PostgreSQL (source of truth)
  -> Redis (cache, rate limits, pub/sub, queues)
  -> Object Storage (images/videos)
  -> Background Workers
```

## Authentication Design

## Recommended Approach

Use backend-controlled authentication and authorization.

### Auth Model

- email + password login
- optional Google / OAuth later
- short-lived access token
- rotating refresh token
- role-based authorization with `USER`, `OWNER`, `ADMIN`

### Required Tables

- `users`
- `sessions`
- `refresh_tokens`
- `password_reset_tokens`
- `email_verification_tokens`
- `audit_logs`

### Security Requirements

- bcrypt or argon2 password hashing
- refresh token rotation and revocation
- httpOnly secure cookies for refresh token
- JWT access token for API authorization
- device/session tracking
- email verification before privileged actions
- account lockout and rate limiting for brute-force protection

### Migration Note

Because the frontend currently uses Firebase Auth, migrate in phases:

1. Phase 1:
- backend verifies Firebase identity and mirrors user records into Postgres

2. Phase 2:
- move listing, review, admin, and availability reads/writes fully to backend APIs

3. Phase 3:
- optionally migrate auth away from Firebase if you want a single auth stack

This phased approach lowers migration risk.

## Database Design

## Core Relational Model

### Users

- `id`
- `email`
- `password_hash` or external identity fields
- `role`
- `status`
- `is_banned`
- `name`
- `phone`
- `created_at`
- `updated_at`

### Listings

- `id`
- `owner_id`
- `title`
- `description`
- `city`
- `address`
- `latitude`
- `longitude`
- `target_gender`
- `nearest_college`
- `college_distance_km`
- `is_active`
- `moderation_status`
- `created_at`
- `updated_at`

### ListingPricing

- `listing_id`
- `has_ac_variant`
- `base_rent`
- `electricity`
- `food`
- `maintenance`
- `other`
- `true_cost`
- `security_deposit`
- `notice_period_days`
- `lock_in_months`

### ListingAmenities

- `listing_id`
- `amenity_code`

### Rooms

- `id`
- `listing_id`
- `name`
- `type`
- `capacity`
- `base_price`
- `current_status`

### Beds

- `id`
- `room_id`
- `status`
- `current_booking_id`

### AvailabilitySnapshots

- `listing_id`
- `available_rooms`
- `available_beds`
- `last_calculated_at`

### Reviews

- `id`
- `listing_id`
- `user_id`
- `rating`
- `title`
- `body`
- `status`
- `verified_stay`
- `helpful_count`
- `actual_monthly_pay`
- `created_at`
- `updated_at`

### ReviewRatings

- `review_id`
- `category`
- `score`

### ReviewMedia

- `id`
- `review_id`
- `type`
- `url`
- `visibility`

### ListingPhotos

- `id`
- `listing_id`
- `user_id`
- `photo_type`
- `image_url`
- `thumbnail_url`
- `verification_status`
- `is_verified`
- `capture_context`
- `authenticity_notes`
- `before_image_url`
- `after_image_url`
- `before_after_description`
- `created_at`

### Bookings

- `id`
- `listing_id`
- `user_id`
- `status`
- `start_date`
- `end_date`
- `total_amount`
- `created_at`
- `updated_at`

### BookingBeds

- `booking_id`
- `bed_id`

### VisitRequests

- `id`
- `listing_id`
- `user_id`
- `status`
- `requested_at`
- `scheduled_for`

### Reports

- `id`
- `target_type`
- `target_id`
- `reporter_user_id`
- `reason`
- `status`

### AnalyticsEvents

- `id`
- `session_id`
- `user_id`
- `event_name`
- `stage`
- `path`
- `payload_json`
- `created_at`

## Indexing Strategy

Create indexes for:

- listings by `city`, `is_active`, `target_gender`, `moderation_status`
- reviews by `listing_id`, `status`, `created_at`
- bookings by `listing_id`, `status`, date ranges
- beds by `room_id`, `status`
- analytics by `event_name`, `stage`, `created_at`
- photos by `listing_id`, `verification_status`, `created_at`

## API Surface

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Listings

- `GET /api/v1/listings`
- `GET /api/v1/listings/:id`
- `POST /api/v1/listings`
- `PATCH /api/v1/listings/:id`
- `POST /api/v1/listings/:id/submit-for-review`
- `POST /api/v1/listings/:id/photos`

## Reviews

- `GET /api/v1/listings/:id/reviews`
- `POST /api/v1/listings/:id/reviews`
- `PATCH /api/v1/reviews/:id`
- `POST /api/v1/reviews/:id/helpful`
- `POST /api/v1/reviews/:id/reply`

## Availability

- `GET /api/v1/listings/:id/availability`
- `POST /api/v1/listings/:id/availability/hold`
- `POST /api/v1/bookings`
- `PATCH /api/v1/bookings/:id/status`

## Admin

- `GET /api/v1/admin/listings`
- `PATCH /api/v1/admin/listings/:id/moderation`
- `GET /api/v1/admin/reviews`
- `PATCH /api/v1/admin/reviews/:id/moderation`
- `GET /api/v1/admin/photos`
- `PATCH /api/v1/admin/photos/:id/moderation`
- `GET /api/v1/admin/analytics/summary`

## Recommended Backend Folder Layout

Use the existing `backend/src` folder as a modular service boundary, not a flat route dump.

```text
backend/src
  /config
    env.ts
    cors.ts
    rateLimit.ts
  /lib
    prisma.ts
    redis.ts
    socket.ts
    logger.ts
  /middlewares
    auth.ts
    requireRole.ts
    errorHandler.ts
    validate.ts
  /modules
    /auth
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.routes.ts
      auth.schema.ts
    /users
    /listings
    /reviews
    /availability
    /bookings
    /admin
    /photos
    /analytics
  /workers
    bookingHoldExpiry.worker.ts
    reviewAggregation.worker.ts
    photoModeration.worker.ts
  /events
    availability.events.ts
    admin.events.ts
  app.ts
  server.ts
```

### Why This Structure

- controllers stay thin
- services own business logic
- repositories isolate Prisma access
- schemas centralize request validation
- workers keep slow or non-blocking jobs off the request path

## Real-Time Availability Design

## Source of Truth

Availability must come from the booking tables in Postgres, not from frontend state.

## Flow

1. user opens listing detail
2. frontend fetches current room/bed availability from API
3. frontend subscribes to Socket.IO room `listing:{id}`
4. booking/hold/expiry changes trigger backend recomputation
5. backend emits updated snapshot to subscribed clients

## Concurrency Controls

- use DB transactions for booking and hold creation
- lock bed rows with `SELECT ... FOR UPDATE`
- use short-lived reservation holds
- auto-expire stale holds via background worker

## Why This Matters

Without transactional locking, two users can book the same bed.

## Reviews System Design

### Rules

- one verified review per completed stay per user per listing
- draft vs pending vs approved moderation states
- owner replies stored separately with audit metadata
- denormalized rating aggregates updated asynchronously

### Anti-Abuse

- verified-stay flag tied to bookings
- review edit window
- spam detection and rate limiting
- moderation queue for flagged content

## Admin Dashboard Design

Admin dashboard should be API-driven, not direct database reads from the browser.

### Modules

- listing moderation
- review moderation
- photo moderation
- user ban / role management
- analytics summary
- operational health

### Required Backend Capabilities

- role-guarded endpoints
- audit logs for all admin actions
- bulk moderation operations
- moderation reasons and history

## Real-Time + Background Jobs

Use workers for:

- booking hold expiry
- aggregate rating recompute
- listing denormalized counters
- image moderation / verification checks
- analytics rollups
- notifications

## Caching Strategy

Cache these read-heavy surfaces:

- homepage listing cards
- listing detail payload
- analytics summary snapshots

Use Redis with:

- short TTL for listing search results
- event-driven invalidation on listing/review/photo updates

Do not cache booking writes or anything that can violate availability correctness.

## Security and Production Hardening

### API Security

- helmet
- strict CORS allowlist
- Zod request validation
- rate limits by IP and user
- request ids and structured logging
- idempotency keys for booking and payment flows

### Data Security

- least-privilege DB user
- secrets only via env / secret manager
- encrypted backups
- PII minimization

### Auditability

- audit log for admin actions
- moderation decision history
- login/session event tracking

## Deployment Topology

## Recommended

- frontend on Firebase Hosting or Vercel
- backend API on Fly.io / Render / Railway / ECS / Cloud Run
- PostgreSQL on managed provider
- Redis on managed provider
- object storage on Cloudinary or S3

## Environments

- local
- staging
- production

Each environment needs isolated:

- database
- redis
- object storage bucket/preset
- JWT secrets
- CORS origins

## Observability

Add:

- structured logs
- error tracking
- metrics
- uptime checks
- slow query visibility

Minimum dashboards:

- API latency
- error rate
- DB connection pool saturation
- queue depth
- websocket connection count
- booking failure rate

## Migration Plan

## Phase 0: Stabilize Existing Backend

- convert placeholder routes into real modules
- add Prisma client integration correctly
- add auth middleware
- add config validation

## Phase 1: Postgres as Source of Truth for Core Data

- users
- listings
- reviews
- bookings

Frontend still allowed to use Firebase Auth temporarily.

## Phase 2: Move Admin and Moderation to Backend APIs

- remove direct Firestore admin reads/writes from frontend
- all privileged actions flow through backend RBAC

## Phase 3: Real-Time Availability

- implement holds, bookings, and websocket updates
- add Redis-backed pub/sub and worker jobs

## Phase 4: Decommission Firestore Transactional Writes

- keep Firebase only for hosting or authentication if desired
- otherwise complete migration to backend auth + Postgres

## Immediate Engineering Priorities

1. Treat `backend/` as the target production backend and stop adding new direct-write business logic to Firestore.
2. Implement backend auth middleware and role guards first.
3. Move listings, reviews, and admin moderation to Postgres-backed APIs.
4. Add booking + room/bed availability transactions before exposing real-time availability to users.
5. Keep analytics and media as supporting systems, not the source of truth for core booking data.

## Execution Sequence

Build in this order:

1. `config`, `lib`, and `middlewares`
2. auth module
3. listings read/write module
4. reviews + moderation module
5. bookings + availability transaction flow
6. websocket event fanout
7. admin analytics and audit logging

This order reduces migration risk because auth and ownership rules are established before you move high-value write paths.

## Final Recommendation

For this repo, the most scalable path is not "double down on Firestore."

The better production-ready design is:

- React frontend
- Express API
- PostgreSQL + Prisma as system of record
- Redis for cache, queues, and realtime fanout
- Socket.IO for availability updates
- background workers for denormalization and moderation

That aligns with the backend scaffold already present in the repository and gives you a clean path from prototype to production.
