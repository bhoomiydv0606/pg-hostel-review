import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'

const ADMIN_EMAIL = 'bhoomi.yadav2825@gmail.com'

export default function Navbar() {
  const { user, isAdmin, isOwner } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await signOut(auth)
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container navbar-shell" style={{display:'flex', width:'100%', alignItems:'center', justifyContent:'space-between'}}>
        <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/favicon.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          PG<span style={{ fontStyle: 'italic', color: 'var(--color-coral)' }}>Review</span>
        </Link>
        <button
          type="button"
          className={`navbar-mobile-toggle ${menuOpen ? 'is-open' : ''}`}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className={`navbar-links ${menuOpen ? 'is-open' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Explore</Link>
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ color: 'var(--color-coral)', fontWeight: 700 }} onClick={() => setMenuOpen(false)}>
                  Management
                </Link>
              )}
              {isOwner && (
                <Link to="/owner/dashboard" style={{ color: 'var(--color-sage)', fontWeight: 700 }} onClick={() => setMenuOpen(false)}>
                  Residence Office
                </Link>
              )}
              <Link to="/profile" onClick={() => setMenuOpen(false)}>
                {user.displayName || 'Resident'}
              </Link>
              <button 
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                style={{ marginLeft: '12px', border: '1px solid rgba(0,0,0,0.1)' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ color: '#fff' }} onClick={() => setMenuOpen(false)}>
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
