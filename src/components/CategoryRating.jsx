import { useState } from 'react'

const CATEGORIES = [
  { key: 'food', label: 'Food Quality', icon: '🍽️', desc: 'Taste, variety, hygiene, timing' },
  { key: 'hygiene', label: 'Hygiene & Cleanliness', icon: '🧹', desc: 'Room, bathroom, common areas' },
  { key: 'safety', label: 'Safety & Security', icon: '🛡️', desc: 'CCTV, guards, locks, area' },
  { key: 'location', label: 'Location & Accessibility', icon: '📍', desc: 'Proximity to college, transport, amenities' },
  { key: 'management', label: 'Management', icon: '🤝', desc: 'Responsiveness, professionalism' },
  { key: 'value', label: 'Value for Money', icon: '💰', desc: 'Worth vs what you paid' }
]

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Excellent', 'Exceptional']

/**
 * CategoryRatingInput — Used in ReviewPage for submitting category ratings
 */
export function CategoryRatingInput({ ratings = {}, onChange }) {
  const [hovers, setHovers] = useState({})

  const handleRate = (category, value) => {
    onChange({ ...ratings, [category]: value })
  }

  return (
    <div className="category-rating-input">
      {CATEGORIES.map(cat => {
        const currentRating = ratings[cat.key] || 0
        const hoverVal = hovers[cat.key] || 0
        return (
          <div key={cat.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', background: 'var(--color-bone)', borderRadius: '16px',
            marginBottom: '12px', border: '1px solid rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{cat.label}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 500 }}>{cat.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  style={{
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: i <= (hoverVal || currentRating) ? 'var(--color-coral)' : 'rgba(0,0,0,0.08)',
                    transition: 'transform 0.15s ease, color 0.15s ease',
                    transform: i <= hoverVal ? 'scale(1.15)' : 'scale(1)'
                  }}
                  onMouseEnter={() => setHovers(h => ({ ...h, [cat.key]: i }))}
                  onMouseLeave={() => setHovers(h => ({ ...h, [cat.key]: 0 }))}
                  onClick={() => handleRate(cat.key, i)}
                >★</span>
              ))}
              {currentRating > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 800, color: 'var(--color-muted)',
                  minWidth: '65px', textAlign: 'right', letterSpacing: '0.5px'
                }}>
                  {RATING_LABELS[currentRating]}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * CategoryRatingDisplay — Used in PGDetailPage for showing average category ratings
 */
export function CategoryRatingDisplay({ ratings = {} }) {
  if (!ratings || Object.keys(ratings).length === 0) return null

  return (
    <div className="category-rating-display">
      {CATEGORIES.map(cat => {
        const val = ratings[cat.key]
        if (!val && val !== 0) return null
        const pct = (val / 5) * 100
        return (
          <div key={cat.key} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '14px'
          }}>
            <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{cat.icon}</span>
            <span style={{
              fontSize: '12px', fontWeight: 700, minWidth: '120px',
              color: 'var(--color-muted)'
            }}>{cat.label}</span>
            <div style={{
              flex: 1, height: '8px', borderRadius: '4px',
              background: 'rgba(0,0,0,0.04)', overflow: 'hidden'
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: '4px',
                background: val >= 4 ? 'var(--color-sage)' : val >= 3 ? 'var(--color-coral)' : '#e74c3c',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
            <span style={{
              fontSize: '14px', fontWeight: 800, minWidth: '28px',
              textAlign: 'right', color: 'var(--color-ebony)'
            }}>{val.toFixed(1)}</span>
          </div>
        )
      })}
    </div>
  )
}

export { CATEGORIES }
export default CategoryRatingInput
