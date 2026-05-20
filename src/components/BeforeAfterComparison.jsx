import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export default function BeforeAfterComparison({ pgId, refreshKey = 0 }) {
  const [comparisons, setComparisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedComparison, setSelectedComparison] = useState(null)

  useEffect(() => {
    const loadComparisons = async () => {
      setLoading(true)
      try {
        const comparisonQuery = query(
          collection(db, 'pg_photos'),
          where('pgId', '==', pgId),
          where('photoType', '==', 'before-after'),
          where('moderation.isHidden', '==', false),
          orderBy('metadata.uploadDate', 'desc')
        )

        const snapshot = await getDocs(comparisonQuery)
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((photo) => photo.beforeAfterPair?.beforeImageURL && photo.beforeAfterPair?.afterImageURL)

        setComparisons(rows)
      } catch (error) {
        console.error('Error loading before/after photos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadComparisons()
  }, [pgId, refreshKey])

  if (loading) {
    return <div className="before-after-loading">Loading comparisons...</div>
  }

  if (comparisons.length === 0) {
    return (
      <div className="no-comparisons">
        <p>No before / after comparisons yet.</p>
        <small>Residents can document upgrades, repairs, and cleanliness improvements here.</small>
      </div>
    )
  }

  return (
    <div className="before-after-comparisons">
      <div className="comparisons-header">
        <h3>Before / After Proof</h3>
        <p>Resident-submitted comparisons that show how the property has changed over time.</p>
      </div>

      <div className="comparisons-grid">
        {comparisons.map((comparison) => (
          <div
            key={comparison.id}
            className="comparison-card"
            onClick={() => setSelectedComparison(comparison)}
          >
            <div className="comparison-preview">
              <div className="preview-slider">
                <img
                  src={comparison.beforeAfterPair.afterImageURL}
                  alt="After"
                  className="preview-after"
                />
                <div className="preview-before-overlay">
                  <img
                    src={comparison.beforeAfterPair.beforeImageURL}
                    alt="Before"
                    className="preview-before"
                  />
                </div>
                <div className="preview-labels">
                  <span className="preview-before-label">Before</span>
                  <span className="preview-after-label">After</span>
                </div>
              </div>
            </div>

            <div className="comparison-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                <span className={comparison.isVerified ? 'verified-badge' : 'tag'}>
                  {comparison.isVerified ? 'Verified' : 'Pending review'}
                </span>
                <span className="comparison-date">
                  {comparison.metadata?.uploadDate?.seconds
                    ? new Date(comparison.metadata.uploadDate.seconds * 1000).toLocaleDateString()
                    : ''}
                </span>
              </div>
              {comparison.beforeAfterPair.description ? (
                <p className="comparison-summary">
                  {comparison.beforeAfterPair.description.length > 110
                    ? `${comparison.beforeAfterPair.description.slice(0, 110)}...`
                    : comparison.beforeAfterPair.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {selectedComparison ? (
        <div className="comparison-modal-overlay" onClick={() => setSelectedComparison(null)}>
          <div className="comparison-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Before / After Comparison</h3>
              <button className="close-btn" onClick={() => setSelectedComparison(null)}>x</button>
            </div>

            <div className="modal-content">
              <div className="comparison-slider-container">
                <div className="comparison-slider" style={{ position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={selectedComparison.beforeAfterPair.afterImageURL}
                    alt="After"
                    className="after-image"
                  />
                  <div className="before-image-container" style={{ width: '50%' }}>
                    <img
                      src={selectedComparison.beforeAfterPair.beforeImageURL}
                      alt="Before"
                      className="before-image"
                    />
                  </div>
                  <div className="slider-handle" style={{ left: '50%' }}>
                    <div className="slider-line"></div>
                    <div className="slider-button">||</div>
                  </div>
                </div>
                <div className="comparison-labels">
                  <span className="before-label">Before</span>
                  <span className="after-label">After</span>
                </div>
              </div>

              {selectedComparison.beforeAfterPair.description ? (
                <div className="comparison-description">
                  <p>{selectedComparison.beforeAfterPair.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
