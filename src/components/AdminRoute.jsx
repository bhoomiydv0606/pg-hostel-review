import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return <div className="spinner" style={{ marginTop: 120 }} />
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
