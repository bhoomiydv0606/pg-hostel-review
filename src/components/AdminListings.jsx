import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore'
import { uploadToCloudinary } from '../utils/cloudinary'

const AMENITIES = ['WiFi','AC','Laundry','Meals','Parking','Hot Water','CCTV','Power Backup','Gym']
const GENDER_OPTIONS = [
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'co-ed', label: 'Co-ed' }
]

export default function AdminListings({ setMsg }) {
  const [pgs, setPGs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({
    name:'', city:'', address:'', rentMin:'', rentMax:'',
    description:'', contactName:'', contactPhone:'', amenities:[],
    latitude:'', longitude:'', targetGender:'co-ed',
    nearestCollege:'', collegeDistanceKm:''
  })
  const [imageFile, setImageFile] = useState(null)

  const fetchPGs = async () => {
    try {
      const snap = await getDocs(collection(db, 'pgs'))
      setPGs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchPGs() }, [])

  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a)
      ? f.amenities.filter(x => x !== a)
      : [...f.amenities, a]
  }))

  const handleEdit = (pg) => {
    setForm({
      id: pg.id,
      name: pg.name || '',
      city: pg.city || '',
      address: pg.address || '',
      rentMin: pg.rentMin || '',
      rentMax: pg.rentMax || '',
      description: pg.description || '',
      contactName: pg.contactName || '',
      contactPhone: pg.contactPhone || '',
      amenities: pg.amenities || [],
      latitude: pg.latitude != null ? String(pg.latitude) : '',
      longitude: pg.longitude != null ? String(pg.longitude) : '',
      targetGender: pg.targetGender || 'co-ed',
      nearestCollege: pg.nearestCollege || '',
      collegeDistanceKm: pg.collegeDistanceKm != null ? String(pg.collegeDistanceKm) : '',
      existingImageURL: pg.imageURL || ''
    })
    setImageFile(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let imageURL = form.existingImageURL || ''
      if (imageFile) {
        if (imageFile.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)')
        imageURL = await uploadToCloudinary(imageFile)
      }

      let lat = form.latitude ? Number(form.latitude) : null
      let lng = form.longitude ? Number(form.longitude) : null

      const pgData = {
        name: form.name,
        city: form.city,
        address: form.address,
        description: form.description,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        amenities: form.amenities,
        imageURL,
        rentMin: Number(form.rentMin) || 0,
        rentMax: Number(form.rentMax) || 0,
        targetGender: form.targetGender || 'co-ed',
        nearestCollege: form.nearestCollege.trim(),
        collegeDistanceKm: form.collegeDistanceKm === '' ? null : Number(form.collegeDistanceKm),
        updatedAt: new Date()
      }

      if (lat !== null && lng !== null) {
        pgData.latitude = lat
        pgData.longitude = lng
      }

      if (form.id) {
        await updateDoc(doc(db, 'pgs', form.id), pgData)
        setMsg('Residency refined successfully.')
      } else {
        await addDoc(collection(db, 'pgs'), {
          ...pgData,
          isActive: true,
          avgRating: 0,
          reviewCount: 0,
          createdAt: new Date()
        })
        setMsg('New residency added to collection.')
      }
      
      setShowForm(false)
      fetchPGs()
    } catch (err) {
      setMsg('Error: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Residency Vault</h2>
          <p style={{ color: 'var(--color-muted)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            MANAGING {pgs.length} GLOBAL LISTINGS
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ borderRadius: '12px' }}>
          + ADD NEW RESIDENCY
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <input
          type="search"
          placeholder="Search name, city, address"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="form-control"
          style={{ flex: '1 1 240px', minWidth: 220 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="form-control"
          style={{ width: 160 }}
        >
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={genderFilter}
          onChange={(e) => { setGenderFilter(e.target.value); setPage(1) }}
          className="form-control"
          style={{ width: 160 }}
        >
          <option value="all">Any gender</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '18px' }}>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr style={{ background: 'var(--color-bone)' }}>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Residency</th>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>City</th>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Tariff</th>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Status</th>
                <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pgs.map(pg => (
                <tr key={pg.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{pg.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>{pg.address.slice(0, 30)}...</div>
                  </td>
                  <td style={{ padding: '24px', fontWeight: 600, fontSize: '14px' }}>{pg.city}</td>
                  <td style={{ padding: '24px', fontSize: '14px' }}>
                    {pg.rentMin ? `₹${pg.rentMin.toLocaleString()}+` : '—'}
                  </td>
                  <td style={{ padding: '24px' }}>
                    <span className="badge" style={{ 
                      background: pg.isActive ? 'var(--color-sage)' : 'var(--color-coral)', 
                      color: '#fff', 
                      border: 'none',
                      fontSize: '10px',
                      fontWeight: 800
                    }}>
                      {pg.isActive ? 'LIVE' : 'PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!pg.isActive && pg.ownerId && (
                        <button className="btn btn-primary btn-sm" style={{ padding: '6px 14px', borderRadius: '8px' }} onClick={async () => {
                          if (window.confirm(`Approve ${pg.name}?`)) {
                            await updateDoc(doc(db, 'pgs', pg.id), { isActive: true })
                            fetchPGs()
                          }
                        }}>APPROVE</button>
                      )}
                      <button className="btn btn-outline btn-sm" style={{ padding: '6px 14px', borderRadius: '8px' }} onClick={() => handleEdit(pg)}>REFINE</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13, 31, 27, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card animate-fade-in responsive-page-card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '60px' }}>
            <h3 style={{ marginBottom: '40px', fontSize: '32px' }}>{form.id ? 'Refine Residency' : 'Add New Residency'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Property Title</label>
                  <input className="form-control" required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">City Atelier</label>
                  <input className="form-control" required value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} />
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Topographic Address</label>
                <input className="form-control" required value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} />
              </div>

              <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input type="number" step="any" className="form-control" value={form.latitude} onChange={e => setForm(f=>({...f,latitude:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input type="number" step="any" className="form-control" value={form.longitude} onChange={e => setForm(f=>({...f,longitude:e.target.value}))} />
                </div>
              </div>

              <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="form-group">
                  <label className="form-label">Min Rent (₹)</label>
                  <input type="number" className="form-control" value={form.rentMin} onChange={e => setForm(f=>({...f,rentMin:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Rent (₹)</label>
                  <input type="number" className="form-control" value={form.rentMax} onChange={e => setForm(f=>({...f,rentMax:e.target.value}))} />
                </div>
              </div>

              <div style={{ marginBottom: '32px', padding: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.35)' }}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Suitable For</label>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {GENDER_OPTIONS.map(option => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setForm(f => ({ ...f, targetGender: option.value }))}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          background: form.targetGender === option.value ? 'var(--color-ebony)' : 'var(--color-bone)',
                          color: form.targetGender === option.value ? '#fff' : 'var(--color-muted)',
                          border: 'none'
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
                    <input className="form-control" value={form.nearestCollege} onChange={e => setForm(f=>({...f,nearestCollege:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Distance from College (km)</label>
                    <input type="number" min="0" step="0.1" className="form-control" value={form.collegeDistanceKm} onChange={e => setForm(f=>({...f,collegeDistanceKm:e.target.value}))} />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label">Property Narrative</label>
                <textarea className="form-control" rows={4} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} />
              </div>

              <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-control" value={form.contactName} onChange={e => setForm(f=>({...f,contactName:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-control" value={form.contactPhone} onChange={e => setForm(f=>({...f,contactPhone:e.target.value}))} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '40px' }}>
                <label className="form-label">Vignette (Media)</label>
                <input type="file" className="form-control" accept="image/*,video/*" onChange={e => setImageFile(e.target.files[0])} />
                {form.existingImageURL && <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '8px' }}>CURATING: <a href={form.existingImageURL} target="_blank" rel="noreferrer" style={{ color: 'var(--color-coral)', fontWeight: 700 }}>VIEW CURRENT</a></div>}
              </div>

              <div className="form-group" style={{ marginBottom: '48px' }}>
                <label className="form-label">Curated Amenities</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {AMENITIES.map(a => (
                    <button type="button" key={a} onClick={() => toggleAmenity(a)}
                      style={{ 
                        padding: '10px 18px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 800,
                        cursor: 'pointer', 
                        transition: 'all 0.3s ease',
                        background: form.amenities.includes(a) ? 'var(--color-ebony)' : 'var(--color-bone)', 
                        color: form.amenities.includes(a) ? '#fff' : 'var(--color-muted)',
                        border: 'none'
                      }}>
                      {a.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="responsive-action-row">
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '20px' }} disabled={loading}>{loading ? 'SYNCING...' : 'SAVE CHANGES'}</button>
                <button type="button" className="btn btn-outline" style={{ padding: '20px' }} onClick={() => setShowForm(false)}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
