import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="spinner" style={{ marginTop: 120 }} />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}
