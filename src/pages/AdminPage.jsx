import { useState, lazy, Suspense, useMemo, useCallback } from 'react'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

const AdminListings = lazy(() => import('../components/AdminListings'))
const AdminReviews = lazy(() => import('../components/AdminReviews'))
const AdminUsers = lazy(() => import('../components/AdminUsers'))
const PhotoModerationPanel = lazy(() => import('../components/PhotoModerationPanel'))
const AnalyticsInsights = lazy(() => import('../components/AnalyticsInsights'))
const AdminCommandCenter = lazy(() => import('../components/AdminCommandCenter'))
const AdminSystemControl = lazy(() => import('../components/AdminSystemControl'))

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      {
        key: 'overview',
        label: 'Command center',
        description: 'Platform health, trust coverage, and operating alerts'
      },
      {
        key: 'analytics',
        label: 'Analytics',
        description: 'Search behavior, viewed PGs, and funnel drop-off'
      },
      {
        key: 'system',
        label: 'System control',
        description: 'Backend architecture, API surface, and rollout plan'
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        key: 'listings',
        label: 'Listings',
        description: 'Catalog management, pricing quality, and activation'
      },
      {
        key: 'reviews',
        label: 'Reviews',
        description: 'Moderate resident proof, ratings, and approval queue'
      },
      {
        key: 'photos',
        label: 'Photos',
        description: 'Verify resident uploads, before-after media, and evidence'
      }
    ]
  },
  {
    label: 'Governance',
    items: [
      {
        key: 'users',
        label: 'Users',
        description: 'Access control, suspensions, and account oversight'
      }
    ]
  }
]

const TAB_META = {
  overview: {
    eyebrow: 'Admin overview',
    title: 'Command center',
    description: 'Monitor inventory quality, moderation pressure, analytics signals, and trust coverage in one place.'
  },
  analytics: {
    eyebrow: 'Product analytics',
    title: 'Usage intelligence',
    description: 'Track filters, listing demand, and where student journeys drop off.'
  },
  system: {
    eyebrow: 'Architecture and control',
    title: 'System control',
    description: 'Define how admin operations should scale across auth, moderation, analytics, and backend services.'
  },
  listings: {
    eyebrow: 'Catalog operations',
    title: 'Listings control',
    description: 'Manage live PG inventory, pricing structure, metadata quality, and activation state.'
  },
  reviews: {
    eyebrow: 'Trust operations',
    title: 'Review moderation',
    description: 'Approve resident evidence, keep ratings credible, and protect trust signals.'
  },
  photos: {
    eyebrow: 'Media moderation',
    title: 'Photo verification',
    description: 'Validate resident uploads, before-after media, and authenticity context.'
  },
  users: {
    eyebrow: 'Governance',
    title: 'User administration',
    description: 'Control account access, suspensions, and owner versus resident oversight.'
  }
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('overview')
  const [msg, setMsg] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  const activeMeta = useMemo(() => TAB_META[tab], [tab])

  const goToTab = useCallback((nextTab) => {
    setTab(nextTab)
    setMsg('')
    setNavOpen(false)
  }, [])

  const renderContent = () => {
    if (tab === 'overview') {
      return <AdminCommandCenter onNavigate={goToTab} />
    }

    if (tab === 'analytics') {
      return <AnalyticsInsights />
    }

    if (tab === 'system') {
      return <AdminSystemControl />
    }

    if (tab === 'listings') {
      return <AdminListings setMsg={setMsg} />
    }

    if (tab === 'reviews') {
      return <AdminReviews setMsg={setMsg} />
    }

    if (tab === 'photos') {
      return <PhotoModerationPanel />
    }

    return <AdminUsers setMsg={setMsg} />
  }

  if (authLoading) {
    return <div className="spinner" style={{ marginTop: 100 }} />
  }

  if (!user || !isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-card responsive-page-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '56px' }}>
          <div className="admin-section-eyebrow" style={{ marginBottom: '12px' }}>Restricted access</div>
          <h2 style={{ marginBottom: '16px', fontSize: '30px' }}>Admin credentials required</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
            Sign in with an administrative account to open the platform control plane.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} onClick={() => { window.location.href = '/login' }}>
            Go to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell animate-fade-in">
      <aside className={`admin-rail ${navOpen ? 'is-open' : ''}`}>
        <div className="admin-rail-brand">
          <div className="admin-rail-logo">PG Ops Cloud</div>
          <div className="admin-rail-caption">Production admin for inventory, trust, and growth</div>
        </div>

        <div className="admin-rail-groups">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="admin-rail-group">
              <div className="admin-rail-group-label">{section.label}</div>
              <div className="admin-rail-links">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`admin-rail-link ${tab === item.key ? 'is-active' : ''}`}
                    onClick={() => goToTab(item.key)}
                  >
                    <span className="admin-rail-link-title">{item.label}</span>
                    <span className="admin-rail-link-body">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="admin-rail-footer">
          <div className="admin-rail-user-label">Signed in as</div>
          <div className="admin-rail-user-email">{user.email}</div>
          <button className="btn btn-outline" type="button" onClick={() => auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-workspace">
        <div className="admin-mobile-toggle">
          <button className="btn btn-outline btn-sm" type="button" onClick={() => setNavOpen((v) => !v)}>
            {navOpen ? 'Close menu' : 'Menu'}
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            paddingBottom: 18,
            marginBottom: 18,
            borderBottom: '1px solid rgba(148, 163, 184, 0.18)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 520 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="search"
                placeholder="Search admin data (users, listings, reviews)..."
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: 14,
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(100, 116, 139, 0.9)',
                  fontSize: 14
                }}
              >
                🔍
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#eef2f7',
                display: 'grid',
                placeItems: 'center',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: 14,
                textTransform: 'uppercase'
              }}
            >
              {user.email?.slice(0, 1) || 'A'}
            </div>
            <div style={{ lineHeight: 1.4, textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Admin</div>
              <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>{user.email}</div>
            </div>
          </div>
        </div>

        <header className="admin-workspace-header">
          <div>
            <div className="admin-section-eyebrow">{activeMeta.eyebrow}</div>
            <h1 className="admin-workspace-title">{activeMeta.title}</h1>
            <p className="admin-workspace-copy">{activeMeta.description}</p>
          </div>

          <div className="admin-workspace-actions">
            {tab !== 'overview' && (
              <button className="btn btn-outline" type="button" onClick={() => setTab('overview')}>
                Open overview
              </button>
            )}
            {tab !== 'reviews' && (
              <button className="btn btn-primary" type="button" onClick={() => setTab('reviews')}>
                Moderate trust
              </button>
            )}
          </div>
        </header>

        {msg && (
          <div className="alert alert-success animate-fade-in" style={{ marginBottom: '24px' }}>
            {msg}
          </div>
        )}

        <div className="admin-stage">
          <Suspense fallback={<div className="admin-loading-shell"><div className="spinner" /></div>}>
            {renderContent()}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
