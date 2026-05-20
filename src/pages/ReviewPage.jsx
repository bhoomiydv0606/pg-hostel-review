import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { signOut } from 'firebase/auth'
import { uploadToCloudinary } from '../utils/cloudinary'
import { CategoryRatingInput, CATEGORIES } from '../components/CategoryRating'

export default function ReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()
  const foodFileRef = useRef()
  const [pg, setPG] = useState(null)
  const { user, isBanned, loading: authLoading } = useAuth()
  const [rating, setRating] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState({})
  const [existingReviewId, setExistingReviewId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [stayFrom, setStayFrom] = useState('')
  const [stayTo, setStayTo] = useState('')
  const [actualMonthlyPay, setActualMonthlyPay] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [existingProofURL, setExistingProofURL] = useState('')
  const [proofPreview, setProofPreview] = useState(null)
  const [foodPhotos, setFoodPhotos] = useState([])
  const [foodPreviews, setFoodPreviews] = useState([])
  const [existingFoodPhotoURLs, setExistingFoodPhotoURLs] = useState([])
  const [hover, setHover] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
    } else if (isBanned) {
      signOut(auth).then(() => navigate('/'))
    }
  }, [user, isBanned, authLoading, navigate])

  useEffect(() => {
    getDoc(doc(db, 'pgs', id)).then(d => {
      if (d.exists()) setPG({ id: d.id, ...d.data() })
      else navigate('/')
    })
  }, [id, navigate])

  useEffect(() => {
    if (!user || !id) return
    const fetchExistingReview = async () => {
      const q = query(collection(db, 'reviews'),
        where('pgId', '==', id),
        where('userId', '==', user.uid)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const revData = snap.docs[0].data()
        setExistingReviewId(snap.docs[0].id)
        setRating(revData.rating || 0)
        setCategoryRatings(revData.ratings || {})
        setTitle(revData.title || '')
        setBody(revData.body || '')
        setStayFrom(revData.stayFrom || '')
        setStayTo(revData.stayTo || '')
        setActualMonthlyPay(revData.actualMonthlyPay || '')
        setExistingProofURL(revData.proofURL || '')
        setProofPreview(revData.proofURL || null)
        setExistingFoodPhotoURLs(revData.foodPhotoURLs || [])
        setFoodPreviews(revData.foodPhotoURLs || [])
      }
    }
    fetchExistingReview()
  }, [user, id])

  // Auto-compute overall rating from category averages
  useEffect(() => {
    const vals = Object.values(categoryRatings).filter(v => v > 0)
    if (vals.length > 0) {
      setRating(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length))
    }
  }, [categoryRatings])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = e => setProofPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleFoodPhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 5)
    setFoodPhotos(prev => [...prev, ...files].slice(0, 5))
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setFoodPreviews(prev => [...prev, ev.target.result].slice(0, 5))
      reader.readAsDataURL(file)
    })
  }

  const removeFoodPhoto = (index) => {
    setFoodPhotos(prev => prev.filter((_, i) => i !== index))
    setFoodPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    const catVals = Object.values(categoryRatings).filter(v => v > 0)
    if (catVals.length < 3) return setError('Please rate at least 3 categories')
    if (!body.trim()) return setError('Please write your review')
    if (!stayFrom || !stayTo) return setError('Please enter your stay period')
    if (stayFrom > stayTo) return setError('"Stay From" cannot be after "Stay To"')
    const now = new Date().toISOString().slice(0, 7)
    if (stayFrom > now) return setError('"Stay From" cannot be in the future')
    if (!proofFile && !existingProofURL) return setError('Please upload a proof photo or receipt for verification.')

    setLoading(true)
    try {
      let proofURL = existingProofURL || ''
      if (proofFile) {
        if (proofFile.size > 10 * 1024 * 1024) {
          setError('File is too large. Please upload media under 10MB.')
          setLoading(false)
          return
        }
        proofURL = await uploadToCloudinary(proofFile)
      }

      // Upload food photos
      let foodPhotoURLs = [...existingFoodPhotoURLs]
      if (foodPhotos.length > 0) {
        const uploads = await Promise.all(
          foodPhotos.map(f => {
            if (f.size > 10 * 1024 * 1024) throw new Error('Food photo too large (max 10MB)')
            return uploadToCloudinary(f)
          })
        )
        foodPhotoURLs = [...foodPhotoURLs, ...uploads].slice(0, 5)
      }

      const reviewData = {
        pgId: id,
        pgName: pg.name,
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        userEmail: user.email,
        rating,
        ratings: categoryRatings,
        title,
        body,
        stayFrom,
        stayTo,
        actualMonthlyPay: Number(actualMonthlyPay) || null,
        proofURL,
        foodPhotoURLs,
        isProofPublic: false,
        verified: true, // All logged-in users are verified
        status: 'pending',
        helpfulCount: 0,
        reportCount: 0,
        ownerReply: null,
        createdAt: new Date()
      }

      if (existingReviewId) {
        await updateDoc(doc(db, 'reviews', existingReviewId), reviewData)
      } else {
        await addDoc(collection(db, 'reviews'), reviewData)
      }

      setSuccess('Your critique has been submitted for verification. Redirecting...')
      setTimeout(() => navigate(`/pg/${id}`), 3000)
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.')
      console.error(err)
    }
    setLoading(false)
  }

  if (!pg) return <div className="spinner" style={{marginTop:80}} />

  return (
    <div className="review-page page animate-fade-in" style={{ padding: '80px 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>

        <div style={{ marginBottom: '48px' }}>
          <button className="btn btn-outline btn-sm mb-6" onClick={() => navigate(`/pg/${id}`)} style={{ borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
             ← RETURN TO RESIDENCY
          </button>
          <h1 style={{ fontSize: '48px', marginBottom: '12px' }}>{existingReviewId ? 'Refine Critique' : 'Submit Critique'}</h1>
          <p style={{ color: 'var(--color-muted)', fontWeight: 500, fontSize: '18px' }}>
            Your honest experience helps curate the Antigravity collection.
          </p>
        </div>

        <div className="glass-card responsive-page-card" style={{ padding: '60px' }}>
          {error && <div className="alert alert-danger" style={{ borderRadius: '16px', marginBottom: '32px' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ borderRadius: '16px', marginBottom: '32px' }}>{success}</div>}

          <form onSubmit={handleSubmit}>

            {/* Category Ratings */}
            <div style={{ marginBottom: '48px' }}>
              <label className="form-label" style={{ marginBottom: '20px', fontSize: '14px', letterSpacing: '1px', textAlign: 'center', display: 'block' }}>
                RATE YOUR EXPERIENCE
              </label>
              <CategoryRatingInput ratings={categoryRatings} onChange={setCategoryRatings} />

              {/* Computed Overall Rating */}
              {rating > 0 && (
                <div style={{
                  textAlign: 'center', marginTop: '20px', padding: '16px',
                  background: 'var(--color-bone)', borderRadius: '16px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
                    OVERALL RATING
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{ fontSize: '28px', color: i <= rating ? 'var(--color-coral)' : 'rgba(0,0,0,0.08)' }}>★</span>
                    ))}
                    <span style={{ fontSize: '20px', fontWeight: 800, marginLeft: '8px' }}>{rating}.0</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    Auto-calculated from category ratings
                  </div>
                </div>
              )}
            </div>

            {/* Stay Period */}
            <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="form-group">
                <label className="form-label">Stay Commenced</label>
                <input type="month" className="form-control" value={stayFrom} onChange={e => setStayFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Stay Concluded</label>
                <input type="month" className="form-control" value={stayTo} onChange={e => setStayTo(e.target.value)} />
              </div>
            </div>

            {/* Actual Monthly Pay — Price Transparency */}
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💰</span> What Did You Actually Pay Per Month?
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-muted)', fontWeight: 700, fontSize: '16px'
                }}>₹</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Total monthly amount including all charges"
                  value={actualMonthlyPay}
                  onChange={e => setActualMonthlyPay(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px' }}>
                ℹ️ This helps other residents understand total costs including hidden charges.
              </p>
            </div>

            {/* Title */}
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Critique Narrative Headline</label>
              <input type="text" className="form-control" placeholder="Summarize your experience..." value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Body */}
            <div className="form-group" style={{ marginBottom: '48px' }}>
              <label className="form-label">Detailed Narrative</label>
              <textarea className="form-control" rows={6} placeholder="Describe the cleanliness, management, food, and atmosphere..." value={body} onChange={e => setBody(e.target.value)} />
            </div>

            {/* Food Photos — Separate Section */}
            <div className="form-group" style={{ marginBottom: '48px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🍽️</span> Food Photos (Optional — Up to 5)
              </label>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px', marginBottom: '12px'
              }}>
                {foodPreviews.map((preview, idx) => (
                  <div key={idx} style={{
                    position: 'relative', height: '120px', borderRadius: '16px',
                    overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Food ${idx + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeFoodPhoto(idx)}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                        cursor: 'pointer', fontSize: '12px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    >✕</button>
                  </div>
                ))}

                {foodPreviews.length < 5 && (
                  <div
                    style={{
                      height: '120px', border: '2px dashed rgba(0,0,0,0.06)',
                      borderRadius: '16px', background: 'var(--color-bone)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                    onClick={() => foodFileRef.current.click()}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-coral)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'}
                  >
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>📷</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-muted)' }}>ADD PHOTO</span>
                  </div>
                )}
              </div>
              <input
                ref={foodFileRef} type="file" accept="image/*" multiple
                style={{ display: 'none' }} onChange={handleFoodPhotos}
              />
              <p style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                📸 Share what the meals actually look like — helps future residents make informed decisions.
              </p>
            </div>

            {/* Verification Proof Section */}
            <div className="form-group" style={{ marginBottom: '48px' }}>
              <label className="form-label">Verification Vignette (Required)</label>
              <div
                style={{
                  height: '200px',
                  border: '2px dashed rgba(0,0,0,0.05)',
                  borderRadius: '24px',
                  background: 'var(--color-bone)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => fileRef.current.click()}
              >
                {proofPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                     {proofPreview.includes('data:video') || (typeof proofPreview === 'string' && proofPreview.includes('/video/')) ? (
                       <video src={proofPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                       <img src={proofPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Proof preview" />
                     )}
                     <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '12px', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        CHANGE MEDIA
                     </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-muted)' }}>UPLOAD PROOF OF RESIDENCY</div>
                    <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.3)', marginTop: '8px', fontWeight: 600 }}>RECEIPT, ID CARD, OR SHORT VIDEO</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '16px', lineHeight: 1.5 }}>
                ℹ️ Proof of residency is strictly for internal verification by our concierge team and will never be shared publicly.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '24px', borderRadius: '24px', fontSize: '16px' }} disabled={loading}>
              {loading ? 'TRANSMITTING...' : (existingReviewId ? 'UPDATE CRITIQUE' : 'SUBMIT TO CONCIERGE')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
