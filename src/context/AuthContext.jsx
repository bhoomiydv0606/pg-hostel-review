import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ADMIN_EMAIL } from '../constants'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [isBanned, setIsBanned] = useState(false)

  useEffect(() => {
    let unsubscribeSnapshot = null

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)

        // Real-time synchronization for role and ban status
        const userRef = doc(db, 'users', u.uid)
        unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
          let role = 'user'
          let banned = false

          if (docSnap.exists()) {
            const data = docSnap.data()
            role = data.role || 'user'
            banned = data.isBanned || false
          }

          // Admin Fail-safe & Self-healing Logic
          if (u.email === ADMIN_EMAIL && role !== 'admin') {
            role = 'admin'
            try {
              if (docSnap.exists()) {
                await updateDoc(userRef, { role: 'admin' })
              } else {
                await setDoc(userRef, {
                  name: u.displayName || u.email.split('@')[0],
                  email: u.email,
                  role: 'admin',
                  createdAt: serverTimestamp(),
                  isBanned: false
                })
              }
              console.log("AuthContext: Firestore updated to admin for", u.email)
            } catch (err) {
              console.error("AuthContext: Admin sync error:", err)
            }
          }

          setUserRole(role)
          setIsBanned(banned)
          setLoading(false)
        }, (err) => {
          console.error("AuthContext Snapshot Error:", err)
          setLoading(false)
        })
      } else {
        setUser(null)
        setUserRole('')
        setIsBanned(false)
        setLoading(false)
        if (unsubscribeSnapshot) unsubscribeSnapshot()
      }
    })

    return () => {
      unsubAuth()
      if (unsubscribeSnapshot) unsubscribeSnapshot()
    }
  }, [])

  const value = {
    user,
    userRole,
    loading,
    isBanned,
    isAdmin: userRole === 'admin',
    isOwner: userRole === 'owner'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
