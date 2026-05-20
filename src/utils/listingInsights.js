function toNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function getEffectivePrice(pg) {
  return toNumber(pg?.pricing?.trueCost) || toNumber(pg?.rentMin)
}

export function getTransparentPriceMeta(pg) {
  const amount = getEffectivePrice(pg)
  const baseRent = toNumber(pg?.pricing?.baseRent)
  const deposit = toNumber(pg?.pricing?.securityDeposit)
  const hiddenChargesCount = Array.isArray(pg?.pricing?.hiddenCharges)
    ? pg.pricing.hiddenCharges.filter((charge) => charge && String(charge).trim() !== '').length
    : 0
  const isTransparent = Boolean(amount || baseRent)
  const details = []

  if (baseRent && amount > baseRent) {
    details.push(`Base rent Rs.${baseRent.toLocaleString()}`)
  }

  if (deposit > 0) {
    details.push(`Deposit Rs.${deposit.toLocaleString()}`)
  }

  if (hiddenChargesCount > 0) {
    details.push(`${hiddenChargesCount} extra charge${hiddenChargesCount > 1 ? 's' : ''} disclosed`)
  }

  return {
    amount,
    label: amount && pg?.pricing?.trueCost ? 'True monthly cost' : 'Starting monthly rent',
    detail: details.join(' | '),
    isTransparent
  }
}

export function getListingTrustSignals(pg) {
  const signals = []
  const reviewCount = toNumber(pg?.reviewCount)

  if (pg?.isActive) {
    signals.push('Admin approved listing')
  }

  if (pg?.contactName && pg?.contactPhone) {
    signals.push('Direct owner contact shared')
  }

  if (pg?.pricing?.trueCost || pg?.pricing?.baseRent) {
    signals.push('Pricing breakup available')
  }

  if (reviewCount > 0) {
    signals.push(`${reviewCount} resident review${reviewCount > 1 ? 's' : ''}`)
  }

  if (pg?.nearestCollege || Number.isFinite(Number(pg?.collegeDistanceKm))) {
    signals.push('College distance mapped')
  }

  if (pg?.foodInfo?.available) {
    signals.push('Meal plan details added')
  }

  if (pg?.imageURL) {
    signals.push('Real listing media added')
  }

  return signals.slice(0, 4)
}

export function getListingTrustScore(pg) {
  let score = 18

  if (pg?.isActive) score += 18
  if (pg?.contactName && pg?.contactPhone) score += 16
  if (pg?.pricing?.trueCost || pg?.pricing?.baseRent) score += 16
  if (pg?.imageURL) score += 10
  if (pg?.nearestCollege || Number.isFinite(Number(pg?.collegeDistanceKm))) score += 10
  if (pg?.foodInfo?.available) score += 6

  const reviewCount = toNumber(pg?.reviewCount)
  if (reviewCount >= 5) score += 16
  else if (reviewCount >= 3) score += 12
  else if (reviewCount > 0) score += 8

  const rating = toNumber(pg?.avgRating)
  if (rating >= 4.5) score += 10
  else if (rating >= 4) score += 8
  else if (rating >= 3.5) score += 6

  return Math.min(score, 100)
}

export function getListingShortlistReasons(pg) {
  const reasons = []
  const distance = Number(pg?.collegeDistanceKm)
  const trustScore = getListingTrustScore(pg)

  if (Number.isFinite(distance) && distance <= 1.5) {
    reasons.push('Walkable from campus')
  } else if (Number.isFinite(distance) && distance <= 3) {
    reasons.push('Quick college commute')
  }

  if (pg?.foodInfo?.available) {
    reasons.push('Meals already configured')
  }

  if (pg?.targetGender === 'boys' || pg?.targetGender === 'girls') {
    reasons.push(`Built for ${pg.targetGender}`)
  }

  if ((pg?.amenities || []).includes('WiFi') && (pg?.amenities || []).includes('Laundry')) {
    reasons.push('Strong everyday essentials')
  } else if ((pg?.amenities || []).length >= 4) {
    reasons.push('Well-equipped stay')
  }

  if ((pg?.reviewCount || 0) >= 3 && (pg?.avgRating || 0) >= 4) {
    reasons.push('Residents rate it consistently')
  }

  if (pg?.pricing?.trueCost) {
    reasons.push('No-surprise monthly pricing')
  }

  if (trustScore >= 75) {
    reasons.push('High-trust listing profile')
  }

  return reasons.slice(0, 3)
}
