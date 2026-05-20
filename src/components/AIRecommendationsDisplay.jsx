import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TrustBadge, { getVerificationTier } from './TrustBadge'
import {
  getListingShortlistReasons,
  getListingTrustScore,
  getListingTrustSignals,
  getTransparentPriceMeta
} from '../utils/listingInsights'

export default function AIRecommendationsDisplay({ recommendations, onClose }) {
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('score')

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (sortBy === 'score') return b.recommendationScore - a.recommendationScore
    if (sortBy === 'price-low') return (a.pricing?.trueCost || a.rentMin || 0) - (b.pricing?.trueCost || b.rentMin || 0)
    if (sortBy === 'price-high') return (b.pricing?.trueCost || b.rentMin || 0) - (a.pricing?.trueCost || a.rentMin || 0)
    if (sortBy === 'rating') return (b.avgRating || 0) - (a.avgRating || 0)
    return 0
  })

  const getScoreColor = (score) => {
    if (score >= 8.5) return '#10b981' // Green
    if (score >= 7.0) return '#f59e0b' // Orange
    if (score >= 5.0) return '#f97316' // Red-orange
    return '#ef4444' // Red
  }

  const getScoreLabel = (score) => {
    if (score >= 8.5) return 'Excellent Match'
    if (score >= 7.0) return 'Good Match'
    if (score >= 5.0) return 'Fair Match'
    return 'Poor Match'
  }

  const formatPrice = (pg) => {
    const price = pg.pricing?.trueCost || pg.rentMin || 0
    return price > 0 ? `₹${price.toLocaleString()}` : 'Price not set'
  }

  return (
    <div className="ai-recommendations-container">
      <div className="recommendations-header">
        <div className="header-content">
          <h2>🤖 Your AI PG Recommendations</h2>
          <p>Found {recommendations.length} personalized matches based on your preferences</p>
        </div>
        <div className="header-actions">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="score">Sort by Match Score</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="recommendations-grid">
        {sortedRecommendations.map((pg, index) => {
          const tier = getVerificationTier(pg)
          const scoreColor = getScoreColor(pg.recommendationScore)
          const scoreLabel = getScoreLabel(pg.recommendationScore)
          const priceMeta = getTransparentPriceMeta(pg)
          const trustScore = getListingTrustScore(pg)
          const trustSignals = getListingTrustSignals(pg)
          const shortlistReasons = getListingShortlistReasons(pg)

          return (
            <div
              key={pg.id}
              className="recommendation-card"
              onClick={() => navigate(`/pg/${pg.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-rank">
                #{index + 1}
              </div>

              <div className="card-image">
                {pg.imageURL ? (
                  <img src={pg.imageURL} alt={pg.name} loading="lazy" decoding="async" />
                ) : (
                  <div className="placeholder-image">
                    <div className="placeholder-icon">🏠</div>
                  </div>
                )}
                <div className="card-overlay" />
                <div className="card-price">
                  {priceMeta.amount > 0 ? `Rs.${priceMeta.amount.toLocaleString()}` : 'Price not set'}
                </div>
              </div>

              <div className="card-content">
                <div className="card-header">
                  <div>
                    <h3>{pg.name}</h3>
                    <p className="card-location">{pg.city} • {pg.address}</p>
                  </div>
                  <div className="ai-card-trust">
                    <TrustBadge tier={tier} size="small" />
                    <span className="ai-card-trust-score">{trustScore}/100 trust</span>
                  </div>
                </div>

                <div className="match-score">
                  <div className="score-display">
                    <div
                      className="score-circle"
                      style={{ backgroundColor: scoreColor }}
                    >
                      {pg.recommendationScore}
                    </div>
                    <div className="score-info">
                      <span className="score-label" style={{ color: scoreColor }}>
                        {scoreLabel}
                      </span>
                      <span className="score-subtitle">Match Score</span>
                    </div>
                  </div>
                </div>

                <div className="match-reasons">
                  <h4>Why this matches:</h4>
                  <ul>
                    {pg.matchReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {shortlistReasons.length > 0 && (
                  <div className="card-amenities" style={{ marginBottom: '16px' }}>
                    {shortlistReasons.map((reason) => (
                      <span key={reason} className="amenity-more">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                <div className="card-metrics">
                  <div className="metric">
                    <span className="metric-label">Rating</span>
                    <span className="metric-value">
                      {pg.avgRating ? `${pg.avgRating.toFixed(1)} ⭐` : 'New'}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Reviews</span>
                    <span className="metric-value">{pg.reviewCount || 0}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Distance</span>
                    <span className="metric-value">
                      {pg.collegeDistanceKm ? `${pg.collegeDistanceKm} km` : 'N/A'}
                    </span>
                  </div>
                </div>

                {trustSignals.length > 0 && (
                  <div className="trust-signal-row" style={{ marginBottom: '16px' }}>
                    {trustSignals.map((signal) => (
                      <span key={signal} className="trust-signal-chip">
                        {signal}
                      </span>
                    ))}
                  </div>
                )}

                <div className="card-amenities">
                  {(pg.amenities || []).slice(0, 3).map(amenity => (
                    <span key={amenity} className="amenity-tag">
                      {amenity}
                    </span>
                  ))}
                  {(pg.amenities || []).length > 3 && (
                    <span className="amenity-more">
                      +{(pg.amenities || []).length - 3} more
                    </span>
                  )}
                </div>

                <button className="btn btn-primary card-action">
                  View Details →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {recommendations.length === 0 && (
        <div className="no-recommendations">
          <div className="empty-state">
            <div className="empty-icon">🤔</div>
            <h3>No recommendations found</h3>
            <p>Try adjusting your preferences or budget to find more options.</p>
            <button className="btn btn-primary" onClick={onClose}>
              Adjust Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
