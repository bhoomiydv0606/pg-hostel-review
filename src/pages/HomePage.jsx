import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { getVerificationTier } from '../components/TrustBadge'
import AIRecommendationModal from '../components/AIRecommendationModal'
import AIRecommendationsDisplay from '../components/AIRecommendationsDisplay'
import ComparisonModal from '../components/ComparisonModal'
import HomeFilterPanel from '../components/home/HomeFilterPanel'
import HomeListingCard from '../components/home/HomeListingCard'
import HomeSearchHero from '../components/home/HomeSearchHero'
import { trackEvent } from '../utils/analytics'
import {
  getEffectivePrice,
  getListingShortlistReasons,
  getListingTrustScore,
  getListingTrustSignals,
  getTransparentPriceMeta
} from '../utils/listingInsights'

const FILTER_AMENITIES = ['WiFi', 'Laundry', 'Parking', 'CCTV', 'Gym', 'Power Backup']
const DEFAULT_MAX_PRICE = 30000
const FEATURED_LIMIT = 6

const DEFAULT_FILTERS = {
  budgetMin: 0,
  budgetMax: DEFAULT_MAX_PRICE,
  food: 'any',
  roomType: 'any',
  gender: 'any',
  maxDistance: 'any',
  amenities: []
}

const SMART_PRESETS = [
  {
    key: 'budget',
    label: 'Under Rs.12k',
    description: 'Fast shortlist for budget-conscious students'
  },
  {
    key: 'meals',
    label: 'Meals Included',
    description: 'For students who want one monthly bill'
  },
  {
    key: 'walkable',
    label: 'Walk to College',
    description: 'Surface stays with quick campus access'
  },
  {
    key: 'girls',
    label: 'Girls Only',
    description: 'Filter to women-focused stays'
  },
  {
    key: 'study',
    label: 'AC + WiFi',
    description: 'Comfort plus study-ready essentials'
  },
  {
    key: 'top-rated',
    label: 'Top Rated',
    description: 'Prioritize trusted resident feedback'
  }
]

