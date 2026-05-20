import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { buildAdminSummary } from '../utils/adminInsights'

function toRecords(snapshot) {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

function formatTime(date) {
  if (!date) return 'Not refreshed yet'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AdminCommandCenter({ onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [summary, setSummary] = useState(() => buildAdminSummary({}))
  const [atGlance, setAtGlance] = useState({ pgs: 0, users: 0, reviews: 0, pending: 0 })

  const loadSummary = async () => {
    setLoading(true)
    setError('')

    try {
      const tasks = await Promise.allSettled([
        getDocs(collection(db, 'pgs')),
        getDocs(collection(db, 'reviews')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'pg_photos')),
        getDocs(query(collection(db, 'analytics_events'), orderBy('createdAt', 'desc'), limit(2000)))
      ])

      const [pgsResult, reviewsResult, usersResult, photosResult, eventsResult] = tasks
      const failures = tasks.filter((result) => result.status === 'rejected')

      const pgs = pgsResult.status === 'fulfilled' ? toRecords(pgsResult.value) : []
      const reviews = reviewsResult.status === 'fulfilled' ? toRecords(reviewsResult.value) : []
      const users = usersResult.status === 'fulfilled' ? toRecords(usersResult.value) : []
      const photos = photosResult.status === 'fulfilled' ? toRecords(photosResult.value) : []
      const events = eventsResult.status === 'fulfilled' ? toRecords(eventsResult.value) : []

      const pendingReviews = reviews.filter((review) => review.status === 'pending').length
      const pendingPhotos = photos.filter((photo) => photo.verificationStatus === 'pending').length

      const nextSummary = buildAdminSummary({
        pgs,
        reviews,
        users,
        photos,
        events
      })

      setAtGlance({
        pgs: pgs.length,
        users: users.length,
        reviews: reviews.length,
        pending: pendingReviews + pendingPhotos
      })
      setSummary(nextSummary)
      setLastUpdated(new Date())

      if (failures.length > 0) {
        setError('Some admin signals could not be loaded. The dashboard is showing partial data.')
      }
    } catch (loadError) {
      console.error('Error loading admin command center:', loadError)
      setError('Unable to load the command center right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [])

  if (loading) {
    return (
      <div className="admin-loading-shell">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="admin-command-center animate-fade-in">
      <section className="admin-hero-panel" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div>
          <div className="admin-section-eyebrow">Snapshot</div>
          <h2 className="admin-hero-title" style={{ marginBottom: 8 }}>5-second admin overview</h2>
          <p className="admin-hero-copy" style={{ marginBottom: 12 }}>
            Key totals and pending approvals only. Refresh anytime to keep this snapshot current.
          </p>
          <div className="admin-inline-actions" style={{ maxWidth: 260 }}>
            <button className="btn btn-primary" type="button" onClick={loadSummary}>
              Refresh
            </button>
          </div>
          <div className="admin-live-note">Last synced at {formatTime(lastUpdated)}</div>
        </div>
      </section>

      {error && (
        <div className="alert alert-success" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <section className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <article className="admin-metric-card">
          <div className="admin-metric-label">Total PGs</div>
          <div className="admin-metric-value">{atGlance.pgs}</div>
          <div className="admin-metric-helper">Live + draft inventory</div>
        </article>
        <article className="admin-metric-card">
          <div className="admin-metric-label">Total Users</div>
          <div className="admin-metric-value">{atGlance.users}</div>
          <div className="admin-metric-helper">Owners + residents</div>
        </article>
        <article className="admin-metric-card">
          <div className="admin-metric-label">Total Reviews</div>
          <div className="admin-metric-value">{atGlance.reviews}</div>
          <div className="admin-metric-helper">All statuses</div>
        </article>
        <article className="admin-metric-card">
          <div className="admin-metric-label">Pending approvals</div>
          <div className="admin-metric-value">{atGlance.pending}</div>
          <div className="admin-metric-helper">Reviews + photos</div>
        </article>
      </section>

      <section className="admin-panel" style={{ marginTop: 18 }}>
        <div className="admin-panel-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="admin-section-eyebrow">Pending share</div>
            <h3 className="admin-panel-title" style={{ fontSize: 22, margin: 0 }}>Approvals load</h3>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--color-muted)' }}>Pending vs total reviews/photos</span>
            <strong style={{ color: 'var(--color-ebony)' }}>
              {atGlance.pending} pending / {Math.max(atGlance.reviews, 0) || '—'} total
            </strong>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: 'rgba(148, 163, 184, 0.16)', overflow: 'hidden' }}>
            <div
              style={{
                width: atGlance.reviews > 0 ? `${Math.min(100, Math.round((atGlance.pending / Math.max(atGlance.reviews, 1)) * 100))}%` : '0%',
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #10b981)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
