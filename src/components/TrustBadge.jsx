const TIERS = {
  new: {
    label: 'NEW',
    bg: 'rgba(120, 120, 120, 0.15)',
    color: '#666',
    icon: '🆕',
    border: '1px solid rgba(120,120,120,0.2)'
  },
  basic: {
    label: 'BASIC VERIFIED',
    bg: 'rgba(52, 152, 219, 0.12)',
    color: '#2980b9',
    icon: '✓',
    border: '1px solid rgba(52,152,219,0.2)'
  },
  verified: {
    label: 'VERIFIED',
    bg: 'rgba(39, 174, 96, 0.12)',
    color: '#27ae60',
    icon: '✓✓',
    border: '1px solid rgba(39,174,96,0.2)'
  },
  premium: {
    label: 'PREMIUM VERIFIED',
    bg: 'linear-gradient(135deg, rgba(241,196,15,0.15), rgba(243,156,18,0.15))',
    color: '#d4a017',
    icon: '★',
    border: '1px solid rgba(241,196,15,0.3)'
  }
}

/**
 * Calculates verification tier based on listing data.
 * - new: just created, no reviews
 * - basic: admin approved + owner info present
 * - verified: 3+ approved reviews + owner info
 * - premium: 5+ reviews, avg 4.0+, owner verified
 */
export function getVerificationTier(pg) {
  if (!pg) return 'new'
  const hasOwnerInfo = pg.contactName && pg.contactPhone
  const reviewCount = pg.reviewCount || 0
  const avgRating = pg.avgRating || 0

  if (reviewCount >= 5 && avgRating >= 4.0 && hasOwnerInfo) return 'premium'
  if (reviewCount >= 3 && hasOwnerInfo) return 'verified'
  if (pg.isActive && hasOwnerInfo) return 'basic'
  return 'new'
}

export default function TrustBadge({ tier = 'new', size = 'default', style = {} }) {
  const config = TIERS[tier] || TIERS.new
  const isSmall = size === 'small'

  return (
    <span
      className="trust-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '4px 10px' : '6px 14px',
        borderRadius: '10px',
        fontSize: isSmall ? '9px' : '11px',
        fontWeight: 800,
        letterSpacing: '0.5px',
        background: config.bg,
        color: config.color,
        border: config.border,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <span style={{ fontSize: isSmall ? '10px' : '12px' }}>{config.icon}</span>
      {config.label}
    </span>
  )
}
