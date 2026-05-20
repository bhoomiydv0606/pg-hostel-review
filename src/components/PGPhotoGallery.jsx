import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'

function getPhotoTypeLabel(type) {
  const labels = {
    exterior: 'Building Exterior',
    interior: 'Common Areas',
    room: 'Room Interior',
    'common-area': 'Facilities',
    food: 'Food Quality',
    'before-after': 'Before / After'
  }
  return labels[type] || type
}

function getVerificationBadge(photo) {
  if (photo.isVerified) return { text: 'Verified', className: 'verified-badge' }
  if (photo.verificationStatus === 'pending') return { text: 'Pending review', className: 'tag' }
  return { text: 'Community upload', className: 'tag' }
}

export default function PGPhotoGallery({ pgId, maxPhotos = 20, refreshKey = 0 }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [filter, setFilter] = useState('all')
  const [photoType, setPhotoType] = useState('all')

  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true)
      try {
        const photoQuery = query(
          collection(db, 'pg_photos'),
          where('pgId', '==', pgId),
          where('moderation.isHidden', '==', false),
          orderBy('metadata.uploadDate', 'desc'),
          limit(maxPhotos)
        )

        const snapshot = await getDocs(photoQuery)
        let photoData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))

        if (filter === 'verified') {
          photoData = photoData.filter((photo) => photo.isVerified)
        }

        if (filter === 'recent') {
          photoData = photoData.filter((photo) => {
            const uploadedAt = photo.metadata?.uploadDate?.toDate
              ? photo.metadata.uploadDate.toDate()
              : new Date(photo.metadata?.uploadDate || 0)
            return Date.now() - uploadedAt.getTime() < 30 * 24 * 60 * 60 * 1000
          })
        }

        if (photoType !== 'all') {
          photoData = photoData.filter((photo) => photo.photoType === photoType)
        }

        setPhotos(photoData)
      } catch (error) {
        console.error('Error loading photos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [filter, maxPhotos, pgId, photoType, refreshKey])

  if (loading) {
    return <div className="photo-gallery-loading">Loading photos...</div>
  }

  const currentIndex = selectedPhoto ? photos.findIndex((photo) => photo.id === selectedPhoto.id) : -1
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null

  return (
    <div className="pg-photo-gallery">
      <div className="gallery-header">
        <h3>Real Photos by Residents</h3>
        <div className="gallery-filters">
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All Photos</option>
            <option value="verified">Verified Only</option>
            <option value="recent">Recent Uploads</option>
          </select>
          <select value={photoType} onChange={(event) => setPhotoType(event.target.value)}>
            <option value="all">All Types</option>
            <option value="exterior">Exterior</option>
            <option value="interior">Interior</option>
            <option value="room">Rooms</option>
            <option value="common-area">Facilities</option>
            <option value="food">Food</option>
            <option value="before-after">Before / After</option>
          </select>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="no-photos">
          <p>No resident photos available yet. Be the first to add proof from your stay.</p>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => {
            const badge = getVerificationBadge(photo)
            return (
              <div key={photo.id} className="photo-item" onClick={() => setSelectedPhoto(photo)}>
                <img
                  src={photo.photoType === 'before-after' ? (photo.beforeAfterPair?.afterImageURL || photo.imageURL) : (photo.thumbnailURL || photo.imageURL)}
                  alt={photo.caption || 'PG Photo'}
                  loading="lazy"
                />
                <div className="photo-overlay">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                    <span className="photo-type-icon">{getPhotoTypeLabel(photo.photoType)}</span>
                    <span className={badge.className}>{badge.text}</span>
                  </div>
                  {photo.authenticitySignals?.captureContext ? (
                    <div className="photo-tags">
                      <span className="tag">{photo.authenticitySignals.captureContext}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {currentPhoto ? (
        <div className="photo-lightbox-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-lightbox" onClick={(event) => event.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedPhoto(null)}>x</button>

            <div className="lightbox-image-container">
              <button
                className="lightbox-nav prev"
                onClick={() => setSelectedPhoto(photos[(currentIndex - 1 + photos.length) % photos.length])}
              >
                {'<'}
              </button>

              <div className="lightbox-image">
                {currentPhoto.photoType === 'before-after' && currentPhoto.beforeAfterPair ? (
                  <div className="comparison-slider-container">
                    <div className="comparison-slider" style={{ position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={currentPhoto.beforeAfterPair.afterImageURL || currentPhoto.imageURL}
                        alt="After"
                        className="after-image"
                      />
                      <div className="before-image-container" style={{ width: '50%' }}>
                        <img
                          src={currentPhoto.beforeAfterPair.beforeImageURL}
                          alt="Before"
                          className="before-image"
                        />
                      </div>
                      <div className="slider-handle" style={{ left: '50%' }}>
                        <div className="slider-line"></div>
                        <div className="slider-button">||</div>
                      </div>
                    </div>
                    <div className="comparison-labels">
                      <span className="before-label">Before</span>
                      <span className="after-label">After</span>
                    </div>
                  </div>
                ) : (
                  <img src={currentPhoto.imageURL} alt={currentPhoto.caption || 'PG Photo'} />
                )}
              </div>

              <button
                className="lightbox-nav next"
                onClick={() => setSelectedPhoto(photos[(currentIndex + 1) % photos.length])}
              >
                {'>'}
              </button>
            </div>

            <div className="lightbox-info">
              <div className="lightbox-meta">
                <span className="photo-type">{getPhotoTypeLabel(currentPhoto.photoType)}</span>
                <span className={getVerificationBadge(currentPhoto).className}>{getVerificationBadge(currentPhoto).text}</span>
                <span className="upload-date">
                  {currentPhoto.metadata?.uploadDate?.seconds
                    ? new Date(currentPhoto.metadata.uploadDate.seconds * 1000).toLocaleDateString()
                    : ''}
                </span>
              </div>

              {currentPhoto.caption ? <p className="lightbox-caption">{currentPhoto.caption}</p> : null}
              {currentPhoto.beforeAfterPair?.description ? (
                <p className="comparison-description">{currentPhoto.beforeAfterPair.description}</p>
              ) : null}

              <div className="lightbox-tags">
                {currentPhoto.tags?.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
                {currentPhoto.authenticitySignals?.captureContext ? (
                  <span className="tag">{currentPhoto.authenticitySignals.captureContext}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