function getDistance(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function formatGender(value) {
  if (value === 'co-ed') return 'Co-ed'
  if (value === 'boys') return 'Boys'
  if (value === 'girls') return 'Girls'
  return 'Any'
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const resultsRef = useRef(null)
  const hasTrackedHomeView = useRef(false)

  const [pgs, setPGs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [sortBy, setSortBy] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [userLocation, setUserLocation] = useState(null)
  const [nearMe, setNearMe] = useState(false)
  const [activePreset, setActivePreset] = useState('')
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [selectedPGsForComparison, setSelectedPGsForComparison] = useState([])

  const fetchPGs = async () => {
    setLoading(true)
    try {
      const activePGQuery = query(collection(db, 'pgs'), where('isActive', '==', true))
      const snapshot = await getDocs(activePGQuery)
      setPGs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPGs()
  }, [])

  useEffect(() => {
    if (!loading && !hasTrackedHomeView.current) {
      hasTrackedHomeView.current = true
      trackEvent('home_loaded', { totalListings: pgs.length }, 'browse_home')
    }
  }, [loading, pgs.length])

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
  }

  const toggleAmenity = (amenity) => {
    setFilters((previous) => ({
      ...previous,
      amenities: previous.amenities.includes(amenity)
        ? previous.amenities.filter((item) => item !== amenity)
        : [...previous.amenities, amenity]
    }))
  }

  const clearAllFilters = () => {
    setSearch('')
    setCity('')
    setFilters(DEFAULT_FILTERS)
    setNearMe(false)
    setActivePreset('')
    trackEvent('search_filters_applied', { resetAll: true }, 'search_filters_applied')
  }

  const applySmartPreset = (presetKey) => {
    setActivePreset(presetKey)
    setShowFilters(true)

    if (presetKey === 'budget') {
      setFilters((previous) => ({ ...previous, budgetMin: 0, budgetMax: 12000 }))
    }

    if (presetKey === 'meals') {
      setFilters((previous) => ({ ...previous, food: 'included' }))
    }

    if (presetKey === 'walkable') {
      setFilters((previous) => ({ ...previous, maxDistance: '2' }))
    }

    if (presetKey === 'girls') {
      setFilters((previous) => ({ ...previous, gender: 'girls' }))
    }

    if (presetKey === 'study') {
      setFilters((previous) => ({
        ...previous,
        roomType: 'ac',
        amenities: Array.from(new Set([...previous.amenities, 'WiFi']))
      }))
    }

    if (presetKey === 'top-rated') {
      setSortBy('rating')
    }

    trackEvent('search_filters_applied', { preset: presetKey }, 'search_filters_applied')
  }

  const getLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setNearMe(true)
        trackEvent('search_filters_applied', { nearMe: true, source: 'geolocation_button' }, 'search_filters_applied')
      },
      (error) => {
        console.error('Geolocation error:', error)
      }
    )
  }

  const togglePGSelection = (pgId) => {
    setSelectedPGsForComparison((previous) => {
      const isSelected = previous.some((pg) => pg.id === pgId)
      if (isSelected) {
        return previous.filter((pg) => pg.id !== pgId)
      }

      if (previous.length < 4) {
        const selectedPG = pgs.find((pg) => pg.id === pgId)
        return selectedPG ? [...previous, selectedPG] : previous
      }

      return previous
    })
  }

  const clearComparisonSelection = () => {
    setSelectedPGsForComparison([])
  }

  const filtered = pgs
    .filter((pg) => {
      const effectivePrice = getEffectivePrice(pg)
      const textPool = [pg.name, pg.city, pg.address, pg.nearestCollege]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchSearch = search.trim() === '' || textPool.includes(search.toLowerCase())
      const matchCity = city.trim() === '' || (pg.city || '').toLowerCase().includes(city.toLowerCase())
      const matchBudget = effectivePrice >= filters.budgetMin && effectivePrice <= filters.budgetMax
      const matchFood =
        filters.food === 'any' ||
        (filters.food === 'included' && pg.foodInfo?.available) ||
        (filters.food === 'not-included' && !pg.foodInfo?.available)

      const hasAC = (pg.amenities || []).includes('AC')
      const matchRoomType =
        filters.roomType === 'any' ||
        (filters.roomType === 'ac' && hasAC) ||
        (filters.roomType === 'non-ac' && !hasAC)

      const matchGender = filters.gender === 'any' || (pg.targetGender || 'co-ed') === filters.gender
      const distanceValue = Number(pg.collegeDistanceKm)
      const matchDistance =
        filters.maxDistance === 'any' ||
        (Number.isFinite(distanceValue) && distanceValue <= Number(filters.maxDistance))

      let matchLocation = true
      if (nearMe && userLocation && pg.latitude && pg.longitude) {
        const distanceFromUser = getDistance(userLocation.lat, userLocation.lng, pg.latitude, pg.longitude)
        matchLocation = distanceFromUser <= 10
      }

      const matchAmenities =
        filters.amenities.length === 0 ||
        filters.amenities.every((item) => (pg.amenities || []).includes(item))

      return (
        matchSearch &&
        matchCity &&
        matchBudget &&
        matchFood &&
        matchRoomType &&
        matchGender &&
        matchDistance &&
        matchLocation &&
        matchAmenities
      )
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return getEffectivePrice(a) - getEffectivePrice(b)
      if (sortBy === 'price-high') return getEffectivePrice(b) - getEffectivePrice(a)
      if (sortBy === 'rating') return (b.avgRating || 0) - (a.avgRating || 0)
      if (sortBy === 'distance') {
        const aDistance = Number.isFinite(Number(a.collegeDistanceKm)) ? Number(a.collegeDistanceKm) : Number.MAX_SAFE_INTEGER
        const bDistance = Number.isFinite(Number(b.collegeDistanceKm)) ? Number(b.collegeDistanceKm) : Number.MAX_SAFE_INTEGER
        return aDistance - bDistance
      }
      if (sortBy === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)

      const scoreA = (a.avgRating || 0) * 3 + (a.reviewCount || 0)
      const scoreB = (b.avgRating || 0) * 3 + (b.reviewCount || 0)
      return scoreB - scoreA
    })

  useEffect(() => {
    if (loading || !hasTrackedHomeView.current) return

    const hasInteraction =
      search.trim() !== '' ||
      city.trim() !== '' ||
      nearMe ||
      filters.food !== 'any' ||
      filters.roomType !== 'any' ||
      filters.gender !== 'any' ||
      filters.maxDistance !== 'any' ||
      filters.amenities.length > 0 ||
      filters.budgetMin > 0 ||
      filters.budgetMax < DEFAULT_MAX_PRICE

    if (!hasInteraction) return

    const timer = window.setTimeout(() => {
      const payload = {
        searchQuery: search.trim(),
        city: city.trim(),
        budgetMin: filters.budgetMin,
        budgetMax: filters.budgetMax,
        food: filters.food,
        roomType: filters.roomType,
        gender: filters.gender,
        maxDistance: filters.maxDistance,
        amenities: filters.amenities,
        nearMe,
        resultsCount: filtered.length
      }

      trackEvent('search_filters_applied', payload, 'search_filters_applied')
      trackEvent('results_seen', { resultsCount: filtered.length }, 'results_seen')
    }, 700)

    return () => window.clearTimeout(timer)
  }, [city, filtered.length, filters, loading, nearMe, search])

  const activeChips = []
  if (filters.budgetMin > 0 || filters.budgetMax < DEFAULT_MAX_PRICE) {
    activeChips.push(`Budget Rs.${filters.budgetMin.toLocaleString()} - Rs.${filters.budgetMax.toLocaleString()}`)
  }
  if (filters.food !== 'any') {
    activeChips.push(filters.food === 'included' ? 'Food included' : 'Food not included')
  }
  if (filters.roomType !== 'any') {
    activeChips.push(filters.roomType === 'ac' ? 'AC rooms' : 'Non-AC rooms')
  }
  if (filters.gender !== 'any') {
    activeChips.push(formatGender(filters.gender))
  }
  if (filters.maxDistance !== 'any') {
    activeChips.push(`Up to ${filters.maxDistance} km from college`)
  }
  filters.amenities.forEach((item) => activeChips.push(item))
  if (nearMe) {
    activeChips.push('Near me')
  }

  const comparisonReady = selectedPGsForComparison.length >= 2
  const hasSearchIntent =
    search.trim() !== '' ||
    city.trim() !== '' ||
    nearMe ||
    activePreset !== '' ||
    activeChips.length > 0

  const featuredPGs = filtered.slice(0, FEATURED_LIMIT)
  const additionalPGs = filtered.slice(FEATURED_LIMIT)

  const verifiedListingsCount = pgs.filter((pg) => getVerificationTier(pg) !== 'new').length
  const transparentListingsCount = pgs.filter((pg) => getTransparentPriceMeta(pg).isTransparent).length

  const heroMetrics = [
    {
      label: hasSearchIntent ? 'Matching stays' : 'Featured now',
      value: hasSearchIntent ? filtered.length : featuredPGs.length,
      detail: hasSearchIntent ? 'results matching your current search' : `${filtered.length} searchable stays live`
    },
    {
      label: 'Verified listings',
      value: verifiedListingsCount,
      detail: 'owner details or review-backed trust signals'
    },
    {
      label: 'Transparent pricing',
      value: transparentListingsCount,
      detail: 'listings with structured monthly cost details'
    }
  ]

  const scrollToResults = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="homepage">
      <HomeSearchHero
        search={search}
        city={city}
        showFilters={showFilters}
        activePreset={activePreset}
        presets={SMART_PRESETS}
        metrics={heroMetrics}
        activeChips={activeChips}
        compareCount={selectedPGsForComparison.length}
        onSearchChange={setSearch}
        onCityChange={setCity}
        onToggleFilters={() => setShowFilters((previous) => !previous)}
        onBrowseResults={scrollToResults}
        onApplyPreset={applySmartPreset}
        onClearAllFilters={clearAllFilters}
        onGetLocation={getLocation}
        onOpenAI={() => setShowAIModal(true)}
        onOpenComparison={() => setShowComparisonModal(true)}
      />

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="homepage-filters-wrap">
          <HomeFilterPanel
            filters={filters}
            amenities={FILTER_AMENITIES}
            maxPrice={DEFAULT_MAX_PRICE}
            onUpdateFilter={updateFilter}
            onToggleAmenity={toggleAmenity}
          />
        </div>
      )}

      {/* ── Main Content ── */}
      <main ref={resultsRef} className="homepage-main">

        {/* Comparison bar */}
        {selectedPGsForComparison.length > 0 && (
          <section className="comparison-bar">
            <div className="comparison-bar-inner">
              <div>
                <span className="comparison-bar-eyebrow">Comparison ready</span>
                <h2 className="comparison-bar-title">
                  {comparisonReady
                    ? `Compare ${selectedPGsForComparison.length} shortlisted stays`
                    : `Select ${2 - selectedPGsForComparison.length} more to compare`}
                </h2>
                <p className="comparison-bar-desc">
                  Side-by-side pricing, distance, and trust signals.
                </p>
              </div>
              <div className="comparison-bar-actions">
                <button type="button" className="btn-secondary-sm" onClick={clearComparisonSelection}>
                  Clear
                </button>
                <button
                  type="button"
                  className={`btn-primary-sm${comparisonReady ? '' : ' disabled'}`}
                  onClick={() => setShowComparisonModal(true)}
                  disabled={!comparisonReady}
                >
                  Compare Now
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Toolbar */}
        <section className="listings-toolbar">
          <div className="listings-toolbar-left">
            <h2 className="listings-toolbar-title">
              {hasSearchIntent ? 'Search Results' : 'Featured PGs'}
            </h2>
            <p className="listings-toolbar-subtitle">
              {hasSearchIntent
                ? `${filtered.length} stays match your filters`
                : `${filtered.length} verified stays available`}
            </p>
          </div>
          <div className="listings-toolbar-right">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="toolbar-select"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Highest Rated</option>
              <option value="distance">Nearest</option>
              <option value="newest">Newest</option>
            </select>
            <button type="button" className="toolbar-btn" onClick={() => setShowFilters((prev) => !prev)}>
              {showFilters ? 'Hide Filters' : 'Filters'}
            </button>
            <button type="button" className="toolbar-btn" onClick={clearAllFilters}>
              Reset
            </button>
          </div>
        </section>

        {/* Listings Grid */}
        {loading ? (
          <div className="listings-loading">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <section className="listings-empty">
            <h2>No matching stays found</h2>
            <p>Try removing some filters or broadening your search.</p>
            <button type="button" className="btn-primary-sm" onClick={clearAllFilters}>
              Reset Search
            </button>
          </section>
        ) : (
          <>
            <section className="listings-section">
              <div className="section-header">
                <span className="section-eyebrow">
                  {hasSearchIntent ? 'Top Matches' : 'Featured'}
                </span>
                <h3 className="section-title">
                  {hasSearchIntent ? 'Best matches for your filters' : 'Trusted PGs worth checking first'}
                </h3>
              </div>
              <div className="listings-grid">
                {featuredPGs.map((pg) => (
                  <HomeListingCard
                    key={pg.id}
                    pg={pg}
                    tier={getVerificationTier(pg)}
                    genderLabel={formatGender(pg.targetGender || 'co-ed')}
                    priceMeta={getTransparentPriceMeta(pg)}
                    trustScore={getListingTrustScore(pg)}
                    trustSignals={getListingTrustSignals(pg)}
                    shortlistReasons={getListingShortlistReasons(pg)}
                    selectedForComparison={selectedPGsForComparison.some((s) => s.id === pg.id)}
                    onToggleSelection={() => togglePGSelection(pg.id)}
                    onOpen={() => navigate(`/pg/${pg.id}`)}
                  />
                ))}
              </div>
            </section>

            {additionalPGs.length > 0 && (
              <section className="listings-section">
                <div className="section-header">
                  <span className="section-eyebrow">More Results</span>
                  <h3 className="section-title">Additional stays matching your search</h3>
                </div>
                <div className="listings-grid">
                  {additionalPGs.map((pg) => (
                    <HomeListingCard
                      key={pg.id}
                      pg={pg}
                      tier={getVerificationTier(pg)}
                      genderLabel={formatGender(pg.targetGender || 'co-ed')}
                      priceMeta={getTransparentPriceMeta(pg)}
                      trustScore={getListingTrustScore(pg)}
                      trustSignals={getListingTrustSignals(pg)}
                      shortlistReasons={getListingShortlistReasons(pg)}
                      selectedForComparison={selectedPGsForComparison.some((s) => s.id === pg.id)}
                      onToggleSelection={() => togglePGSelection(pg.id)}
                      onOpen={() => navigate(`/pg/${pg.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Benefits Section ── */}
        <section className="benefits-section">
          <div className="section-header centered">
            <span className="section-eyebrow">Why Students Choose Us</span>
            <h2 className="section-title lg">The smarter way to find your next PG</h2>
            <p className="section-subtitle">Every feature is built around what students actually need when searching for accommodation.</p>
          </div>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="benefit-title">Verified Listings</h3>
              <p className="benefit-desc">Every PG goes through owner verification and document checks before appearing on the platform.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="benefit-title">Transparent Pricing</h3>
              <p className="benefit-desc">See rent, electricity, food, and hidden charges upfront — no surprises after you move in.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h3 className="benefit-title">No Brokers</h3>
              <p className="benefit-desc">Connect directly with PG owners. No middlemen, no broker fees, no commission games.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 className="benefit-title">Real Reviews</h3>
              <p className="benefit-desc">Read honest reviews from actual residents about food, WiFi, cleanliness, and management.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer CTA ── */}
      <footer className="homepage-footer">
        <div className="footer-inner">
          <h2 className="footer-title">Ready to find your perfect stay?</h2>
          <p className="footer-desc">
            Compare verified PGs, read honest reviews, and shortlist with confidence — before you even visit.
          </p>
          {!user && (
            <button type="button" className="footer-cta" onClick={() => navigate('/register')}>
              Get Started Free
            </button>
          )}
          <button type="button" className="footer-cta-secondary" onClick={scrollToResults}>
            Browse All Stays
          </button>
        </div>
      </footer>

      {/* Modals (unchanged) */}
      <AIRecommendationModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onRecommendations={setAiRecommendations}
      />

      {aiRecommendations && (
        <AIRecommendationsDisplay
          recommendations={aiRecommendations}
          onClose={() => setAiRecommendations(null)}
        />
      )}

      <ComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        selectedPGs={selectedPGsForComparison}
        onToggleSelection={togglePGSelection}
        onClearSelection={clearComparisonSelection}
      />
    </div>
  )
}
