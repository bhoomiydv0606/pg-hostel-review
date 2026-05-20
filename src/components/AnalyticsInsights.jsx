import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { buildAnalyticsSummary } from '../utils/adminInsights'

function toRecords(snapshot) {
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

export default function AnalyticsInsights() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(() => buildAnalyticsSummary([]))

  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true)
      try {
        const eventQuery = query(
          collection(db, 'analytics_events'),
          orderBy('createdAt', 'desc'),
          limit(2000)
        )
        const snapshot = await getDocs(eventQuery)
        setSummary(buildAnalyticsSummary(toRecords(snapshot)))
      } catch (error) {
        console.error('Error loading analytics insights:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInsights()
  }, [])

  if (loading) {
    return <div className="spinner" style={{ marginTop: 80 }} />
  }

  return (
    <div className="admin-analytics-view animate-fade-in">
      <section className="admin-metric-grid">
        {[
          {
            label: 'Tracked events',
            value: summary.totalEvents,
            helper: 'Behavior signals captured from the live product'
          },
          {
            label: 'Tracked sessions',
            value: summary.uniqueSessions,
            helper: 'Unique user journeys reaching the funnel'
          },
          {
            label: 'PG detail views',
            value: summary.pgViews,
            helper: 'Listing pages that earned attention'
          },
          {
            label: 'Contact intent',
            value: summary.contactIntents,
            helper: 'Users trying to reach owners'
          },
          {
            label: 'Review intent',
            value: summary.reviewIntents,
            helper: 'Users attempting to contribute trust data'
          },
          {
            label: 'Search events',
            value: summary.searchEvents,
            helper: 'Searches and filters that shaped discovery'
          }
        ].map((metric) => (
          <article key={metric.label} className="admin-metric-card">
            <div className="admin-metric-label">{metric.label}</div>
            <div className="admin-metric-value">{metric.value}</div>
            <div className="admin-metric-helper">{metric.helper}</div>
          </article>
        ))}
      </section>

      <section className="admin-system-columns">
        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <div className="admin-section-eyebrow">Search intelligence</div>
              <h3 className="admin-panel-title">Most searched filters</h3>
            </div>
          </div>

          {summary.topFilters.length === 0 ? (
            <div className="admin-empty-copy">No filter usage captured yet.</div>
          ) : (
            <div className="admin-list-block">
              {summary.topFilters.map((item) => (
                <div key={item.label} className="admin-list-row">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <div className="admin-section-eyebrow">Demand signals</div>
              <h3 className="admin-panel-title">Most viewed PGs</h3>
            </div>
          </div>

          {summary.topViewedPGs.length === 0 ? (
            <div className="admin-empty-copy">No PG detail views tracked yet.</div>
          ) : (
            <div className="admin-list-block">
              {summary.topViewedPGs.map((item) => (
                <div key={item.id} className="admin-list-row">
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <div className="admin-section-eyebrow">Funnel intelligence</div>
            <h3 className="admin-panel-title">Where student journeys currently stop</h3>
          </div>
        </div>

        {summary.dropOffStages.length === 0 ? (
          <div className="admin-empty-copy">No funnel data available yet.</div>
        ) : (
          <div className="admin-coverage-stack">
            {summary.dropOffStages.map((item) => (
              <div key={item.stage} className="admin-coverage-item">
                <div className="admin-coverage-topline">
                  <div>
                    <div className="admin-coverage-label">{item.stage}</div>
                    <div className="admin-coverage-detail">Sessions whose deepest stage ended here</div>
                  </div>
                  <div className="admin-coverage-value">{item.count}</div>
                </div>
                <div className="admin-coverage-bar">
                  <div
                    className="admin-coverage-bar-fill"
                    style={{
                      width: `${summary.uniqueSessions ? Math.round((item.count / summary.uniqueSessions) * 100) : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
