import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, updateDoc, doc, query, where, getDoc } from 'firebase/firestore'

export default function AdminReviews({ setMsg }) {
  const [reviews, setReviews] = useState([])
  const [pgPrices, setPgPrices] = useState({})
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveModal, setApproveModal] = useState(null)
  const [makePublic, setMakePublic] = useState(false)

  useEffect(() => { fetchReviews() }, [])

  const fetchReviews = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'reviews'), where('status', '==', 'pending'))
      )
      const revs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setReviews(revs)

      // Fetch PG prices for mismatch detection
      const pgIds = [...new Set(revs.map(r => r.pgId))]
      const prices = {}
      for (const pgId of pgIds) {
        try {
          const pgDoc = await getDoc(doc(db, 'pgs', pgId))
          if (pgDoc.exists()) {
            const d = pgDoc.data()
            prices[pgId] = d.pricing?.trueCost || d.rentMin || 0
          }
        } catch (e) { /* skip */ }
      }
      setPgPrices(prices)
    } catch (err) {
      console.error(err)
    }
  }

  const confirmApprove = async () => {
    if (!approveModal) return
    const review = approveModal
    try {
      await updateDoc(doc(db, 'reviews', review.id), { 
        status: 'approved',
        isProofPublic: makePublic,
        moderatedAt: new Date()
      })
      
      const snap = await getDocs(
        query(collection(db, 'reviews'),
          where('pgId', '==', review.pgId),
          where('status', '==', 'approved'))
      )
      const approved = snap.docs.map(d => d.data())
      const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length

      // Aggregate category ratings
      const avgRatings = {}
      const catCounts = {}
      approved.forEach(r => {
        if (r.ratings) {
          Object.entries(r.ratings).forEach(([k, v]) => {
            if (v > 0) {
              avgRatings[k] = (avgRatings[k] || 0) + v
              catCounts[k] = (catCounts[k] || 0) + 1
            }
          })
        }
      })
      Object.keys(avgRatings).forEach(k => {
        avgRatings[k] = Math.round((avgRatings[k] / catCounts[k]) * 10) / 10
      })

      await updateDoc(doc(db, 'pgs', review.pgId), {
        avgRating: Math.round(avg * 10) / 10,
        reviewCount: approved.length,
        avgRatings
      })
      setMsg('Critique approved and synchronized with the collection.')
      setApproveModal(null)
      setMakePublic(false)
      fetchReviews()
    } catch (err) {
      setMsg('Approval error: ' + err.message)
    }
  }

  const rejectReview = async () => {
    if (!rejectReason.trim()) return
    try {
      await updateDoc(doc(db, 'reviews', rejectModal.id), {
        status: 'rejected',
        rejectionReason: rejectReason,
        moderatedAt: new Date()
      })
      setRejectModal(null)
      setRejectReason('')
      setMsg('Critique rejected.')
      fetchReviews()
    } catch (err) {
      setMsg('Rejection error: ' + err.message)
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Critique Queue</h2>
        <p style={{ color: 'var(--color-muted)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          VERIFYING {reviews.length} MEMBER EXPERIENCES
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="glass-card" style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
          <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Atelier Purified</h3>
          <p style={{ color: 'var(--color-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>The verification queue is currently empty.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {reviews.map(review => (
            <div key={review.id} className="glass-card animate-fade-in" style={{ padding: '40px', transition: 'transform 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{review.pgName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Critique from <span style={{ color: 'var(--color-ebony)', fontWeight: 800 }}>{review.userName}</span> ({review.userEmail})
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ fontSize: '18px', color: i <= review.rating ? 'var(--color-coral)' : 'var(--color-bone)' }}>★</span>
                  ))}
                </div>
              </div>

              {/* Category Ratings Chips */}
              {review.ratings && Object.keys(review.ratings).length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {Object.entries(review.ratings).filter(([,v]) => v > 0).map(([k, v]) => (
                    <span key={k} style={{
                      padding: '5px 12px', borderRadius: '8px', fontSize: '10px',
                      fontWeight: 700, textTransform: 'capitalize',
                      background: v >= 4 ? 'rgba(39,174,96,0.08)' : v >= 3 ? 'rgba(228,120,93,0.08)' : 'rgba(231,76,60,0.08)',
                      color: v >= 4 ? '#27ae60' : v >= 3 ? 'var(--color-coral)' : '#e74c3c'
                    }}>
                      {k} ★{v}
                    </span>
                  ))}
                </div>
              )}

              {/* Price Mismatch Warning */}
              {review.actualMonthlyPay && pgPrices[review.pgId] && (() => {
                const listedPrice = pgPrices[review.pgId]
                const diff = Math.abs(review.actualMonthlyPay - listedPrice)
                const pct = listedPrice > 0 ? (diff / listedPrice) * 100 : 0
                if (pct > 20) {
                  return (
                    <div style={{
                      background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.12)',
                      borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
                      display: 'flex', alignItems: 'center', gap: '10px'
                    }}>
                      <span style={{ fontSize: '16px' }}>⚠️</span>
                      <div style={{ fontSize: '11px' }}>
                        <span style={{ fontWeight: 800, color: '#c0392b' }}>PRICE MISMATCH ({Math.round(pct)}% off)</span>
                        <span style={{ color: 'var(--color-muted)' }}> — Reviewer paid ₹{review.actualMonthlyPay.toLocaleString()}, listing shows ₹{listedPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              <div style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', fontStyle: 'italic', background: 'var(--color-bone)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                {review.stayFrom && review.stayTo && (
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--color-muted)', letterSpacing: '1px' }}>RESIDENCY PERIOD: {review.stayFrom} – {review.stayTo}</div>
                )}
                {review.actualMonthlyPay && (
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', color: '#2980b9', letterSpacing: '1px' }}>💰 REPORTED MONTHLY PAY: ₹{Number(review.actualMonthlyPay).toLocaleString()}</div>
                )}
                {review.title && <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-ebony)', marginBottom: '8px' }}>{review.title}</div>}
                <div style={{ lineHeight: 1.8 }}>"{review.body}"</div>
              </div>

              {/* Food Photos */}
              {review.foodPhotoURLs && review.foodPhotoURLs.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--color-muted)', letterSpacing: '1px' }}>🍽️ FOOD PHOTOS ({review.foodPhotoURLs.length}):</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {review.foodPhotoURLs.map((url, i) => (
                      <div key={i} style={{ width: '100px', height: '80px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)' }}
                        onClick={() => window.open(url, '_blank')}>
                        <img src={url} alt={`Food ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.proofURL && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--color-muted)', letterSpacing: '1px' }}>VERIFICATION EVIDENCE:</div>
                  <div 
                    style={{ 
                      width: '200px', 
                      height: '140px', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      cursor: 'pointer',
                      border: '1px solid rgba(0,0,0,0.05)',
                      boxShadow: '0 8px 24px rgba(13,31,27,0.05)'
                    }}
                    onClick={() => window.open(review.proofURL, '_blank')}
                  >
                    <img src={review.proofURL} alt="proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', paddingTop: '32px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '16px', borderRadius: '12px' }}
                  onClick={() => { setApproveModal(review); setMakePublic(false); }}
                >
                  APPROVE & PUBLISH
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '16px', borderRadius: '12px' }}
                  onClick={() => { setRejectModal(review); setRejectReason('') }}
                >
                  DISMISS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13, 31, 27, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card animate-fade-in responsive-page-card" style={{ maxWidth: '480px', width: '100%', padding: '60px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '28px', marginBottom: '16px' }}>Verify Experience</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
              Confirming this critique will integrate it into the residency's global rating.
            </p>
            
            {approveModal.proofURL && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', cursor: 'pointer', background: 'var(--color-bone)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <input type="checkbox" checked={makePublic} onChange={e => setMakePublic(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--color-coral)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Display verification evidence publicly</span>
              </label>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-primary" style={{ padding: '16px' }} onClick={confirmApprove}>CONFIRM APPROVAL</button>
              <button className="btn btn-outline" style={{ padding: '16px' }} onClick={() => setApproveModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13, 31, 27, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card animate-fade-in responsive-page-card" style={{ maxWidth: '480px', width: '100%', padding: '60px' }}>
            <h3 style={{ fontSize: '28px', marginBottom: '16px', textAlign: 'center' }}>Dismiss Critique</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', textAlign: 'center' }}>
              High-fidelity feedback is required. Please provide a reason for dismissal to guide the member.
            </p>
            
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Narrative Reason</label>
              <textarea 
                className="form-control" 
                rows={3}
                placeholder="e.g. Verification evidence is incongruent..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-primary" style={{ padding: '16px' }} onClick={rejectReview} disabled={!rejectReason.trim()}>DISMISS CRITIQUE</button>
              <button className="btn btn-outline" style={{ padding: '16px' }} onClick={() => setRejectModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
