import { getVerificationTier } from '../components/TrustBadge'
import { getListingTrustScore, getTransparentPriceMeta } from './listingInsights'

const DEFAULT_MAX_PRICE = 30000

const STAGE_LABELS = {
  browse_home: 'Home browse only',
  search_filters_applied: 'Searched or filtered',
  results_seen: 'Viewed results',
  pg_viewed: 'Viewed PG detail',
  contact_owner: 'Tried contacting owner',
  review_intent: 'Started review intent'
}

const STAGE_ORDER = {
  browse_home: 1,
  search_filters_applied: 2,
  results_seen: 3,
  pg_viewed: 4,
  contact_owner: 5,
  review_intent: 5
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount)
}

function percent(numerator, denominator) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

function average(values) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function toTitleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function buildFilterLabels(payload = {}) {
  const labels = []

  if (payload.searchQuery) labels.push(`Search: ${payload.searchQuery}`)
  if (payload.city) labels.push(`City: ${payload.city}`)
  if (payload.food && payload.food !== 'any') labels.push(`Food: ${payload.food}`)
  if (payload.roomType && payload.roomType !== 'any') labels.push(`Room type: ${payload.roomType}`)
  if (payload.gender && payload.gender !== 'any') labels.push(`Gender: ${payload.gender}`)
  if (payload.maxDistance && payload.maxDistance !== 'any') labels.push(`Distance: ${payload.maxDistance} km`)
  if (payload.nearMe) labels.push('Near me')
  if (Array.isArray(payload.amenities)) {
    payload.amenities.forEach((amenity) => labels.push(`Amenity: ${amenity}`))
  }
  if (
    typeof payload.budgetMin === 'number' &&
    typeof payload.budgetMax === 'number' &&
    (payload.budgetMin > 0 || payload.budgetMax < DEFAULT_MAX_PRICE)
  ) {
    labels.push(`Budget: ${payload.budgetMin}-${payload.budgetMax}`)
  }

  return labels
}

function rankEntries(map, formatter = (key, value) => ({ key, value })) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => formatter(key, value))
}

function getListingGaps(pg) {
  const gaps = []

  if (!pg.contactName || !pg.contactPhone) {
    gaps.push('Missing direct owner contact')
  }

  if (!getTransparentPriceMeta(pg).isTransparent) {
    gaps.push('Missing transparent pricing')
  }

  if (!pg.nearestCollege && !Number.isFinite(Number(pg.collegeDistanceKm))) {
    gaps.push('Missing college mapping')
  }

  if (!pg.imageURL) {
    gaps.push('Missing primary listing media')
  }

  if (!pg.reviewCount) {
    gaps.push('No approved resident reviews yet')
  }

  return gaps
}

export function buildAnalyticsSummary(events = []) {
  const filterCounts = new Map()
  const pgViewCounts = new Map()
  const sessionMaxStage = new Map()

  let pgViews = 0
  let contactIntents = 0
  let reviewIntents = 0
  let searchEvents = 0

  events.forEach((event) => {
    if (event.eventName === 'search_filters_applied') {
      searchEvents += 1
      buildFilterLabels(event.payload || {}).forEach((label) => increment(filterCounts, label))
    }

    if (event.eventName === 'pg_viewed') {
      pgViews += 1
      const key = event.payload?.pgId || event.payload?.pgName || 'Unknown PG'
      increment(
        pgViewCounts,
        JSON.stringify({
          id: event.payload?.pgId || key,
          name: event.payload?.pgName || 'Unknown PG'
        })
      )
    }

    if (event.eventName === 'contact_owner') {
      contactIntents += 1
    }

    if (event.eventName === 'review_intent') {
      reviewIntents += 1
    }

    if (event.sessionId) {
      const stage = event.stage || event.eventName
      const nextOrder = STAGE_ORDER[stage] || 0
      const current = sessionMaxStage.get(event.sessionId)
      if (!current || nextOrder > current.order) {
        sessionMaxStage.set(event.sessionId, { stage, order: nextOrder })
      }
    }
  })

  const dropOffCounts = new Map()
  sessionMaxStage.forEach(({ stage }) => {
    increment(dropOffCounts, STAGE_LABELS[stage] || stage)
  })

  return {
    totalEvents: events.length,
    uniqueSessions: sessionMaxStage.size,
    pgViews,
    contactIntents,
    reviewIntents,
    searchEvents,
    topFilters: rankEntries(filterCounts, (key, value) => ({ label: key, count: value })).slice(0, 8),
    topViewedPGs: rankEntries(pgViewCounts, (key, value) => {
      const parsed = JSON.parse(key)
      return { id: parsed.id, name: parsed.name, count: value }
    }).slice(0, 8),
    dropOffStages: rankEntries(dropOffCounts, (key, value) => ({ stage: key, count: value })).slice(0, 8)
  }
}

