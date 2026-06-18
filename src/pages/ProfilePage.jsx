import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import {
  doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc
} from 'firebase/firestore'
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, signOut } from 'firebase/auth'
import { uploadToCloudinary } from '../utils/cloudinary'
import { useRef } from 'react'

export default function ProfilePage() {
  const { user, userRole, loading: authLoading, isAdmin, isOwner } = useAuth()
  const [reviews, setReviews] = useState([])
  const [ownerPGs, setOwnerPGs] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  
  // Form states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Profile Edit states
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }

    const fetchData = async () => {
      setDataLoading(true)
      try {
        // Fetch User Reviews
        const qRev = query(
          collection(db, 'reviews'), 
          where('userId', '==', user.uid)
        )
        const snapRev = await getDocs(qRev)
        const revData = snapRev.docs.map(d => ({ id: d.id, ...d.data() }))
        
        // Sort in memory to avoid needing a Firestore composite index
        revData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setReviews(revData)

        // Fetch Owner PGs if applicable
        if (isOwner || isAdmin) {
          const qPG = query(collection(db, 'pgs'), where('ownerId', '==', user.uid))
          const snapPG = await getDocs(qPG)
          setOwnerPGs(snapPG.docs.map(d => ({ id: d.id, ...d.data() })))
        }
      } catch (err) {
        console.error("Profile data fetch error:", err)
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [user, userRole, authLoading, isAdmin, isOwner, navigate])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    if (newPassword.length < 6) return setError('Password too short')
    
    setPassLoading(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPassword)
      setSuccess('Password updated successfully!')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setTimeout(() => setShowPass(false), 2000)
    } catch (err) {
      setError(err.message)
    }
    setPassLoading(false)
  }

  const handleUpdateName = async (e) => {
    e.preventDefault()
    if (!tempName.trim()) return setIsEditingName(false)
    setPassLoading(true)
    try {
      await updateProfile(auth.currentUser, { displayName: tempName.trim() })
      await updateDoc(doc(db, 'users', user.uid), { name: tempName.trim() })
      setSuccess('Identity updated successfully.')
      setIsEditingName(false)
    } catch (err) {
      setError('Failed to update name: ' + err.message)
    }
    setPassLoading(false)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadToCloudinary(file)
      await updateProfile(auth.currentUser, { photoURL: url })
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url })
      setSuccess('Profile picture updated!')
    } catch (err) {
      setError('Upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const handleDeleteReview = async (reviewId, pgId, rating) => {
    if (!window.confirm('Delete this review?')) return
    try {
      await deleteDoc(doc(db, 'reviews', reviewId))
      setReviews(reviews.filter(r => r.id !== reviewId))
      
      const pgRef = doc(db, 'pgs', pgId)
      const pgSnap = await getDoc(pgRef)
      if (pgSnap.exists()) {
        const data = pgSnap.data()
        const newCount = Math.max(0, (data.reviewCount || 1) - 1)
        const newRating = newCount === 0 ? 0 : ((data.avgRating * data.reviewCount) - rating) / newCount
        await updateDoc(pgRef, { avgRating: newRating, reviewCount: newCount })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = () => signOut(auth).then(() => navigate('/'))

  if (authLoading || dataLoading) return <div className="spinner" style={{marginTop:100}} />

  return (
    <div className="profile-page page animate-fade-in">
      <div className="container">
        
        {/* Profile Header */}
        <div className="glass-card" style={{ textAlign: 'center', marginBottom: '40px', padding: '60px' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 24px' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--color-ebony)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontFamily: 'var(--font-headline)' }}>
                {user.displayName?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
            )}
            <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--color-coral)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', cursor: 'pointer' }}>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} style={{display:'none'}} accept="image/*" />
              {uploading ? <div className="spinner-sm" /> : '📷'}
            </label>
          </div>
          <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>{user.displayName || 'Resident'}</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '15px', marginBottom: '24px', fontWeight: 500 }}>{user.email}</p>
          
          <div className="flex justify-center gap-4" style={{justifyContent: 'center'}}>
            <span className="badge" style={{ background: 'var(--color-ebony)', color: '#fff' }}>
              {isAdmin ? 'ADMINISTRATOR' : isOwner ? 'PREMIUM PARTNER' : 'VERIFIED RESIDENT'}
            </span>
          </div>
        </div>

        <div className="profile-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.5fr)', gap: '40px' }}>
          
          {/* Settings Section */}
          <div className="flex flex-col gap-4">
            <div className="glass-card">
              <h3 style={{ marginBottom: '32px', fontSize: '24px' }}>Account Atelier</h3>
              
              {success && <div className="alert alert-success" style={{borderRadius: '16px', marginBottom: '24px'}}>{success}</div>}
              {error && <div className="alert alert-danger" style={{borderRadius: '16px', marginBottom: '24px'}}>{error}</div>}
              
              <form onSubmit={handleUpdateName}>
                <div className="form-group">
                  <label className="form-label">Full Identity</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Your Name"
                    value={tempName || user.displayName || ''}
                    onChange={e => setTempName(e.target.value)}
                    style={{ borderRadius: '16px' }}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={passLoading}
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  {passLoading ? 'CRAFTING...' : 'UPDATE IDENTITY'}
                </button>
              </form>

              <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <h4 style={{ marginBottom: '20px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)' }}>Concierge Actions</h4>
                <button 
                  onClick={() => navigate('/owner/add-pg')} 
                  className="btn btn-outline"
                  style={{ width: '100%', marginBottom: '12px', justifyContent: 'flex-start', padding: '16px 24px', borderRadius: '16px' }}
                >
                  <span>🏢 Manage Residencies</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '16px 24px', color: '#c0392b', borderColor: 'rgba(192, 57, 43, 0.1)', borderRadius: '16px' }}
                >
                  <span>↪ Departure</span>
                </button>
              </div>
            </div>

            <div className="glass-card">
               <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>Security Vault</h3>
               <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowPass(!showPass)}
                  style={{ width: '100%', borderRadius: '12px' }}
               >
                  {showPass ? 'HIDE PASSCODE SETTINGS' : 'REWRITE PASSCODE'}
               </button>

               {showPass && (
                 <form onSubmit={handleUpdatePassword} style={{marginTop: '24px'}}>
                    <div className="form-group">
                      <label className="form-label">Current Passcode</label>
                      <input type="password" required className="form-control" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Passcode</label>
                      <input type="password" required className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Passcode</label>
                      <input type="password" required className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" style={{width: '100%'}} disabled={passLoading}>
                      {passLoading ? 'ENCRYPTING...' : 'SAVE NEW PASSCODE'}
                    </button>
                 </form>
               )}
            </div>
          </div>

          {/* Activity / Owner Invite */}
          <div className="flex flex-col gap-4">
            <div className="glass-card" style={{ background: 'var(--color-white)' }}>
              {!isOwner && !isAdmin ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '24px' }}>🛋️</div>
                  <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Become a Host.</h2>
                  <p style={{ color: 'var(--color-muted)', marginBottom: '40px', maxWidth: '380px', margin: '0 auto 40px' }}>
                    Elevate your property to a global standard. Join our curated collection of premium residences.
                  </p>
                  <button 
                    onClick={() => navigate('/owner/add-pg')}
                    className="btn btn-primary"
                    style={{ background: 'var(--color-coral)', padding: '18px 48px' }}
                  >
                    START HOSTING
                  </button>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '32px', fontSize: '24px' }}>Portfolio at a Glance</h3>
                  <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ padding: '24px', borderRadius: '24px', background: 'var(--color-bone)' }}>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-ebony)' }}>{ownerPGs.length}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginTop: '4px' }}>Listings</div>
                    </div>
                    <div style={{ padding: '24px', borderRadius: '24px', background: 'var(--color-bone)' }}>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-coral)' }}>4.8</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginTop: '4px' }}>Global Rating</div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h4 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: 700 }}>Residency Inventory</h4>
                    {ownerPGs.length === 0 ? (
                      <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>No active residencies yet.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {ownerPGs.map(pg => (
                          <div key={pg.id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{pg.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{pg.city} • <span style={{ color: pg.isActive ? 'var(--color-sage)' : 'var(--color-coral)', fontWeight: 700 }}>{pg.isActive ? 'LIVE' : 'PENDING'}</span></div>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/owner/edit-pg/${pg.id}`)}>Edit</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Review History */}
            <div className="glass-card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'24px'}}>
                <h3 style={{fontSize: '20px'}}>Review History</h3>
                <span style={{fontSize: '12px', color: 'var(--color-muted)', fontWeight: 700}}>{reviews.length} TOTAL</span>
              </div>
              
              {reviews.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px', color: 'var(--color-muted)', fontSize: '14px'}}>
                  Your residence critiques will appear here.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviews.map(rev => (
                    <div key={rev.id} style={{ padding: '20px', borderRadius: '16px', background: 'var(--color-bone)', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div className="flex justify-between items-start" style={{marginBottom: '8px'}}>
                        <div style={{fontWeight: 700, fontSize: '15px'}}>{rev.pgName}</div>
                        <div style={{color: 'var(--color-coral)', fontWeight: 800}}>★ {rev.rating}</div>
                      </div>
                      <p style={{fontSize: '14px', color: 'var(--color-muted)', lineHeight: '1.6'}}>"{rev.body || rev.text}"</p>
                      <div className="flex justify-between items-center mt-4">
                         <span style={{fontSize: '10px', color: '#aaa', fontWeight: 800}}>{rev.createdAt?.toDate?.().toLocaleDateString()}</span>
                         <button onClick={() => handleDeleteReview(rev.id, rev.pgId, rev.rating)} style={{background: 'none', border: 'none', color: '#c0392b', fontSize: '12px', cursor: 'pointer', fontWeight: 600}}>REMOVE</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
