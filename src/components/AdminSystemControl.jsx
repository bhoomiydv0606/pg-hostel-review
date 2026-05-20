const DOMAIN_CARDS = [
  {
    title: 'Identity and access',
    body: 'Centralize admin access with RBAC, session rotation, audit trails, and scoped permissions for support, moderation, and super-admin roles.'
  },
  {
    title: 'Listings control',
    body: 'Move listing writes behind admin APIs so pricing, activation, trust badges, and policy actions become server-authoritative.'
  },
  {
    title: 'Reviews and trust',
    body: 'Use moderation queues, evidence states, and denormalized aggregates to keep public trust scores accurate and review abuse contained.'
  },
  {
    title: 'Media verification',
    body: 'Store upload metadata, verification outcomes, and hidden-state reasons in a dedicated media service backed by object storage and queues.'
  },
  {
    title: 'Analytics pipeline',
    body: 'Ingest platform events into a warehouse-friendly stream so product teams can query funnels, search intent, and drop-off behavior safely.'
  },
  {
    title: 'Availability and sync',
    body: 'Real-time occupancy, booking holds, and admin notifications should publish through Redis and Socket.IO rather than client-side polling.'
  }
]

const API_SURFACE = [
  'GET    /api/v1/admin/overview',
  'GET    /api/v1/admin/listings?status=&city=&page=',
  'PATCH  /api/v1/admin/listings/:listingId',
  'PATCH  /api/v1/admin/listings/:listingId/moderation',
  'GET    /api/v1/admin/reviews?status=pending',
  'PATCH  /api/v1/admin/reviews/:reviewId',
  'GET    /api/v1/admin/photos?status=pending',
  'PATCH  /api/v1/admin/photos/:photoId',
  'GET    /api/v1/admin/users?role=&status=',
  'PATCH  /api/v1/admin/users/:userId/status',
  'GET    /api/v1/admin/analytics/funnel',
  'GET    /api/v1/admin/system/health'
]

const CONTROL_CAPABILITIES = [
  'RBAC with ADMIN, MODERATOR, SUPPORT, and ANALYST roles',
  'Soft deletes and reversible moderation actions',
  'Immutable audit logs for listing, review, and user changes',
  'Queue-backed image verification and moderation workflows',
  'Rate limiting, abuse controls, and incident alerting',
  'Feature flags for staged rollout of admin tools',
  'Operational dashboards backed by API aggregates, not client joins',
  'Read replicas or cached summary tables for heavy analytics views'
]

const ROLLOUT_PHASES = [
  {
    title: 'Phase 1',
    body: 'Keep the current Firebase-driven UI, but route admin overview metrics through a backend summary endpoint and add audit logs for every privileged action.'
  },
  {
    title: 'Phase 2',
    body: 'Move listings, moderation, and user governance to the backend control plane so only approved APIs can change trust-critical records.'
  },
  {
    title: 'Phase 3',
    body: 'Promote analytics, media verification, and availability into separate services with queues, object storage, and real-time event fanout.'
  }
]

export default function AdminSystemControl() {
  return (
    <div className="admin-system-control animate-fade-in">
      <section className="admin-system-hero">
        <div>
          <div className="admin-section-eyebrow">Production Architecture</div>
          <h2 className="admin-panel-title" style={{ fontSize: '36px', marginBottom: '12px' }}>
            Control-plane design for a scalable PG operations stack
          </h2>
          <p className="admin-hero-copy" style={{ maxWidth: '760px', marginBottom: 0 }}>
            The admin should operate as a secure control plane over listings, trust, analytics, and availability. That means role-scoped APIs, auditability, queue-backed moderation, and backend-owned aggregates instead of direct browser writes.
          </p>
        </div>
      </section>

      <section className="admin-system-grid">
        {DOMAIN_CARDS.map((card) => (
          <article key={card.title} className="admin-system-card">
            <div className="admin-system-card-title">{card.title}</div>
            <div className="admin-system-card-body">{card.body}</div>
          </article>
        ))}
      </section>

      <section className="admin-system-columns">
        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <div className="admin-section-eyebrow">Backend Contract</div>
              <h3 className="admin-panel-title">Recommended admin API surface</h3>
            </div>
          </div>

          <pre className="admin-code-block">
{API_SURFACE.join('\n')}
          </pre>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <div className="admin-section-eyebrow">Governance Checklist</div>
              <h3 className="admin-panel-title">Capabilities required for production readiness</h3>
            </div>
          </div>

          <div className="admin-checklist">
            {CONTROL_CAPABILITIES.map((item) => (
              <div key={item} className="admin-checklist-item">
                <span className="admin-checklist-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <div className="admin-section-eyebrow">Migration Path</div>
            <h3 className="admin-panel-title">How to move from the current dashboard to a real admin control plane</h3>
          </div>
        </div>

        <div className="admin-rollout-grid">
          {ROLLOUT_PHASES.map((phase) => (
            <article key={phase.title} className="admin-rollout-card">
              <div className="admin-rollout-title">{phase.title}</div>
              <div className="admin-rollout-body">{phase.body}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
