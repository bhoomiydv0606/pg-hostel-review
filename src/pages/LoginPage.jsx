import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ADMIN_EMAIL } from '../constants'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
      // Check if user is banned
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
      if (userDoc.exists() && userDoc.data().isBanned) {
        await auth.signOut()
        setError('Your account has been suspended. Contact support for help.')
        setLoading(false)
        return
      }
      navigate('/')
    } catch (err) {
      console.error("Login Debug Info:", {
        code: err.code,
        message: err.message,
        emailSent: trimmedEmail
      })
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Wrong email or password. Please try again.')
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait and try again.')
      } else {
        setError('Login failed: ' + err.message)
      }
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first to reset password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      alert('Password reset email sent! Please check your inbox.')
    } catch (err) {
      console.error(err)
      setError('Failed to send reset email: ' + err.message)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      
      // Check if user exists in Firestore, if not create them (standard user)
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        let role = 'user'
        if (user.email === ADMIN_EMAIL) role = 'admin'
        
        await setDoc(userRef, {
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          createdAt: new Date(),
          role: role,
          isBanned: false,
          banReason: ''
        })
      } else if (userDoc.data().isBanned) {
        await auth.signOut()
        setError('Your account has been suspended.')
        setLoading(false)
        return
      }
      
      navigate('/')
    } catch (err) {
      console.error(err)
      setError('Google Login failed.')
    }
    setLoading(false)
  }

  const [activeTab, setActiveTab] = useState('login')

  return (
    <div className="login-page" style={{
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
          fontSize: 42, 
          color: 'var(--color-ebony)',
          marginBottom: 12,
          textAlign: 'center'
        }}>
          Curated Living.
        </h1>
        <p style={{
          fontSize: 15, 
          color: 'var(--color-muted)', 
          marginBottom: 40,
          textAlign: 'center',
          fontWeight: 500
        }}>
          Step into your digital concierge.
        </p>

        {/* Tab Toggle */}
        <div style={{
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '50px',
          padding: '6px',
          display: 'flex',
          marginBottom: 40,
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <button 
            onClick={() => setActiveTab('login')}
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
            onClick={() => {
              setActiveTab('signup')
              navigate('/register')
            }}
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

        <form onSubmit={handleLogin}>
          <div className="form-group">
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
            <div className="flex justify-between items-center" style={{marginBottom: 8}}>
              <label className="form-label" style={{margin:0}}>Password</label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                style={{
                  background:'none', border:'none', color:'var(--color-muted)', 
                  fontSize:11, cursor:'pointer', padding:0, fontWeight:700, textTransform:'uppercase'
                }}
              >
                Forgot?
              </button>
            </div>
            <div style={{position:'relative'}}>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                required
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
            {loading ? 'OPENING DOORS...' : 'ENTRANCE'}
          </button>
        </form>

        <div style={{margin:'0 0 32px 0', display:'flex', alignItems:'center', gap:15}}>
          <div style={{flex:1, height:1, background:'rgba(0,0,0,0.05)'}}></div>
          <span style={{fontSize:9, color:'var(--color-muted)', fontWeight:800, textTransform:'uppercase', letterSpacing:2}}>Or Authenticate with</span>
          <div style={{flex:1, height:1, background:'rgba(0,0,0,0.05)'}}></div>
        </div>

        <button 
          className="btn btn-outline"
          style={{ width: '100%', borderRadius: '16px', gap: '12px' }}
          onClick={handleGoogleLogin} 
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