import { useState } from 'react'
import PGComparison from './PGComparison'

export default function ComparisonModal({ isOpen, onClose, selectedPGs, onToggleSelection, onClearSelection }) {
  const [showComparison, setShowComparison] = useState(false)

  const handleViewComparison = () => {
    if (selectedPGs.length >= 2) {
      setShowComparison(true)
    }
  }

  const handleCloseComparison = () => {
    setShowComparison(false)
  }

  const handleRemovePG = (pgId) => {
    onToggleSelection(pgId)
  }

  if (!isOpen) return null

  if (showComparison) {
    return (
      <div className="modal-overlay" onClick={handleCloseComparison}>
        <div className="modal-content comparison-modal" onClick={e => e.stopPropagation()}>
          <PGComparison
            selectedPGs={selectedPGs}
            onClose={handleCloseComparison}
            onRemovePG={handleRemovePG}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content comparison-selection-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚖️ Compare PGs</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="comparison-instructions">
            <h3>How to Compare PGs</h3>
            <ol>
              <li>Select 2-4 PGs from the listings by checking the comparison boxes</li>
              <li>Click "Compare Selected" to view side-by-side comparison</li>
              <li>Compare prices, ratings, amenities, and more</li>
              <li>Remove PGs or add more to refine your comparison</li>
            </ol>
          </div>

          {selectedPGs.length === 0 ? (
            <div className="no-selection">
              <div className="empty-icon">📋</div>
              <h3>No PGs selected</h3>
              <p>Go back to listings and select PGs to compare</p>
            </div>
          ) : (
            <div className="selected-pgs">
              <h3>Selected PGs ({selectedPGs.length}/4)</h3>
              <div className="selected-pg-list">
                {selectedPGs.map((pg, index) => (
                  <div key={pg.id} className="selected-pg-item">
                    <div className="pg-info">
                      <span className="pg-number">#{index + 1}</span>
                      <div>
                        <h4>{pg.name}</h4>
                        <p>{pg.city} • ₹{pg.pricing?.trueCost || pg.rentMin || 'N/A'}/mo</p>
                      </div>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => onToggleSelection(pg.id)}
                      title="Remove from comparison"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="comparison-actions">
                <button
                  className="btn btn-outline"
                  onClick={onClearSelection}
                >
                  Clear All
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleViewComparison}
                  disabled={selectedPGs.length < 2}
                >
                  Compare Selected ({selectedPGs.length})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Back to Listings
          </button>
        </div>
      </div>
    </div>
  )
}