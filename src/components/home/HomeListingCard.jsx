function tierLabel(tier) {
  if (tier === 'premium') return 'Premium'
  if (tier === 'verified') return 'Verified'
  if (tier === 'basic') return 'Verified'
  return 'New'
}

function tierColor(tier) {
  if (tier === 'premium') return '#d97706'
  if (tier === 'verified') return '#059669'
  if (tier === 'basic') return '#2563eb'
  return '#64748b'
}

export default function HomeListingCard({
  pg,
  tier,
  genderLabel,
  priceMeta,
  trustScore,
  trustSignals,
  shortlistReasons,
  selectedForComparison,
  onToggleSelection,
  onOpen
}) {
  const effectivePrice = priceMeta.amount
  const distanceText = Number.isFinite(Number(pg.collegeDistanceKm))
    ? `${Number(pg.collegeDistanceKm).toFixed(1)} km`
    : 'Not listed'

  const hasRating = (pg.reviewCount || 0) > 0

  const formattedName = (pg.name || '')
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bPg\b/ig, 'PG')

  return (
    <article className="listing-card" onClick={onOpen}>
      {/* Image */}
      <div className="listing-card-img">
        {pg.imageURL ? (
          pg.imageURL.includes('/video/') ? (
            <video
              src={pg.imageURL}
              className="listing-card-media"
              muted playsInline preload="metadata"
            />
          ) : (
            <img
              src={pg.imageURL}
              alt={pg.name}
              className="listing-card-media"
              loading="lazy" decoding="async"
            />
          )
        ) : (
          <div className="listing-card-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <span>No photo yet</span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="listing-card-overlay">
          <span className="listing-card-tier" style={{ '--tier-color': tierColor(tier) }}>
            {tierLabel(tier)}
          </span>
          {hasRating && (
            <span className="listing-card-rating">
              ★ {(pg.avgRating || 0).toFixed(1)}
            </span>
          )}
        </div>

        {/* Compare toggle */}
        <button
          type="button"
          className={`listing-card-compare${selectedForComparison ? ' selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleSelection() }}
          aria-label={selectedForComparison ? 'Remove from comparison' : 'Add to comparison'}
        >
          {selectedForComparison ? '✓ Selected' : 'Compare'}
        </button>
      </div>

      {/* Body */}
      <div className="listing-card-body">
        <div className="listing-card-location">{pg.city || 'Location TBD'}</div>
        <h3 className="listing-card-name">{formattedName}</h3>
        <p className="listing-card-address">
          {pg.nearestCollege ? `Near ${pg.nearestCollege}` : (pg.address || '').replace(/\s+,/g, ',')}
        </p>

        {/* Trust indicators */}
        <div className="listing-card-tags">
          {pg.contactName && pg.contactPhone && <span className="listing-tag">Direct Owner</span>}
          {priceMeta.isTransparent && <span className="listing-tag">Transparent Pricing</span>}
          {genderLabel && genderLabel !== 'Any' && <span className="listing-tag">{genderLabel}</span>}
        </div>

        {/* Stats row */}
        <div className="listing-card-stats">
          <div className="listing-stat">
            <div className="listing-stat-label">Rent</div>
            <div className="listing-stat-value">
              {effectivePrice > 0 ? `₹${effectivePrice.toLocaleString()}` : 'Call'}
            </div>
          </div>
          <div className="listing-stat-divider" />
          <div className="listing-stat">
            <div className="listing-stat-label">Distance</div>
            <div className="listing-stat-value">{distanceText}</div>
          </div>
          <div className="listing-stat-divider" />
          <div className="listing-stat">
            <div className="listing-stat-label">Score</div>
            <div className="listing-stat-value listing-score" data-score={trustScore >= 80 ? 'high' : trustScore >= 65 ? 'mid' : 'low'}>
              {trustScore}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="listing-card-footer">
          <span className="listing-review-count">
            {(pg.reviewCount || 0) > 0 ? `${pg.reviewCount} reviews` : 'No reviews yet'}
          </span>
          <button type="button" className="listing-view-btn" onClick={(e) => { e.stopPropagation(); onOpen() }}>
            View Details →
          </button>
        </div>
      </div>
    </article>
  )
}
