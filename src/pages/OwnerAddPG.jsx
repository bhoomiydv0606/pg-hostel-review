import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../firebase'
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { uploadToCloudinary } from '../utils/cloudinary'
import { PricingInput } from '../components/PricingBreakdown'

const AMENITIES = ['WiFi','AC','Laundry','Meals','Parking','Hot Water','CCTV','Power Backup','Gym']
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snacks']
const GENDER_OPTIONS = [
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'co-ed', label: 'Co-ed' }
]

export default function OwnerAddPG() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { user, isOwner, isAdmin, loading: authLoading } = useAuth()
  const [msg, setMsg] = useState('')
  const [locationStatus, setLocationStatus] = useState('')

  const [form, setForm] = useState({
    name:'', city:'', address:'', rentMin:'', rentMax:'',
    description:'', contactName:'', contactPhone:'', amenities:[],
    latitude:'', longitude:'', targetGender:'co-ed',
    nearestCollege:'', collegeDistanceKm:''
  })
  const [pricing, setPricing] = useState({
    baseRent: '', electricity: '', food: '', maintenance: '',
    other: '', securityDeposit: '', noticePeriodDays: '', lockInMonths: '',
    hasAC: false, acPricing: { baseRent: '', electricity: '', food: '', maintenance: '', other: '' },
    hiddenCharges: []
  })
  const [foodInfo, setFoodInfo] = useState({
    available: false, type: 'veg', mealsIncluded: [],
    mealCostIfSeparate: '', cuisine: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [existingImageURL, setExistingImageURL] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    if (id && !isOwner && !isAdmin) { navigate('/'); return }
    if (id) fetchPG(id, user.uid)
  }, [id, user, isOwner, isAdmin, authLoading, navigate])

  const fetchPG = async (pgId, uid) => {
    const d = await getDoc(doc(db, 'pgs', pgId))
    if (d.exists()) {
      const data = d.data()
      if (data.ownerId !== uid && !isAdmin) { navigate('/profile'); return }
      setForm({
        name: data.name, city: data.city, address: data.address,
        rentMin: data.rentMin, rentMax: data.rentMax,
        description: data.description, contactName: data.contactName,
        contactPhone: data.contactPhone, amenities: data.amenities || [],
        latitude: data.latitude ? String(data.latitude) : '',
        longitude: data.longitude ? String(data.longitude) : '',
        targetGender: data.targetGender || 'co-ed',
        nearestCollege: data.nearestCollege || '',
        collegeDistanceKm: data.collegeDistanceKm != null ? String(data.collegeDistanceKm) : ''
      })
      if (data.pricing) setPricing({
        baseRent: data.pricing.baseRent || '',
        electricity: data.pricing.electricity || '',
        food: data.pricing.food || '',
        maintenance: data.pricing.maintenance || '',
        other: data.pricing.other || '',
        securityDeposit: data.pricing.securityDeposit || '',
        noticePeriodDays: data.pricing.noticePeriodDays || '',
        lockInMonths: data.pricing.lockInMonths || '',
        hasAC: data.pricing.hasAC || false,
        acPricing: data.pricing.acPricing || { baseRent: '', electricity: '', food: '', maintenance: '', other: '' },
        hiddenCharges: data.pricing.hiddenCharges || []
      })
      if (data.foodInfo) setFoodInfo(data.foodInfo)
      setExistingImageURL(data.imageURL || '')
    }
  }

  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
  }))

  const toggleMeal = (meal) => setFoodInfo(f => ({
    ...f,
    mealsIncluded: f.mealsIncluded.includes(meal)
      ? f.mealsIncluded.filter(m => m !== meal)
      : [...f.mealsIncluded, meal]
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    try {
      let imageURL = existingImageURL
      if (imageFile) {
        if (imageFile.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)')
        imageURL = await uploadToCloudinary(imageFile)
      }

      let lat = form.latitude ? Number(form.latitude) : null
      let lng = form.longitude ? Number(form.longitude) : null

      if ((form.latitude && !form.longitude) || (!form.latitude && form.longitude)) {
        throw new Error('Both latitude and longitude are required when setting location.')
      }

      // Calculate true cost from pricing
      const calcCost = (p) => (Number(p.baseRent) || 0) + (Number(p.electricity) || 0) + (Number(p.food) || 0) + (Number(p.maintenance) || 0) + (Number(p.other) || 0)
      const trueCost = calcCost(pricing)
      const acTrueCost = pricing.hasAC ? calcCost(pricing.acPricing) : 0

      const pgData = {
        ...form,
        imageURL,
        rentMin: Number(pricing.baseRent) || Number(form.rentMin) || 0,
        rentMax: trueCost || Number(form.rentMax) || 0,
        targetGender: form.targetGender || 'co-ed',
        nearestCollege: form.nearestCollege.trim(),
        collegeDistanceKm: form.collegeDistanceKm === '' ? null : Number(form.collegeDistanceKm),
        pricing: { ...pricing, trueCost, acTrueCost },
        foodInfo: foodInfo.available ? foodInfo : { available: false },
        ownerId: user.uid,
        updatedAt: new Date()
      }

      if (lat !== null && lng !== null) {
        pgData.latitude = lat
        pgData.longitude = lng
      } else {
        delete pgData.latitude
        delete pgData.longitude
      }

      if (id) {
        await updateDoc(doc(db, 'pgs', id), pgData)
        setMsg('Property updated successfully!')
        setTimeout(() => navigate('/profile'), 1500)
      } else {
        await addDoc(collection(db, 'pgs'), {
          ...pgData,
          isActive: false,
          avgRating: 0,
          reviewCount: 0,
          avgRatings: {},
          verificationTier: 'new',
          reportCount: 0,
          createdAt: new Date()
        })

        if (!isOwner && !isAdmin) {
          try {
            await updateDoc(doc(db, 'users', user.uid), { role: 'owner' })
          } catch (roleErr) {
            console.error("Failed to upgrade role:", roleErr)
          }
        }

        setMsg('Property submitted for review! Redirecting...')
        setTimeout(() => navigate('/profile'), 2000)
      }
    } catch (err) {
      setMsg('Error: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="add-pg-page page animate-fade-in" style={{ padding: '80px 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>

        <div style={{ marginBottom: '48px' }}>
          <button className="btn btn-outline btn-sm mb-6" onClick={() => navigate('/profile')} style={{ borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
             ← RETURN TO ATELIER
          </button>
          <h1 style={{ fontSize: '48px', marginBottom: '12px' }}>{id ? 'Refine Property' : 'Submit Residency'}</h1>
          <p style={{ color: 'var(--color-muted)', fontWeight: 500, fontSize: '18px' }}>
            Elevate your property to the Antigravity collection by providing precise details and stunning visuals.
          </p>
        </div>

        <div className="glass-card responsive-page-card" style={{ padding: '60px' }}>
          {msg && (
            <div className={`alert ${msg.includes('Error') ? 'alert-danger' : 'alert-success'}`} style={{ borderRadius: '16px', marginBottom: '32px' }}>
              {msg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="form-group">
                <label className="form-label">Property Title</label>
                <input className="form-control" required placeholder="Luxurious Stay..." value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" required placeholder="Bangalore, Mumbai..." value={form.city} onChange={e=>setForm({...form, city:e.target.value})} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Full Address</label>
              <input className="form-control" required placeholder="Street, Landmark, Pin..." value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
            </div>

            {/* Location */}
            <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '4px' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input type="number" step="any" className="form-control" value={form.latitude} onChange={e=>setForm({...form, latitude:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input type="number" step="any" className="form-control" value={form.longitude} onChange={e=>setForm({...form, longitude:e.target.value})} />
              </div>
            </div>
            <div style={{ marginBottom: '32px' }}>
              <button type="button" className="btn btn-outline" style={{ fontSize: '11px', fontWeight: 800, padding: '10px 20px', borderRadius: '12px' }}
                onClick={() => {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setForm(f => ({ ...f, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }))
                    setLocationStatus('GEOLOCATION SYNCED')
                  })
                }}
              >
                {locationStatus || 'SYNC CURRENT COORDINATES'}
              </button>
            </div>

            <div style={{ marginBottom: '48px', paddingTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Stay Profile</span>
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginBottom: '24px' }}>
                Add the listing details residents most often filter by before they shortlist a PG.
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Suitable For</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {GENDER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, targetGender: option.value }))}
                      className="badge"
                      style={{
                        cursor: 'pointer',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: 'none',
                        background: form.targetGender === option.value ? 'var(--color-ebony)' : 'var(--color-bone)',
                        color: form.targetGender === option.value ? '#fff' : 'var(--color-muted)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {option.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Nearest College / Landmark</label>
                  <input
                    className="form-control"
                    placeholder="Christ University, BMS, Main Campus..."
                    value={form.nearestCollege}
                    onChange={e => setForm({ ...form, nearestCollege: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Distance from College (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="form-control"
                    placeholder="2.5"
                    value={form.collegeDistanceKm}
                    onChange={e => setForm({ ...form, collegeDistanceKm: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* === PRICING BREAKDOWN === */}
            <div style={{ marginBottom: '48px', paddingTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>💰</span> Pricing Transparency
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginBottom: '32px' }}>
                Break down your pricing so residents know exactly what they'll pay — no surprises.
              </p>
              <PricingInput pricing={pricing} onChange={setPricing} />
            </div>

            {/* === FOOD DETAILS === */}
            <div style={{ marginBottom: '48px', paddingTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🍽️</span> Food & Meals
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginBottom: '24px' }}>
                Meal information is one of the top factors residents use when choosing a PG.
              </p>

              {/* Food Toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                marginBottom: '24px', padding: '16px 24px', borderRadius: '16px',
                background: foodInfo.available ? 'rgba(39,174,96,0.06)' : 'var(--color-bone)',
                border: '1px solid ' + (foodInfo.available ? 'rgba(39,174,96,0.15)' : 'rgba(0,0,0,0.03)'),
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
                onClick={() => setFoodInfo(f => ({ ...f, available: !f.available }))}
              >
                <div style={{
                  width: '48px', height: '28px', borderRadius: '14px',
                  background: foodInfo.available ? 'var(--color-sage)' : 'rgba(0,0,0,0.1)',
                  position: 'relative', transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '3px',
                    left: foodInfo.available ? '23px' : '3px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    {foodInfo.available ? 'Food Service Available ✓' : 'No Food Service'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {foodInfo.available ? 'Configure meal details below' : 'Toggle to add meal information'}
                  </div>
                </div>
              </div>

              {foodInfo.available && (
                <div style={{ padding: '0 8px' }}>
                  {/* Food Type */}
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Cuisine Type</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['veg', 'nonveg', 'both'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setFoodInfo(f => ({ ...f, type: t }))}
                          className="badge"
                          style={{
                            cursor: 'pointer', padding: '10px 18px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 800, border: 'none',
                            background: foodInfo.type === t ? 'var(--color-ebony)' : 'var(--color-bone)',
                            color: foodInfo.type === t ? '#fff' : 'var(--color-muted)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {t === 'veg' ? '🟢 VEG' : t === 'nonveg' ? '🔴 NON-VEG' : '🟡 BOTH'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meals Included */}
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Meals Included</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {MEAL_OPTIONS.map(meal => (
                        <button key={meal} type="button"
                          onClick={() => toggleMeal(meal)}
                          className="badge"
                          style={{
                            cursor: 'pointer', padding: '10px 18px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 800, border: 'none',
                            background: foodInfo.mealsIncluded.includes(meal) ? 'var(--color-sage)' : 'var(--color-bone)',
                            color: foodInfo.mealsIncluded.includes(meal) ? '#fff' : 'var(--color-muted)',
                            textTransform: 'uppercase', transition: 'all 0.2s ease'
                          }}
                        >
                          {meal}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cuisine & Cost */}
                  <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="form-label">Cuisine Style</label>
                      <input className="form-control" placeholder="North Indian, South Indian..." value={foodInfo.cuisine} onChange={e => setFoodInfo(f => ({ ...f, cuisine: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monthly Meal Cost (if separate)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontWeight: 700 }}>₹</span>
                        <input type="number" className="form-control" style={{ paddingLeft: '36px' }} placeholder="0" value={foodInfo.mealCostIfSeparate} onChange={e => setFoodInfo(f => ({ ...f, mealCostIfSeparate: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Property Narrative</label>
              <textarea className="form-control" rows={5} placeholder="Describe the soul of your residency..." value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
            </div>

            {/* Contact Info */}
            <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input className="form-control" placeholder="Property Manager Name" value={form.contactName} onChange={e=>setForm({...form, contactName:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Concierge Phone</label>
                <input className="form-control" placeholder="+91..." value={form.contactPhone} onChange={e=>setForm({...form, contactPhone:e.target.value})} />
              </div>
            </div>

            {/* Image Upload */}
            <div className="form-group" style={{ marginBottom: '40px' }}>
              <label className="form-label">Property Photo</label>
              <div style={{ position: 'relative', height: '180px', border: '2px dashed rgba(0,0,0,0.05)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bone)' }}>
                {imageFile ? (
                   <span style={{ fontWeight: 700, fontSize: '12px' }}>{imageFile.name} (READY)</span>
                ) : existingImageURL ? (
                   <img src={existingImageURL} style={{ height: '100%', width: '100%', objectFit: 'cover', borderRadius: '24px' }} alt="existing" />
                ) : (
                   <span style={{ color: 'var(--color-muted)', fontWeight: 600, fontSize: '14px' }}>DROP MEDIA OR CLICK TO BROWSE</span>
                )}
                <input type="file" className="form-control" accept="image/*,video/*" style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} onChange={e=>setImageFile(e.target.files[0])} />
              </div>
            </div>

            {/* Amenities */}
            <div className="form-group" style={{ marginBottom: '48px' }}>
              <label className="form-label">Curated Amenities</label>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {AMENITIES.map(a => (
                  <button type="button" key={a} onClick={() => toggleAmenity(a)}
                    className="badge"
                    style={{
                      cursor: 'pointer',
                      background: form.amenities.includes(a) ? 'var(--color-ebony)' : 'var(--color-bone)',
                      color: form.amenities.includes(a) ? '#fff' : 'var(--color-muted)',
                      border: 'none', padding: '10px 18px', borderRadius: '12px',
                      fontSize: '11px', fontWeight: 800, transition: 'all 0.3s ease'
                    }}>
                    {a.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '24px', borderRadius: '24px', fontSize: '16px' }} disabled={loading}>
              {loading ? 'CRAFTING...' : (id ? 'SAVE REFINEMENTS' : 'SUBMIT TO COLLECTION')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
