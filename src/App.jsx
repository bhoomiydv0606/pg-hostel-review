import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Navbar from './components/Navbar'
import AdminRoute from './components/AdminRoute'
import GuestRoute from './components/GuestRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy load page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const PGDetailPage = lazy(() => import('./pages/PGDetailPage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'))
const OwnerAddPG = lazy(() => import('./pages/OwnerAddPG'))

// Loading component
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
    <div className="spinner" />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Navbar />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/owner/add-pg" element={<OwnerAddPG />} />
            <Route path="/owner/edit-pg/:id" element={<OwnerAddPG />} />
            <Route path="/pg/:id" element={<PGDetailPage />} />
            <Route path="/pg/:id/review" element={<ReviewPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App