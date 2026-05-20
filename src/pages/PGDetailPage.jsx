import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TrustBadge, { getVerificationTier } from '../components/TrustBadge'
import { CategoryRatingDisplay } from '../components/CategoryRating'
import { PricingDisplay } from '../components/PricingBreakdown'
import { MonthlyCostCalculator } from '../components/MonthlyCostCalculator'
import { MapComponent } from '../components/MapComponent'
import VisitRequestModal from '../components/VisitRequestModal'
import ReportModal from '../components/ReportModal'
import OwnerReplySection from '../components/OwnerReplySection'
import PGPhotoGallery from '../components/PGPhotoGallery'
import BeforeAfterComparison from '../components/BeforeAfterComparison'
import PGPhotoUpload from '../components/PGPhotoUpload'
import { trackEvent } from '../utils/analytics'

function timeAgo(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`
  return `${Math.floor(diff / 31536000)}y ago`
}

function formatGender(value) {
  if (value === 'boys') return 'Boys'
  if (value === 'girls') return 'Girls'
  if (value === 'co-ed') return 'Co-ed'
  return 'Flexible'
}

export default function PGDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pg, setPG] = useState(null)
  const [reviews, setReviews] = useState([])
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [helpfulVotes, setHelpfulVotes] = useState({})
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const pgDoc = await getDoc(doc(db, 'pgs', id))
        if (!pgDoc.exists()) { navigate('/'); return }
        setPG({ id: pgDoc.id, ...pgDoc.data() })

        const snap = await getDocs(
          query(collection(db, 'reviews'),
            where('pgId', '==', id),
            where('status', '==', 'approved'),
            where('verified', '==', true))
        )
        const revs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        revs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setReviews(revs)
      } catch (err) {
        console.error("Error loading PG details:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  useEffect(() => {
    if (pg) {
      trackEvent('pg_viewed', {
        pgId: pg.id,
        pgName: pg.name,
        city: pg.city
      }, 'pg_viewed')
    }
  }, [pg])

  if (loading) return <div className="spinner" style={{marginTop:80}} />
  if (!pg) return null

  const tier = getVerificationTier(pg)
  const reportedPrices = reviews.filter(r => r.actualMonthlyPay).map(r => r.actualMonthlyPay)

  // Calculate aggregated category ratings from reviews
  const avgCategoryRatings = {}
  const catCounts = {}
  reviews.forEach(r => {
    if (r.ratings) {
      Object.entries(r.ratings).forEach(([k, v]) => {
        if (v > 0) {
          avgCategoryRatings[k] = (avgCategoryRatings[k] || 0) + v
          catCounts[k] = (catCounts[k] || 0) + 1
        }
      })
    }
  })
  Object.keys(avgCategoryRatings).forEach(k => {
    avgCategoryRatings[k] = Math.round((avgCategoryRatings[k] / catCounts[k]) * 10) / 10
  })

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review? This will permanently remove it from the page.')) return
    try {
      await deleteDoc(doc(db, 'reviews', reviewId))
      const snap = await getDocs(
        query(collection(db, 'reviews'), where('pgId', '==', id), where('status', '==', 'approved'))
      )
      const approved = snap.docs.map(d => d.data())
      const avg = approved.length ? (approved.reduce((s, r) => s + r.rating, 0) / approved.length) : 0
      const newRating = Math.round(avg * 10) / 10
      await updateDoc(doc(db, 'pgs', id), { avgRating: newRating, reviewCount: approved.length })
      setReviews(reviews.filter(r => r.id !== reviewId))
      setPG(p => ({ ...p, avgRating: newRating, reviewCount: approved.length }))
    } catch (err) {
      console.error("Error deleting review:", err)
    }
  }

  const handleHelpful = async (reviewId) => {
    if (helpfulVotes[reviewId]) return
    setHelpfulVotes(prev => ({ ...prev, [reviewId]: true }))
    try {
      const rev = reviews.find(r => r.id === reviewId)
      const newCount = (rev.helpfulCount || 0) + 1
      await updateDoc(doc(db, 'reviews', reviewId), { helpfulCount: newCount })
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulCount: newCount } : r))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="pg-detail-page page animate-fade-in" style={{ paddingBottom: '120px' }}>

      {/* Immersive Hero Header */}
      <section className="pg-detail-hero" style={{ position: 'relative', height: '60vh', minHeight: '500px', background: 'var(--color-ebony)', overflow: 'hidden' }}>
        {pg.imageURL ? (
          pg.imageURL.includes('/video/') ? (
            <video src={pg.imageURL} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} muted loop autoPlay playsInline preload="metadata" />
          ) : (
            <img src={pg.imageURL} alt={pg.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} fetchPriority="high" decoding="async" />
          )
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--color-ebony)' }}>
            <img 
              src="/premium_pg_hero_1774782011998.png" 
              alt="Premium Living" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
              fetchPriority="high"
              decoding="async"
            />
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)' }} />

        <div className="container pg-detail-hero-inner" style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
          <button className="btn btn-outline btn-sm mb-6" onClick={() => navigate('/')}
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', marginBottom: '32px' }}>
            ← BROWSE COLLECTION
          </button>
          <div className="pg-detail-hero-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="pg-detail-hero-copy" style={{ maxWidth: '700px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <TrustBadge tier={tier} />
                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {pg.city?.toUpperCase()}
                </span>
                {pg.foodInfo?.available && (
                  <span className="badge" style={{ background: 'rgba(39,174,96,0.2)', color: '#6ddb9e', border: '1px solid rgba(39,174,96,0.3)' }}>
                    🍽️ {pg.foodInfo.type === 'veg' ? 'VEG' : pg.foodInfo.type === 'nonveg' ? 'NON-VEG' : 'VEG + NON-VEG'}
                  </span>
                )}
              </div>
              <h1 className="pg-detail-hero-title" style={{ color: '#fff', fontSize: '64px', marginBottom: '16px', lineHeight: 1.1 }}>{pg.name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', fontWeight: 500 }}>📍 {pg.address}</p>
            </div>

            {/* True Cost Card */}
            <div className="glass-card pg-detail-hero-price-card" style={{ padding: '32px', background: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', minWidth: '220px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px', opacity: 0.6, letterSpacing: '1px' }}>
                {pg.pricing?.trueCost ? 'TRUE MONTHLY COST' : 'MONTHLY TARIFF'}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800 }}>
                ₹{(pg.pricing?.trueCost || pg.rentMin || 0).toLocaleString()}
                {pg.pricing?.trueCost ? <span style={{ fontSize: '14px', opacity: 0.5 }}>/mo</span> : '+'}
              </div>
              {pg.pricing?.baseRent && pg.pricing.trueCost > pg.pricing.baseRent && (
                <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>
                  Base rent: ₹{Number(pg.pricing.baseRent).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container pg-detail-body" style={{ marginTop: '80px' }}>
        <div className="pg-detail-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.8fr) minmax(300px, 1fr)', gap: '60px' }}>

          {/* Main Narrative */}
          <div className="pg-detail-main-column">
            <div style={{ marginBottom: '60px' }}>
              <h3 style={{ fontSize: '32px', marginBottom: '24px' }}>The Residence Narrative</h3>
              <p style={{ fontSize: '18px', lineHeight: 1.8, color: 'var(--color-muted)', whiteSpace: 'pre-line' }}>
                {pg.description || "A meticulously maintained residency offering the perfect balance of privacy and community engagement."}
              </p>
            </div>

            {/* Category Ratings Breakdown */}
            {Object.keys(avgCategoryRatings).length > 0 && (
              <div style={{ marginBottom: '60px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Experience Breakdown</h3>
                <div className="glass-card" style={{ padding: '32px' }}>
                  <CategoryRatingDisplay ratings={avgCategoryRatings} />
                </div>
              </div>
            )}

            {/* Pricing Breakdown */}
            {pg.pricing?.baseRent && (
              <div style={{ marginBottom: '60px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Complete Pricing</h3>
                <div className="glass-card" style={{ padding: '32px' }}>
                  <PricingDisplay pricing={pg.pricing} reportedPrices={reportedPrices} />
                </div>
                <div style={{ marginTop: '24px' }}>
                  <MonthlyCostCalculator pricing={pg.pricing} />
                </div>
              </div>
            )}

            {/* Food Details */}
            {pg.foodInfo?.available && (
              <div style={{ marginBottom: '60px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Food & Meals</h3>
                <div className="glass-card" style={{ padding: '32px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--color-bone)', borderRadius: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                        {pg.foodInfo.type === 'veg' ? '🟢' : pg.foodInfo.type === 'nonveg' ? '🔴' : '🟡'}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                        {pg.foodInfo.type === 'veg' ? 'Vegetarian' : pg.foodInfo.type === 'nonveg' ? 'Non-Veg' : 'Both'}
                      </div>
                    </div>
                    {(pg.foodInfo.mealsIncluded || []).map(meal => (
                      <div key={meal} style={{ padding: '16px', background: 'var(--color-bone)', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                          {meal === 'breakfast' ? '🌅' : meal === 'lunch' ? '☀️' : meal === 'dinner' ? '🌙' : '🍪'}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{meal}</div>
                      </div>
                    ))}
                    {pg.foodInfo.cuisine && (
                      <div style={{ padding: '16px', background: 'var(--color-bone)', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>🍛</div>
                        <div style={{ fontSize: '11px', fontWeight: 800 }}>{pg.foodInfo.cuisine}</div>
                      </div>
                    )}
                  </div>
                  {pg.foodInfo.mealCostIfSeparate && Number(pg.foodInfo.mealCostIfSeparate) > 0 && (
                    <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-muted)', fontWeight: 600 }}>
                      💰 Meal cost if billed separately: ₹{Number(pg.foodInfo.mealCostIfSeparate).toLocaleString()}/mo
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Intelligence */}
            {(pg.latitude && pg.longitude) && (
              <div style={{ marginBottom: '60px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Location Intelligence</h3>
                <div className="glass-card" style={{ padding: '32px' }}>
                  <MapComponent
                    center={{ lat: pg.latitude, lng: pg.longitude }}
                    markers={[{
                      position: { lat: pg.latitude, lng: pg.longitude },
                      title: pg.name
                    }]}
                    style={{ height: '400px' }}
                  />
                  <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-muted)' }}>
                    📍 Exact location shown for verified stays. Distance calculations based on user reports.
                  </div>
                </div>
              </div>
            )}

            {/* Direct Communication */}
            <div style={{ marginBottom: '60px' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Direct Owner Communication</h3>
              <div className="glass-card" style={{ padding: '32px' }}>
                <p style={{ fontSize: '16px', color: 'var(--color-muted)', marginBottom: '24px' }}>
                  Connect directly with the owner — no brokers, no middlemen. Schedule visits and get instant responses.
                </p>
                <div className="pg-detail-contact-actions" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      trackEvent('contact_owner_clicked', { pgId: pg.id, channel: 'whatsapp' }, 'contact_owner')
                      window.open(`https://wa.me/${pg.contactPhone}?text=Hi, I'm interested in ${pg.name}. Can we chat?`, '_blank')
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    💬 Chat with Owner
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      trackEvent('contact_owner_clicked', { pgId: pg.id, channel: 'phone' }, 'contact_owner')
                      window.open(`tel:${pg.contactPhone}`)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    📞 Call Owner
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      trackEvent('contact_owner_clicked', { pgId: pg.id, channel: 'visit_request' }, 'contact_owner')
                      setShowVisitModal(true)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    🏠 Request Visit
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '60px' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Stay Snapshot</h3>
              <div className="pg-detail-snapshot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '20px', background: 'var(--color-bone)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px', letterSpacing: '1px' }}>
                    Suitable For
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatGender(pg.targetGender || 'co-ed')}</div>
                </div>
                <div style={{ padding: '20px', background: 'var(--color-bone)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px', letterSpacing: '1px' }}>
                    Distance from College
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>
                    {Number.isFinite(Number(pg.collegeDistanceKm)) ? `${Number(pg.collegeDistanceKm).toFixed(1)} km` : 'Not shared'}
                  </div>
                </div>
                <div style={{ padding: '20px', background: 'var(--color-bone)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px', letterSpacing: '1px' }}>
                    Nearest College
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{pg.nearestCollege || 'Not shared'}</div>
                </div>
              </div>
            </div>

            {/* Curated Amenities */}
            <div style={{ marginBottom: '60px' }}>
               <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Curated Amenities</h3>
               <div className="pg-detail-amenities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                  {(pg.amenities || []).map(a => (
                    <div key={a} style={{ padding: '20px', background: 'var(--color-bone)', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '20px', marginBottom: '8px' }}>✨</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{a}</div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Real Photos by Residents */}
            <div style={{ marginBottom: '60px' }}>
              <div className="pg-detail-photo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '24px' }}>📸 Real Photos by Residents</h3>
                {user && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowPhotoUpload(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📷 Share Photos
                  </button>
                )}
              </div>
              <PGPhotoGallery pgId={id} refreshKey={photoRefreshKey} />
            </div>

            {/* Before/After Comparisons */}
            <div style={{ marginBottom: '60px' }}>
              <BeforeAfterComparison pgId={id} refreshKey={photoRefreshKey} />
            </div>

            {/* Critique Section */}
            <div style={{ paddingTop: '60px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="pg-detail-review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '32px' }}>Resident Critiques</h3>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--color-coral)' }}>★ {pg.avgRating?.toFixed(1) || 'NEW'}</span>
                  <span style={{ color: 'var(--color-muted)', marginLeft: '12px', fontSize: '14px' }}>({pg.reviewCount} total)</span>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '80px 0' }}>
                   <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>No verified critiques recorded yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {reviews.map(rev => (
                    <div key={rev.id} className="glass-card" style={{ padding: '40px' }}>
                      <div className="pg-detail-review-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '4px' }}>{rev.userName}</div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 600 }}>
                              STAYED {rev.stayFrom} — {rev.stayTo}
                            </span>
                            <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.25)', fontWeight: 600 }}>
                              • {timeAgo(rev.createdAt)}
                            </span>
                            {rev.createdAt && (new Date() - rev.createdAt.toDate()) < 30 * 24 * 60 * 60 * 1000 && (
                              <span className="badge" style={{ background: 'var(--color-sage)', color: '#fff', fontSize: '10px', fontWeight: 800 }}>
                                RECENT
                              </span>
                            )}
                            <span className="badge" style={{ background: 'var(--color-ebony)', color: '#fff', fontSize: '10px', fontWeight: 800 }}>
                              VERIFIED
                            </span>
                          </div>
                        </div>
                        <div style={{ color: 'var(--color-coral)', fontSize: '20px', fontWeight: 800 }}>★ {rev.rating}</div>
                      </div>

                      {/* Category ratings mini-display */}
                      {rev.ratings && Object.keys(rev.ratings).length > 0 && (
                        <div style={{
                          display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px'
                        }}>
                          {Object.entries(rev.ratings).filter(([,v]) => v > 0).map(([k, v]) => (
                            <span key={k} style={{
                              padding: '4px 10px', borderRadius: '8px', fontSize: '10px',
                              fontWeight: 700, background: v >= 4 ? 'rgba(39,174,96,0.08)' : v >= 3 ? 'rgba(228,120,93,0.08)' : 'rgba(231,76,60,0.08)',
                              color: v >= 4 ? 'var(--color-sage)' : v >= 3 ? 'var(--color-coral)' : '#e74c3c',
                              textTransform: 'capitalize'
                            }}>
                              {k} ★{v}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actual Cost Badge */}
                      {rev.actualMonthlyPay && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '8px',
                          background: 'rgba(52,152,219,0.08)', border: '1px solid rgba(52,152,219,0.12)',
                          fontSize: '11px', fontWeight: 700, color: '#2980b9',
                          marginBottom: '16px'
                        }}>
                          💰 Paid: ₹{Number(rev.actualMonthlyPay).toLocaleString()}/mo
                        </div>
                      )}

                      {rev.title && <h4 style={{ fontSize: '20px', marginBottom: '12px' }}>{rev.title}</h4>}
                      <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--color-muted)', marginBottom: '24px' }}>{rev.body}</p>

                      {/* Food Photos Gallery */}
                      {rev.foodPhotoURLs && rev.foodPhotoURLs.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-muted)', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>
                            🍽️ Meal photos by resident
                          </div>
                          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                            {rev.foodPhotoURLs.map((url, idx) => (
                              <img key={idx} src={url} alt={`Food ${idx + 1}`} loading="lazy" decoding="async"
                                style={{
                                  width: '140px', height: '100px', objectFit: 'cover',
                                  borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)',
                                  cursor: 'pointer', flexShrink: 0
                                }}
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Proof Image */}
                      {rev.proofURL && rev.isProofPublic && (
                         <div style={{ marginBottom: '24px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                            {rev.proofURL.includes('/video/') ? (
                              <video src={rev.proofURL} controls style={{ width: '100%', height: 'auto' }} preload="metadata" />
                            ) : (
                              <img src={rev.proofURL} alt="Proof" style={{ width: '100%', height: 'auto' }} loading="lazy" decoding="async" />
                            )}
                         </div>
                      )}

                      {/* Footer: Badges + Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="badge" style={{
                            background: rev.proofURL ? 'var(--color-sage)' : 'rgba(0,0,0,0.06)',
                            color: rev.proofURL ? '#fff' : 'var(--color-muted)',
                            border: 'none', fontSize: '10px', fontWeight: 800
                          }}>
                            {rev.proofURL ? '✓ VERIFIED TENANT' : 'COMMUNITY REVIEW'}
                          </span>

                          {/* Helpful Button */}
                          <button
                            onClick={() => handleHelpful(rev.id)}
                            disabled={helpfulVotes[rev.id]}
                            style={{
                              background: helpfulVotes[rev.id] ? 'rgba(52,152,219,0.08)' : 'transparent',
                              border: '1px solid rgba(0,0,0,0.06)',
                              borderRadius: '8px', padding: '4px 10px', cursor: 'pointer',
                              fontSize: '11px', fontWeight: 600,
                              color: helpfulVotes[rev.id] ? '#2980b9' : 'var(--color-muted)',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            👍 Helpful {rev.helpfulCount > 0 && `(${rev.helpfulCount})`}
                          </button>
                        </div>

                        {user && user.uid === rev.userId && (
                          <div className="flex gap-4">
                            <button onClick={() => navigate(`/pg/${id}/review`)} className="btn btn-outline btn-sm">REDACT</button>
                            <button onClick={() => handleDeleteReview(rev.id)} className="btn btn-outline btn-sm" style={{ color: '#c0392b', borderColor: 'rgba(192,57,43,0.1)' }}>REMOVE</button>
                          </div>
                        )}
                      </div>

                      {/* Owner Reply */}
                      <OwnerReplySection review={rev} pgOwnerId={pg.ownerId} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="pg-detail-sidebar">
            <div className="glass-card pg-detail-sticky-card" style={{ position: 'sticky', top: '120px', padding: '48px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '32px' }}>Concierge Desk</h4>

              <div style={{ marginBottom: '40px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '12px' }}>Vouched for by</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                   <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{pg.contactName || 'Property Manager'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Verified Partner</div>
                   </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                <button className="btn btn-primary" style={{ height: '64px', fontSize: '16px', borderRadius: '20px' }}>
                   BOOK RESIDENCY
                </button>
                <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)', fontWeight: 500 }}>
                   Direct Dial: {pg.contactPhone || "Request Access"}
                </div>
              </div>

              <div style={{ background: 'var(--color-bone)', padding: '32px', borderRadius: '24px', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '24px', marginBottom: '16px' }}>🖋️</div>
                <h5 style={{ fontSize: '18px', marginBottom: '8px' }}>Experienced this Stay?</h5>
                <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px' }}>Help the community with your honest critique.</p>
                {user ? (
                  <Link
                    to={`/pg/${id}/review`}
                    className="btn btn-outline"
                    style={{ width: '100%', borderRadius: '16px' }}
                    onClick={() => trackEvent('review_intent_clicked', { pgId: id, source: 'sidebar_cta' }, 'review_intent')}
                  >
                    WRITE CRITIQUE
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="btn btn-outline"
                    style={{ width: '100%', borderRadius: '16px' }}
                    onClick={() => trackEvent('review_intent_clicked', { pgId: id, source: 'login_gate' }, 'review_intent')}
                  >
                    LOGIN TO REVIEW
                  </Link>
                )}
              </div>

              {/* Report Button */}
              <button
                onClick={() => setShowReport(true)}
                style={{
                  width: '100%', background: 'transparent', border: '1px dashed rgba(0,0,0,0.08)',
                  borderRadius: '14px', padding: '14px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = 'var(--color-muted)' }}
              >
                🚩 Report this listing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetId={id}
        targetType="listing"
        targetName={pg.name}
      />
      <VisitRequestModal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        pg={pg}
        user={user}
      />

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <PGPhotoUpload
          pgId={id}
          pgName={pg.name}
          onPhotoUploaded={() => {
            setPhotoRefreshKey(prev => prev + 1)
          }}
          onClose={() => setShowPhotoUpload(false)}
        />
      )}
    </div>
  )
}
