import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const REPORT_CATEGORIES = [
  { key: 'fake', label: 'Fake / Non-existent', icon: '🚫' },
  { key: 'misleading_photos', label: 'Misleading Photos', icon: '📷' },
  { key: 'wrong_price', label: 'Wrong Price Information', icon: '💸' },
  { key: 'safety', label: 'Safety Concern', icon: '⚠️' },
  { key: 'harassment', label: 'Harassment / Discrimination', icon: '🛑' },
  { key: 'spam', label: 'Spam / Duplicate Listing', icon: '📢' },
  { key: 'other', label: 'Other', icon: '📝' }
]

export default function ReportModal({ isOpen, onClose, targetId, targetType = 'listing', targetName = '' }) {
  const { user } = useAuth()
  const [category, setCategory] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!category) return
    setLoading(true)
    try {
      await addDoc(collection(db, 'reports'), {
        targetId,
        targetType,
        targetName,
        category,
        details: details.trim(),
        reporterId: user?.uid || 'anonymous',
        reporterEmail: user?.email || 'anonymous',
        status: 'pending',
        createdAt: new Date()
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setCategory('')
        setDetails('')
      }, 2000)
    } catch (err) {
      console.error('Report submission error:', err)
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13, 31, 27, 0.8)',
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: '16px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-card animate-fade-in modal-glass-card" style={{ maxWidth: '520px', width: '100%', padding: '48px' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Report Submitted</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
              Our team will investigate within 24-48 hours.
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚩</div>
              <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>
                Report {targetType === 'listing' ? 'Listing' : 'Review'}
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                Help us maintain quality — flag content that violates community standards.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Category Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ marginBottom: '12px' }}>What's the issue?</label>
                <div className="responsive-two-col responsive-compact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {REPORT_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: category === cat.key ? '2px solid var(--color-coral)' : '1px solid rgba(0,0,0,0.05)',
                        background: category === cat.key ? 'rgba(228,120,93,0.08)' : 'var(--color-bone)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: category === cat.key ? 'var(--color-coral)' : 'var(--color-muted)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label">Additional Details (Optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                />
              </div>

              <div className="responsive-action-row" style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '16px', borderRadius: '16px' }}
                  disabled={!category || loading}
                >
                  {loading ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '16px 24px', borderRadius: '16px' }}
                  onClick={onClose}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
