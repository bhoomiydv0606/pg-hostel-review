import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TrustBadge, { getVerificationTier } from './TrustBadge'

export default function PGComparison({ selectedPGs, onClose, onRemovePG }) {
  const navigate = useNavigate()

  const getEffectivePrice = (pg) => {
    if (pg.pricing?.trueCost) return pg.pricing.trueCost
    return pg.rentMin || 0
  }

  const getFoodRating = (pg) => {
    // Calculate food rating from reviews
    const foodReviews = pg.reviews?.filter(r => r.ratings?.food && r.ratings.food > 0) || []
    if (foodReviews.length === 0) return null

    const avgFoodRating = foodReviews.reduce((sum, r) => sum + r.ratings.food, 0) / foodReviews.length
    return Math.round(avgFoodRating * 10) / 10
  }

  const getAmenityScore = (pg) => {
    const amenities = pg.amenities || []
    const totalPossible = ['WiFi', 'Laundry', 'Parking', 'CCTV', 'Gym', 'Power Backup', 'AC', 'Water Purifier'].length
    return Math.round((amenities.length / totalPossible) * 100)
  }

  const getDistanceText = (pg) => {
    if (!pg.collegeDistanceKm) return 'Not specified'
    return `${pg.collegeDistanceKm} km`
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10b981' // Green
    if (rating >= 4.0) return '#f59e0b' // Orange
    if (rating >= 3.5) return '#f97316' // Red-orange
    return '#ef4444' // Red
  }

  const getPriceColor = (price, prices) => {
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice

    if (range === 0) return '#64748b' // Neutral

    const normalizedPrice = (price - minPrice) / range
    if (normalizedPrice <= 0.33) return '#10b981' // Green - cheapest
    if (normalizedPrice <= 0.66) return '#f59e0b' // Orange - middle
    return '#ef4444' // Red - expensive
  }

  const getBestValue = (values, higherIsBetter = true) => {
    if (higherIsBetter) {
      return Math.max(...values)
    } else {
      return Math.min(...values)
    }
  }

  const isBestValue = (value, values, higherIsBetter = true) => {
    const best = getBestValue(values, higherIsBetter)
    return value === best
  }

  if (selectedPGs.length === 0) {
    return (
      <div className="comparison-empty">
        <div className="empty-state">
          <div className="empty-icon">⚖️</div>
          <h3>No PGs selected for comparison</h3>
          <p>Select 2-4 PGs from the listings to compare them side by side.</p>
          <button className="btn btn-primary" onClick={onClose}>
            Back to Listings
          </button>
        </div>
      </div>
    )
  }

  const prices = selectedPGs.map(pg => getEffectivePrice(pg))
  const ratings = selectedPGs.map(pg => pg.avgRating || 0).filter(r => r > 0)
  const foodRatings = selectedPGs.map(pg => getFoodRating(pg)).filter(r => r !== null)

  return (
    <div className="pg-comparison-container">
      <div className="comparison-header">
        <div className="header-content">
          <h2>⚖️ Compare PGs</h2>
          <p>Compare {selectedPGs.length} selected properties side by side</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Back to Listings
          </button>
        </div>
      </div>

      <div className="comparison-table">
        {/* PG Headers */}
        <div className="comparison-row comparison-headers">
          <div className="comparison-cell comparison-label"></div>
          {selectedPGs.map((pg, index) => (
            <div key={pg.id} className="comparison-cell comparison-pg-header">
              <div className="pg-rank">#{index + 1}</div>
              <button
                className="remove-pg-btn"
                onClick={() => onRemovePG(pg.id)}
                title="Remove from comparison"
              >
                ×
              </button>
              <div className="pg-image">
                {pg.imageURL ? (
                  <img src={pg.imageURL} alt={pg.name} />
                ) : (
                  <div className="placeholder-image">🏠</div>
                )}
              </div>
              <h3>{pg.name}</h3>
              <p className="pg-location">{pg.city}</p>
              <TrustBadge tier={getVerificationTier(pg)} size="small" />
            </div>
          ))}
        </div>

        {/* Price Comparison */}
        <div className="comparison-row">
          <div className="comparison-cell comparison-label">
            <div className="label-content">
              <span className="label-icon">💰</span>
              <span className="label-text">Monthly Rent</span>
            </div>
          </div>
          {selectedPGs.map((pg) => {
            const price = getEffectivePrice(pg)
            const isBest = isBestValue(price, prices, false)
            return (
              <div key={pg.id} className="comparison-cell">
                <div className={`price-value ${isBest ? 'best-value' : ''}`}>
                  ₹{price.toLocaleString()}
                  {isBest && <span className="best-badge">Best Value</span>}
                </div>
                <div className="price-bar">
                  <div
                    className="price-fill"
                    style={{
                      width: `${((price - Math.min(...prices)) / (Math.max(...prices) - Math.min(...prices))) * 100}%`,
                      backgroundColor: getPriceColor(price, prices)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Rating Comparison */}
        <div className="comparison-row">
          <div className="comparison-cell comparison-label">
            <div className="label-content">
              <span className="label-icon">⭐</span>
              <span className="label-text">Overall Rating</span>
            </div>
          </div>
          {selectedPGs.map((pg) => {
            const rating = pg.avgRating || 0
            const isBest = ratings.length > 0 && isBestValue(rating, ratings, true)
            return (
              <div key={pg.id} className="comparison-cell">
                <div className={`rating-value ${isBest ? 'best-value' : ''}`}>
                  {rating > 0 ? (
                    <>
                      <span className="rating-number">{rating.toFixed(1)}</span>
                      <div className="rating-stars">
                        {'⭐'.repeat(Math.floor(rating))}
                        {rating % 1 >= 0.5 ? '⭐' : ''}
                      </div>
                      <span className="review-count">({pg.reviewCount || 0} reviews)</span>
                      {isBest && <span className="best-badge">Top Rated</span>}
                    </>
                  ) : (
                    <span className="no-rating">No reviews yet</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Food Quality Comparison */}
        <div className="comparison-row">
          <div className="comparison-cell comparison-label">
            <div className="label-content">
              <span className="label-icon">🍽️</span>
              <span className="label-text">Food Quality</span>
            </div>
          </div>
          {selectedPGs.map((pg) => {
            const foodRating = getFoodRating(pg)
            const hasFood = pg.foodInfo?.available
            const isBest = foodRatings.length > 0 && foodRating && isBestValue(foodRating, foodRatings, true)
            return (
              <div key={pg.id} className="comparison-cell">
                <div className={`food-value ${isBest ? 'best-value' : ''}`}>
                  {foodRating ? (
                    <>
                      <span className="rating-number">{foodRating.toFixed(1)}/5</span>
                      <div className="rating-stars">
                        {'⭐'.repeat(Math.floor(foodRating))}
                        {foodRating % 1 >= 0.5 ? '⭐' : ''}
                      </div>
                      {isBest && <span className="best-badge">Best Food</span>}
                    </>
                  ) : hasFood ? (
                    <span className="food-available">Food included</span>
                  ) : (
                    <span className="no-food">No food service</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Distance Comparison */}
        <div className="comparison-row">
          <div className="comparison-cell comparison-label">
            <div className="label-content">
              <span className="label-icon">📍</span>
              <span className="label-text">College Distance</span>
            </div>
          </div>
          {selectedPGs.map((pg) => {
            const distance = pg.collegeDistanceKm
            const distances = selectedPGs.map(p => p.collegeDistanceKm).filter(d => d)
            const isBest = distances.length > 0 && distance && isBestValue(distance, distances, false)
            return (
              <div key={pg.id} className="comparison-cell">
                <div className={`distance-value ${isBest ? 'best-value' : ''}`}>
                  {distance ? (
                    <>
                      <span className="distance-number">{distance} km</span>
                      <span className="distance-text">
                        {distance <= 1 ? 'Very Close' :
                         distance <= 3 ? 'Close' :
                         distance <= 5 ? 'Moderate' : 'Far'}
                      </span>
                      {isBest && <span className="best-badge">Closest</span>}
                    </>
                  ) : (
                    <span className="no-distance">Not specified</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Amenities Comparison */}
        <div className="comparison-row">
          <div className="comparison-cell comparison-label">
            <div className="label-content">
              <span className="label-icon">🏠</span>
              <span className="label-text">Amenities Score</span>
            </div>
          </div>
          {selectedPGs.map((pg) => {
            const amenityScore = getAmenityScore(pg)
            const scores = selectedPGs.map(p => getAmenityScore(p))
            const isBest = isBestValue(amenityScore, scores, true)
            return (
              <div key={pg.id} className="comparison-cell">
                <div className={`amenity-value ${isBest ? 'best-value' : ''}`}>
                  <div className="amenity-score">
                    <span className="score-number">{amenityScore}%</span>
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{ width: `${amenityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="amenity-list">
                    {(pg.amenities || []).slice(0, 3).map(amenity => (
                      <span key={amenity} className="amenity-tag">{amenity}</span>
                    ))}
                    {(pg.amenities || []).length > 3 && (
                      <span className="amenity-more">+{(pg.amenities || []).length - 3} more</span>
                    )}
                  </div>
                  {isBest && <span className="best-badge">Most Amenities</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="comparison-row comparison-actions">
          <div className="comparison-cell comparison-label"></div>
          {selectedPGs.map((pg) => (
            <div key={pg.id} className="comparison-cell">
              <button
                className="btn btn-primary comparison-action-btn"
                onClick={() => navigate(`/pg/${pg.id}`)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="comparison-legend">
        <div className="legend-item">
          <span className="legend-color best-value"></span>
          <span>Best value in category</span>
        </div>
        <div className="legend-item">
          <span className="legend-color price-bar"></span>
          <span>Price range indicator</span>
        </div>
        <div className="legend-item">
          <span className="legend-color score-fill"></span>
          <span>Amenities completeness</span>
        </div>
      </div>
    </div>
  )
}