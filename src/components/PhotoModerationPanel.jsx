import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function PhotoModerationPanel() {
  const { user, isAdmin } = useAuth()
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [filter, setFilter] = useState('pending') // pending, approved, rejected, flagged

  useEffect(() => {
    if (isAdmin) {
      loadPhotos()
    }
  }, [isAdmin, filter])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      let q = query(
        collection(db, 'pg_photos'),
        orderBy('metadata.uploadDate', 'desc')
      )

      if (filter !== 'all') {
        q = query(q, where('verificationStatus', '==', filter))
      }

      const snapshot = await getDocs(q)
      const photos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setPendingPhotos(photos)
    } catch (error) {
      console.error('Error loading photos for moderation:', error)
    } finally {
      setLoading(false)
    }
  }

  const moderatePhoto = async (photoId, action, reason = '') => {
    try {
      const updateData = {
        verifiedBy: user.uid,
        verifiedAt: new Date()
      }

      if (action === 'approve') {
        updateData.isVerified = true
        updateData.verificationStatus = 'approved'
      } else if (action === 'reject') {
        updateData.isVerified = false
        updateData.verificationStatus = 'rejected'
        updateData.moderation = {
          ...pendingPhotos.find(p => p.id === photoId).moderation,
          isHidden: true,
          hiddenReason: reason
        }
      } else if (action === 'hide') {
        updateData.moderation = {
          ...pendingPhotos.find(p => p.id === photoId).moderation,
          isHidden: true,
          hiddenReason: reason
        }
      }

      await updateDoc(doc(db, 'pg_photos', photoId), updateData)

      // Update local state
      setPendingPhotos(prev =>
        prev.map(photo =>
          photo.id === photoId
            ? { ...photo, ...updateData }
            : photo
        )
      )

      setSelectedPhoto(null)
    } catch (error) {
      console.error('Error moderating photo:', error)
      alert('Failed to moderate photo: ' + error.message)
    }
  }

  const PhotoModerationModal = ({ photo, onClose }) => {
    const [action, setAction] = useState('')
    const [reason, setReason] = useState('')

    const handleSubmit = () => {
      if (!action) return
      moderatePhoto(photo.id, action, reason)
    }

    return (
      <div className="moderation-modal-overlay" onClick={onClose}>
        <div className="moderation-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Moderate Photo</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-content">
            <div className="photo-preview">
              {photo.photoType === 'before-after' && photo.beforeAfterPair?.beforeImageURL && photo.beforeAfterPair?.afterImageURL ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px' }}>Before</div>
                    <img src={photo.beforeAfterPair.beforeImageURL} alt="Before moderation" />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px' }}>After</div>
                    <img src={photo.beforeAfterPair.afterImageURL} alt="After moderation" />
                  </div>
                </div>
              ) : (
                <img src={photo.imageURL} alt="Photo for moderation" />
              )}
            </div>

            <div className="photo-details">
              <div className="detail-row">
                <strong>Type:</strong> {getPhotoTypeLabel(photo.photoType)}
              </div>
              <div className="detail-row">
                <strong>Uploaded:</strong> {new Date(photo.metadata.uploadDate.seconds * 1000).toLocaleString()}
              </div>
              <div className="detail-row">
                <strong>User:</strong> {photo.userId}
              </div>
              {photo.caption && (
                <div className="detail-row">
                  <strong>Caption:</strong> {photo.caption}
                </div>
              )}
              {photo.tags && photo.tags.length > 0 && (
                <div className="detail-row">
                  <strong>Tags:</strong> {photo.tags.join(', ')}
                </div>
              )}
              {photo.authenticitySignals?.captureContext && (
                <div className="detail-row">
                  <strong>Capture context:</strong> {photo.authenticitySignals.captureContext}
                </div>
              )}
              {photo.authenticitySignals?.authenticityNotes && (
                <div className="detail-row">
                  <strong>Authenticity notes:</strong> {photo.authenticitySignals.authenticityNotes}
                </div>
              )}
              {photo.beforeAfterPair?.description && (
                <div className="detail-row">
                  <strong>Before / after summary:</strong> {photo.beforeAfterPair.description}
                </div>
              )}
            </div>

            <div className="moderation-actions">
              <h4>Action</h4>
              <div className="action-buttons">
                <button
                  className={`action-btn approve ${action === 'approve' ? 'selected' : ''}`}
                  onClick={() => setAction('approve')}
                >
                  ✅ Approve
                </button>
                <button
                  className={`action-btn reject ${action === 'reject' ? 'selected' : ''}`}
                  onClick={() => setAction('reject')}
                >
                  ❌ Reject
                </button>
                <button
                  className={`action-btn hide ${action === 'hide' ? 'selected' : ''}`}
                  onClick={() => setAction('hide')}
                >
                  🚫 Hide
                </button>
              </div>

              {(action === 'reject' || action === 'hide') && (
                <div className="reason-input">
                  <label>Reason (required):</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this photo is being rejected or hidden..."
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn-outline" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!action || ((action === 'reject' || action === 'hide') && !reason.trim())}
                >
                  Submit Moderation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getPhotoTypeLabel = (type) => {
    const labels = {
      'exterior': 'Building Exterior',
      'interior': 'Common Areas',
      'room': 'Room Interior',
      'common-area': 'Facilities',
      'food': 'Food Quality',
      'before-after': 'Before/After'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { text: 'Pending', class: 'pending' },
      'approved': { text: 'Approved', class: 'approved' },
      'rejected': { text: 'Rejected', class: 'rejected' }
    }
    return badges[status] || { text: status, class: 'unknown' }
  }

  if (!isAdmin) {
    return <div className="access-denied">Access denied. Admin privileges required.</div>
  }

  if (loading) {
    return <div className="moderation-loading">Loading photos for moderation...</div>
  }

  return (
    <div className="photo-moderation-panel">
      <div className="panel-header">
        <h2>🛡️ Photo Moderation</h2>
        <div className="filter-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Photos</option>
          </select>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <span className="stat-number">{pendingPhotos.filter(p => p.verificationStatus === 'pending').length}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-number">{pendingPhotos.filter(p => p.verificationStatus === 'approved').length}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat">
          <span className="stat-number">{pendingPhotos.filter(p => p.verificationStatus === 'rejected').length}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="stat">
          <span className="stat-number">{pendingPhotos.filter(p => p.moderation?.isHidden).length}</span>
          <span className="stat-label">Hidden</span>
        </div>
      </div>

      <div className="photos-grid">
        {pendingPhotos.map(photo => (
          <div key={photo.id} className="moderation-photo-item">
            <div className="photo-thumbnail">
              <img
                src={photo.thumbnailURL || photo.imageURL}
                alt="Photo for moderation"
                onClick={() => setSelectedPhoto(photo)}
              />
              <div className="photo-overlay">
                <span className={`status-badge ${getStatusBadge(photo.verificationStatus).class}`}>
                  {getStatusBadge(photo.verificationStatus).text}
                </span>
                {photo.moderation?.flags > 0 && (
                  <span className="flag-indicator">🚩 {photo.moderation.flags}</span>
                )}
              </div>
            </div>

            <div className="photo-info">
              <div className="photo-type">{getPhotoTypeLabel(photo.photoType)}</div>
              <div className="upload-date">
                {new Date(photo.metadata.uploadDate.seconds * 1000).toLocaleDateString()}
              </div>
              {photo.caption && (
                <div className="photo-caption">{photo.caption}</div>
              )}
            </div>

            <div className="quick-actions">
              <button
                className="quick-approve"
                onClick={() => moderatePhoto(photo.id, 'approve')}
                title="Quick Approve"
              >
                ✓
              </button>
              <button
                className="quick-reject"
                onClick={() => setSelectedPhoto(photo)}
                title="Review & Moderate"
              >
                ⚙️
              </button>
            </div>
          </div>
        ))}
      </div>

      {pendingPhotos.length === 0 && (
        <div className="no-photos">
          <p>No photos found for the selected filter.</p>
        </div>
      )}

      {selectedPhoto && (
        <PhotoModerationModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  )
}
