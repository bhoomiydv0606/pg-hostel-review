import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { ADMIN_EMAIL } from '../constants'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role') // 'owner' or null

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
      await updateProfile(cred.user, { displayName: name.trim() })
      
      // Determine final role
      let finalRole = 'user'
      if (email === ADMIN_EMAIL) finalRole = 'admin'
      else if (roleParam === 'owner') finalRole = 'owner'

      // Save user to Firestore users collection for admin panel
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        createdAt: new Date(),
        role: finalRole,
        isBanned: false,
        banReason: ''
      })
      
      if (finalRole === 'owner') navigate('/owner/dashboard')
      else navigate('/')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else {
        setError('Registration failed. Please try again.')
      }
    }
    setLoading(false)
  }

  const handleGoogleRegister = async () => {
    setError('')
    setLoading(true)
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const u = result.user
      
      // Check if user exists
      const userRef = doc(db, 'users', u.uid)
      const userDoc = await getDoc(userRef)
      
      let finalRole = 'user'
      if (!userDoc.exists()) {
        if (u.email === ADMIN_EMAIL) finalRole = 'admin'
        else if (roleParam === 'owner') finalRole = 'owner'

        await setDoc(userRef, {
          name: u.displayName || u.email.split('@')[0],
          email: u.email,
          createdAt: new Date(),
          role: finalRole,
          isBanned: false,
          banReason: ''
        })
      } else {
        finalRole = userDoc.data().role || 'user'
      }
      
      if (finalRole === 'owner') navigate('/owner/dashboard')
      else navigate('/')
    } catch (err) {
      console.error(err)
      setError('Google Registration failed.')
    }
    setLoading(false)
  }

  const [activeTab, setActiveTab] = useState('signup')

  return (
    <div className="register-page" style={{
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2000&auto=format&fit=crop')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      padding: '20px'
    }}>
      {/* Dark Silk Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(18, 18, 18, 0.4)', zIndex: 1
      }}></div>

      {/* Brand Header */}
      <div style={{
        position: 'absolute', top: '40px', left: '40px', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer'
      }} onClick={() => navigate('/')}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <img src="/pg_review_logo_icon_1774782132661.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
        </div>
        <span style={{color: '#fff', fontSize: '22px', fontFamily: 'var(--font-headline)', fontWeight: 800}}>PG<span style={{ fontStyle: 'italic', color: 'var(--color-coral)' }}>Review</span></span>
      </div>

      {/* Main Glass Container */}
      <div className="glass-card animate-fade-in" style={{
        maxWidth: 480, 
        width: '100%', 
        padding: '60px 50px', 
        zIndex: 10,
        background: 'rgba(249, 246, 240, 0.85)', /* Bone with transparency */
        border: '1px solid rgba(18, 18, 18, 0.05)'
      }}>
        <h1 style={{
          fontSize: 36, 
          color: 'var(--color-ebony)',
          marginBottom: 12,
          textAlign: 'center'
        }}>
          {roleParam === 'owner' ? 'Partner Entry.' : 'New Resident.'}
        </h1>
        <p style={{
          fontSize: 14, 
          color: 'var(--color-muted)', 
          marginBottom: 35,
          textAlign: 'center',
          fontWeight: 500
        }}>
          {roleParam === 'owner' 
            ? 'List your premium PG and reach verified residents.' 
            : 'Access the world\'s most trusted residential reviews.'}
        </p>

        {/* Tab Toggle */}
        <div style={{
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '50px',
          padding: '6px',
          display: 'flex',
          marginBottom: 35,
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              flex: 1, padding: '12px', borderRadius: '50px', border: 'none',
              background: activeTab === 'login' ? 'var(--color-ebony)' : 'transparent',
              color: activeTab === 'login' ? '#fff' : 'var(--color-ebony)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: '0.4s'
            }}
          >
            LOGIN
          </button>
          <button 
            onClick={() => setActiveTab('signup')}
            style={{
              flex: 1, padding: '12px', borderRadius: '50px', border: 'none',
              background: activeTab === 'signup' ? 'var(--color-ebony)' : 'transparent',
              color: activeTab === 'signup' ? '#fff' : 'var(--color-ebony)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: '0.4s'
            }}
          >
            SIGN UP
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(224, 152, 124, 0.1)', 
            color: '#B9770E', 
            padding: '14px', 
            borderRadius: '12px', 
            fontSize: '13px', 
            marginBottom: '24px',
            textAlign: 'center',
            fontWeight: 600,
            border: '1px solid rgba(224, 152, 124, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group" style={{marginBottom: 18}}>
            <label className="form-label">Full Name</label>
            <input
              className="form-control"
              type="text"
              required
              placeholder="e.g. Johnathan Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ background: 'var(--color-white)', borderRadius: '16px' }}
            />
          </div>
          <div className="form-group" style={{marginBottom: 18}}>
            <label className="form-label">Email Address</label>
            <input
              className="form-control"
              type="email"
              required
              placeholder="e.g. resident@pgreview.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ background: 'var(--color-white)', borderRadius: '16px' }}
            />
          </div>
          <div className="form-group" style={{marginBottom: 32}}>
            <label className="form-label">Password</label>
            <div style={{position:'relative'}}>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ background: 'var(--color-white)', borderRadius: '16px', paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--color-muted)', cursor: 'pointer'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '18px', fontSize: '15px', borderRadius: '16px', marginBottom: '32px' }}
          >
            {loading ? 'CRAFTING PROFILE...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={{margin:'0 0 32px 0', display:'flex', alignItems:'center', gap:15}}>
          <div style={{flex:1, height:1, background:'rgba(0,0,0,0.05)'}}></div>
          <span style={{fontSize:9, color:'var(--color-muted)', fontWeight:800, textTransform:'uppercase', letterSpacing:2}}>Or join with</span>
          <div style={{flex:1, height:1, background:'rgba(0,0,0,0.05)'}}></div>
        </div>

        <button 
          className="btn btn-outline"
          style={{ width: '100%', borderRadius: '16px', gap: '12px' }}
          onClick={handleGoogleRegister} 
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="" />
          GOOGLE
        </button>
      </div>

      {/* Footer Signature */}
      <div style={{
        marginTop: '60px', zIndex: 10,
        color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 800, 
        letterSpacing: '3px', textTransform: 'uppercase'
      }}>
        Crafting Modern Hospitality • 2024
      </div>
    </div>
  )
}