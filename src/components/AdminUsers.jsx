import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'

export default function AdminUsers({ setMsg }) {
  const [users, setUsers] = useState([])
  const [banModal, setBanModal] = useState(null)
  const [banReason, setBanReason] = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'))
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
    }
  }

  const banUser = async () => {
    if (!banReason.trim()) return
    try {
      await updateDoc(doc(db, 'users', banModal.id), {
        isBanned: true,
        banReason,
        bannedAt: new Date()
      })
      setBanModal(null)
      setBanReason('')
      setMsg('Member access suspended.')
      fetchUsers()
    } catch (err) {
      setMsg('Ban error: ' + err.message)
    }
  }

  const unbanUser = async (u) => {
    try {
      await updateDoc(doc(db, 'users', u.id), {
        isBanned: false,
        banReason: '',
        unbannedAt: new Date()
      })
      setMsg('Member access restored.')
      fetchUsers()
    } catch (err) {
      setMsg('Unban error: ' + err.message)
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Member Directory</h2>
        <p style={{ color: 'var(--color-muted)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          ARCHIVING {users.length} REGISTERED PATRONS
        </p>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bone)' }}>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Patron Name</th>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Identity (Email)</th>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Athelier Status</th>
                <th style={{ padding: '20px 24px', textAlign: 'right', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Orchestration</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{u.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', marginTop: '4px' }}>{u.role || 'RESIDENT'}</div>
                  </td>
                  <td style={{ padding: '24px', fontSize: '14px', color: 'var(--color-muted)' }}>{u.email}</td>
                  <td style={{ padding: '24px' }}>
                    <span className="badge" style={{ 
                      background: u.isBanned ? 'var(--color-coral)' : 'var(--color-sage)', 
                      color: '#fff', 
                      border: 'none',
                      fontSize: '10px',
                      fontWeight: 800
                    }}>
                      {u.isBanned ? 'SUSPENDED' : 'VALORIZED'}
                    </span>
                  </td>
                  <td style={{ padding: '24px', textAlign: 'right' }}>
                    {u.isBanned ? (
                      <button className="btn btn-outline btn-sm" style={{ padding: '6px 14px', borderRadius: '8px' }} onClick={() => unbanUser(u)}>
                        RESTORE
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" style={{ padding: '6px 14px', borderRadius: '8px' }} onClick={() => { setBanModal(u); setBanReason('') }}>
                        SUSPEND
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {banModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13, 31, 27, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card animate-fade-in responsive-page-card" style={{ maxWidth: '440px', width: '100%', padding: '60px' }}>
            <h3 style={{ fontSize: '28px', marginBottom: '16px', textAlign: 'center' }}>Suspend Access</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', textAlign: 'center' }}>
              Suspending <strong>{banModal.name}</strong> will revoke all platform privileges immediately.
            </p>
            
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Administrative Reason</label>
              <textarea 
                className="form-control" 
                rows={3}
                placeholder="e.g. Violation of residency community standards..."
                value={banReason}
                onChange={e => setBanReason(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '16px' }} 
                onClick={banUser}
                disabled={!banReason.trim()}
              >
                CONFIRM SUSPENSION
              </button>
              <button className="btn btn-outline" style={{ padding: '16px' }} onClick={() => setBanModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