export function buildAdminSummary({ pgs = [], reviews = [], users = [], photos = [], events = [] }) {
  const activeListings = pgs.filter((pg) => pg.isActive).length
  const approvedReviews = reviews.filter((review) => review.status === 'approved').length
  const pendingReviews = reviews.filter((review) => review.status === 'pending').length
  const rejectedReviews = reviews.filter((review) => review.status === 'rejected').length
  const pendingPhotos = photos.filter((photo) => photo.verificationStatus === 'pending').length
  const approvedPhotos = photos.filter((photo) => photo.verificationStatus === 'approved').length
  const rejectedPhotos = photos.filter((photo) => photo.verificationStatus === 'rejected').length
  const bannedUsers = users.filter((user) => user.isBanned).length
  const ownerAccounts = users.filter((user) => String(user.role || '').toLowerCase() === 'owner').length
  const analytics = buildAnalyticsSummary(events)

  const transparentListings = pgs.filter((pg) => getTransparentPriceMeta(pg).isTransparent).length
  const mappedListings = pgs.filter(
    (pg) => pg.nearestCollege || Number.isFinite(Number(pg.collegeDistanceKm))
  ).length
  const contactReadyListings = pgs.filter((pg) => pg.contactName && pg.contactPhone).length
  const highTrustListings = pgs.filter((pg) => getListingTrustScore(pg) >= 75).length
  const verifiedListings = pgs.filter((pg) => {
    const tier = getVerificationTier(pg)
    return tier === 'verified' || tier === 'premium'
  }).length

  const averageTrustScore = average(pgs.map((pg) => getListingTrustScore(pg)))
  const moderationBacklog = pendingReviews + pendingPhotos
  const analyticsSignal = Math.min(100, analytics.totalEvents > 0 ? Math.round((analytics.totalEvents / Math.max(activeListings, 1)) * 4) : 0)
  const readinessScore = Math.min(
    100,
    Math.round(
      (percent(transparentListings, Math.max(activeListings, 1)) * 0.24) +
      (percent(mappedListings, Math.max(activeListings, 1)) * 0.16) +
      (percent(contactReadyListings, Math.max(activeListings, 1)) * 0.2) +
      (percent(highTrustListings, Math.max(activeListings, 1)) * 0.18) +
      ((moderationBacklog === 0 ? 100 : Math.max(30, 100 - (moderationBacklog * 8))) * 0.12) +
      (analyticsSignal * 0.1)
    )
  )

  const coverage = [
    {
      label: 'Transparent pricing',
      value: percent(transparentListings, Math.max(activeListings, 1)),
      detail: `${transparentListings} of ${activeListings || pgs.length} live listings`
    },
    {
      label: 'Direct owner contact',
      value: percent(contactReadyListings, Math.max(activeListings, 1)),
      detail: `${contactReadyListings} listings contact-ready`
    },
    {
      label: 'College mapping',
      value: percent(mappedListings, Math.max(activeListings, 1)),
      detail: `${mappedListings} listings with distance data`
    },
    {
      label: 'High-trust profile',
      value: percent(highTrustListings, Math.max(activeListings, 1)),
      detail: `${highTrustListings} listings scoring 75+ trust`
    }
  ]

  const cityCounts = new Map()
  pgs.forEach((pg) => {
    if (pg.city) increment(cityCounts, toTitleCase(pg.city))
  })

  const riskListings = pgs
    .map((pg) => ({
      id: pg.id,
      name: pg.name || 'Untitled listing',
      city: pg.city || 'Unknown city',
      trustScore: getListingTrustScore(pg),
      issues: getListingGaps(pg)
    }))
    .filter((listing) => listing.issues.length > 0)
    .sort((a, b) => {
      if (b.issues.length !== a.issues.length) return b.issues.length - a.issues.length
      return a.trustScore - b.trustScore
    })
    .slice(0, 5)

  const alerts = []
  if (pendingReviews > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Review queue needs moderation',
      body: `${pendingReviews} reviews are waiting for approval or rejection.`,
      actionLabel: 'Open reviews',
      targetTab: 'reviews'
    })
  }
  if (pendingPhotos > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Photo verification backlog detected',
      body: `${pendingPhotos} resident photos are still pending verification.`,
      actionLabel: 'Open photos',
      targetTab: 'photos'
    })
  }
  if (transparentListings < activeListings) {
    alerts.push({
      severity: 'info',
      title: 'Pricing coverage is incomplete',
      body: `${activeListings - transparentListings} active listings still need structured pricing.`,
      actionLabel: 'Audit listings',
      targetTab: 'listings'
    })
  }
  if (mappedListings < activeListings) {
    alerts.push({
      severity: 'info',
      title: 'College distance mapping is incomplete',
      body: `${activeListings - mappedListings} active listings still miss campus proximity data.`,
      actionLabel: 'Open listings',
      targetTab: 'listings'
    })
  }
  if (analytics.totalEvents === 0) {
    alerts.push({
      severity: 'neutral',
      title: 'Behavior analytics has not started yet',
      body: 'No platform events have been captured, so product decisions still rely on manual observation.',
      actionLabel: 'Open analytics',
      targetTab: 'analytics'
    })
  }

  let readinessLabel = 'Needs hardening'
  if (readinessScore >= 80) readinessLabel = 'Production-ready foundation'
  else if (readinessScore >= 65) readinessLabel = 'Scaling foundation'

  return {
    readinessScore,
    readinessLabel,
    averageTrustScore,
    primaryMetrics: [
      {
        label: 'Live inventory',
        value: activeListings,
        helper: `${pgs.length} total listings in catalog`
      },
      {
        label: 'Moderation backlog',
        value: moderationBacklog,
        helper: `${pendingReviews} reviews and ${pendingPhotos} photos pending`
      },
      {
        label: 'Trust-ready listings',
        value: highTrustListings,
        helper: `${verifiedListings} listings at verified tier`
      },
      {
        label: 'Pricing coverage',
        value: `${percent(transparentListings, Math.max(activeListings, 1))}%`,
        helper: `${transparentListings} listings with structured pricing`
      },
      {
        label: 'Behavior events',
        value: analytics.totalEvents,
        helper: `${analytics.uniqueSessions} tracked sessions`
      },
      {
        label: 'Access controls',
        value: bannedUsers,
        helper: `${bannedUsers} suspended of ${users.length} total users`
      }
    ],
    queueMetrics: [
      {
        label: 'Review moderation',
        value: pendingReviews,
        helper: `${approvedReviews} approved and ${rejectedReviews} rejected`
      },
      {
        label: 'Photo verification',
        value: pendingPhotos,
        helper: `${approvedPhotos} approved and ${rejectedPhotos} rejected`
      },
      {
        label: 'Owner accounts',
        value: ownerAccounts,
        helper: `${users.length - ownerAccounts} resident accounts`
      }
    ],
    coverage,
    alerts: alerts.slice(0, 4),
    analytics,
    cityBreakdown: rankEntries(cityCounts, (key, value) => ({ city: key, count: value })).slice(0, 5),
    riskListings,
    governance: {
      totalUsers: users.length,
      bannedUsers,
      ownerAccounts,
      approvedReviews,
      approvedPhotos
    }
  }
}
