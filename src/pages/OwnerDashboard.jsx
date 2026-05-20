import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'

export default function OwnerDashboard() {
  const { user, isOwner, isAdmin, loading: authLoading } = useAuth()
  const [pgs, setPGs] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (!isOwner && !isAdmin) {
      navigate('/')
      return
    }
    fetchOwnerPGs(user.uid)
  }, [user, isOwner, isAdmin, authLoading, navigate])

  const fetchOwnerPGs = async (uid) => {
    try {
      const q = query(collection(db, 'pgs'), where('ownerId', '==', uid))
      const snap = await getDocs(q)
      setPGs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
    }
    setDataLoading(false)
  }

  if (authLoading || dataLoading) return <div className="spinner" style={{marginTop:80}} />

  return (
    <div className="owner-dashboard-page page animate-fade-in" style={{ padding: '80px 0' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
          <div>
            <h1 style={{ fontSize: '48px', marginBottom: '8px' }}>Partner Dashboard</h1>
            <p style={{ color: 'var(--color-muted)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
               MANAGING {pgs.length} CURATED RESIDENCIES
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/owner/add-pg')} style={{ padding: '16px 32px', borderRadius: '16px' }}>
             + ADD NEW RESIDENCY
          </button>
        </div>

        {pgs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '120px 0', borderRadius: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🏘️</div>
            <h2 style={{ marginBottom: '16px' }}>Your portfolio is currently empty.</h2>
            <p style={{ color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto 40px' }}>
               Start your hosting journey by listing your first property for our collection.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/owner/add-pg')} style={{ padding: '18px 48px' }}>
              LIST YOUR FIRST PG
            </button>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '40px', borderRadius: '32px' }}>
            <div className="table-wrap">
              <table style={{ borderCollapse: 'separate', borderSpacing: '0 12px', width: '100%' }}>
                <thead style={{ background: 'transparent' }}>
                  <tr>
                    <th style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '0 24px' }}>Residency</th>
                    <th style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '0 24px' }}>Atelier City</th>
                    <th style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '0 24px' }}>Status</th>
                    <th style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '0 24px' }}>Performance</th>
                    <th style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '0 24px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pgs.map(pg => (
                    <tr key={pg.id} style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                      <td style={{ background: 'var(--color-bone)', padding: '24px', borderRadius: '16px 0 0 16px', border: 'none' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>{pg.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>ID: {pg.id.slice(0, 8)}...</div>
                      </td>
                      <td style={{ background: 'var(--color-bone)', padding: '24px', border: 'none', fontWeight: 600 }}>{pg.city}</td>
                      <td style={{ background: 'var(--color-bone)', padding: '24px', border: 'none' }}>
                        <span className="badge" style={{ 
                          background: pg.isActive ? 'var(--color-sage)' : 'var(--color-coral)', 
                          color: '#fff', 
                          border: 'none',
                          fontSize: '10px',
                          fontWeight: 800
                        }}>
                          {pg.isActive ? 'LIVE' : 'PENDING APPROVAL'}
                        </span>
                      </td>
                      <td style={{ background: 'var(--color-bone)', padding: '24px', border: 'none' }}>
                         <div style={{ fontWeight: 800, color: 'var(--color-ebony)' }}>★ {pg.avgRating?.toFixed(1) || '0.0'}</div>
                         <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>{pg.reviewCount || 0} critiques</div>
                      </td>
                      <td style={{ background: 'var(--color-bone)', padding: '24px', borderRadius: '0 16px 16px 0', border: 'none', textAlign: 'right' }}>
                        <button className="btn btn-outline btn-sm" style={{ borderRadius: '12px', padding: '8px 20px' }} onClick={() => navigate(`/owner/edit-pg/${pg.id}`)}>
                          REFINE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
