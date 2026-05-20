import { useMemo, useRef, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { uploadToCloudinary } from '../utils/cloudinary'

const PHOTO_TYPES = [
  { value: 'exterior', label: 'Building Exterior', icon: 'Building' },
  { value: 'interior', label: 'Common Areas', icon: 'Lobby' },
  { value: 'room', label: 'Room Interior', icon: 'Room' },
  { value: 'common-area', label: 'Facilities', icon: 'Amenities' },
  { value: 'food', label: 'Food Quality', icon: 'Food' },
  { value: 'before-after', label: 'Before / After', icon: 'Compare' }
]

const COMMON_TAGS = [
  'Clean',
  'Modern',
  'Spacious',
  'Well-maintained',
  'New furniture',
  'Good location',
  'Safe neighborhood',
  'Friendly staff',
  'Quality food',
  'Fast WiFi',
  '24/7 security',
  'Parking available',
  'Gym access'
]

function buildPreview(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result || '')
    reader.readAsDataURL(file)
  })
}

function readImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = url
  })
}

export default function PGPhotoUpload({ pgId, pgName, onPhotoUploaded, onClose }) {
  const { user, isBanned } = useAuth()
  const fileInputRef = useRef(null)
  const beforeInputRef = useRef(null)
  const afterInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState({})
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [beforeAfterFiles, setBeforeAfterFiles] = useState({ before: null, after: null })
  const [beforeAfterPreviews, setBeforeAfterPreviews] = useState({ before: '', after: '' })
  const [formData, setFormData] = useState({
    photoType: 'exterior',
    caption: '',
    tags: [],
    beforeAfterDescription: '',
    captureContext: '',
    authenticityNotes: ''
  })

  const isBeforeAfter = formData.photoType === 'before-after'
  const totalSelected = useMemo(() => {
    if (isBeforeAfter) {
      return (beforeAfterFiles.before ? 1 : 0) + (beforeAfterFiles.after ? 1 : 0)
    }
    return selectedFiles.length
  }, [beforeAfterFiles.after, beforeAfterFiles.before, isBeforeAfter, selectedFiles.length])

  const validateFile = (file) => {
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image file`)
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${file.name} is too large (max 10MB)`)
    }
  }

  const handleStandardSelection = async (event) => {
    setUploadError('')
    const incomingFiles = Array.from(event.target.files || [])
    if (incomingFiles.length + selectedFiles.length > 5) {
      setUploadError('Maximum 5 photos per upload.')
      return
    }

    try {
      incomingFiles.forEach(validateFile)
      const nextPreviews = await Promise.all(
        incomingFiles.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          preview: await buildPreview(file)
        }))
      )
      setSelectedFiles((prev) => [...prev, ...incomingFiles])
      setPreviews((prev) => [...prev, ...nextPreviews])
    } catch (error) {
      setUploadError(error.message)
    }
  }

  const handleBeforeAfterSelection = async (slot, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError('')
    try {
      validateFile(file)
      const preview = await buildPreview(file)
      setBeforeAfterFiles((prev) => ({ ...prev, [slot]: file }))
      setBeforeAfterPreviews((prev) => ({ ...prev, [slot]: preview }))
    } catch (error) {
      setUploadError(error.message)
    }
  }

  const removePreview = (previewId) => {
    const target = previews.find((preview) => preview.id === previewId)
    setPreviews((prev) => prev.filter((preview) => preview.id !== previewId))
    if (target) {
      setSelectedFiles((prev) => prev.filter((file) => file !== target.file))
    }
  }

  const clearBeforeAfterSlot = (slot) => {
    setBeforeAfterFiles((prev) => ({ ...prev, [slot]: null }))
    setBeforeAfterPreviews((prev) => ({ ...prev, [slot]: '' }))
  }

  const toggleTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag]
    }))
  }

  const resetState = () => {
    setSelectedFiles([])
    setPreviews([])
    setBeforeAfterFiles({ before: null, after: null })
    setBeforeAfterPreviews({ before: '', after: '' })
    setUploadProgress({})
    setFormData({
      photoType: 'exterior',
      caption: '',
      tags: [],
      beforeAfterDescription: '',
      captureContext: '',
      authenticityNotes: ''
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!user) {
      setUploadError('Please log in to upload photos.')
      return
    }

    if (isBanned) {
      setUploadError('Your account is currently restricted from posting.')
      return
    }

    if (!isBeforeAfter && selectedFiles.length === 0) {
      setUploadError('Please select at least one image.')
      return
    }

    if (isBeforeAfter && (!beforeAfterFiles.before || !beforeAfterFiles.after)) {
      setUploadError('Please add both before and after images.')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const uploadedPhotos = []

      if (isBeforeAfter) {
        const beforeURL = await uploadToCloudinary(beforeAfterFiles.before)
        setUploadProgress({ before: 50 })
        const afterURL = await uploadToCloudinary(beforeAfterFiles.after)
        setUploadProgress({ before: 100, after: 50 })

        const beforeDimensions = await readImageDimensions(beforeURL)
        const afterDimensions = await readImageDimensions(afterURL)

        const docPayload = {
          pgId,
          userId: user.uid,
          imageURL: afterURL,
          thumbnailURL: afterURL,
          photoType: 'before-after',
          caption: formData.caption.trim(),
          isVerified: false,
          verificationStatus: 'pending',
          tags: formData.tags,
          authenticitySignals: {
            uploaderDisplayName: user.displayName || user.email || 'Resident',
            uploadedByResident: true,
            captureContext: formData.captureContext.trim(),
            authenticityNotes: formData.authenticityNotes.trim()
          },
          beforeAfterPair: {
            beforeImageURL: beforeURL,
            afterImageURL: afterURL,
            beforeFileName: beforeAfterFiles.before.name,
            afterFileName: beforeAfterFiles.after.name,
            description: formData.beforeAfterDescription.trim()
          },
          metadata: {
            uploadDate: new Date(),
            fileSize: (beforeAfterFiles.before.size || 0) + (beforeAfterFiles.after.size || 0),
            dimensions: afterDimensions,
            beforeDimensions,
            afterDimensions,
            uploadCount: 2
          },
          moderation: {
            flags: 0,
            isHidden: false
          }
        }

        const docRef = await addDoc(collection(db, 'pg_photos'), docPayload)
        uploadedPhotos.push({ id: docRef.id, ...docPayload })
        setUploadProgress({ before: 100, after: 100 })
      } else {
        for (const file of selectedFiles) {
          setUploadProgress((prev) => ({ ...prev, [file.name]: 10 }))
          const imageURL = await uploadToCloudinary(file)
          setUploadProgress((prev) => ({ ...prev, [file.name]: 60 }))
          const dimensions = await readImageDimensions(imageURL)

          const docPayload = {
            pgId,
            userId: user.uid,
            imageURL,
            thumbnailURL: imageURL,
            photoType: formData.photoType,
            caption: formData.caption.trim(),
            isVerified: false,
            verificationStatus: 'pending',
            tags: formData.tags,
            authenticitySignals: {
              uploaderDisplayName: user.displayName || user.email || 'Resident',
              uploadedByResident: true,
              captureContext: formData.captureContext.trim(),
              authenticityNotes: formData.authenticityNotes.trim()
            },
            metadata: {
              uploadDate: new Date(),
              fileSize: file.size,
              dimensions,
              originalFileName: file.name,
              uploadCount: 1
            },
            moderation: {
              flags: 0,
              isHidden: false
            }
          }

          const docRef = await addDoc(collection(db, 'pg_photos'), docPayload)
          uploadedPhotos.push({ id: docRef.id, ...docPayload })
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
        }
      }

      onPhotoUploaded?.(uploadedPhotos)
      resetState()
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="photo-upload-modal">
      <div className="photo-upload-overlay" onClick={onClose} />
      <div className="photo-upload-content">
        <div className="photo-upload-header">
          <h3>Share Resident Photos for {pgName}</h3>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit} className="photo-upload-form">
          <div className="form-group">
            <label>What type of photos are these?</label>
            <div className="photo-type-grid">
              {PHOTO_TYPES.map((type) => (
                <label key={type.value} className="photo-type-option">
                  <input
                    type="radio"
                    name="photoType"
                    value={type.value}
                    checked={formData.photoType === type.value}
                    onChange={(event) => {
                      setFormData((prev) => ({ ...prev, photoType: event.target.value }))
                      setUploadError('')
                    }}
                  />
                  <span className="type-icon">{type.icon}</span>
                  <span className="type-label">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {!isBeforeAfter ? (
            <>
              <div className="form-group">
                <label>Select Photos (max 5, 10MB each)</label>
                <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleStandardSelection}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-placeholder">
                    <span className="upload-icon">Upload</span>
                    <p>Add real, recent PG photos from your stay.</p>
                    <small>These will be marked as pending verification until reviewed.</small>
                  </div>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="photo-previews">
                  <h4>Selected Photos ({previews.length}/5)</h4>
                  <div className="preview-grid">
                    {previews.map((preview) => (
                      <div key={preview.id} className="preview-item">
                        <img src={preview.preview} alt="Preview" />
                        <button type="button" className="remove-preview" onClick={() => removePreview(preview.id)}>
                          x
                        </button>
                        {uploadProgress[preview.file.name] ? (
                          <div className="upload-progress">
                            <div className="progress-bar" style={{ width: `${uploadProgress[preview.file.name]}%` }} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="form-group">
              <label>Upload both sides of the before / after story</label>
              <div className="preview-grid">
                {[
                  { slot: 'before', label: 'Before image', ref: beforeInputRef, preview: beforeAfterPreviews.before },
                  { slot: 'after', label: 'After image', ref: afterInputRef, preview: beforeAfterPreviews.after }
                ].map((item) => (
                  <div key={item.slot} className="preview-item" style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {item.preview ? (
                      <>
                        <img src={item.preview} alt={item.label} />
                        <button type="button" className="remove-preview" onClick={() => clearBeforeAfterSlot(item.slot)}>
                          x
                        </button>
                        {uploadProgress[item.slot] ? (
                          <div className="upload-progress">
                            <div className="progress-bar" style={{ width: `${uploadProgress[item.slot]}%` }} />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ minHeight: '160px', width: '100%' }}
                        onClick={() => item.ref.current?.click()}
                      >
                        {item.label}
                      </button>
                    )}
                    <input
                      ref={item.ref}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(event) => handleBeforeAfterSelection(item.slot, event)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Caption</label>
            <textarea
              value={formData.caption}
              onChange={(event) => setFormData((prev) => ({ ...prev, caption: event.target.value }))}
              placeholder="Describe what this photo proves about the PG."
              maxLength={200}
              rows={2}
            />
            <small>{formData.caption.length}/200 characters</small>
          </div>

          {isBeforeAfter && (
            <div className="form-group">
              <label>Before / after description</label>
              <textarea
                value={formData.beforeAfterDescription}
                onChange={(event) => setFormData((prev) => ({ ...prev, beforeAfterDescription: event.target.value }))}
                placeholder="Explain what changed: repainting, repairs, furniture, cleanliness, lighting..."
                maxLength={300}
                rows={3}
              />
            </div>
          )}

          <div className="form-group">
            <label>When / why did you capture this?</label>
            <input
              className="form-control"
              value={formData.captureContext}
              onChange={(event) => setFormData((prev) => ({ ...prev, captureContext: event.target.value }))}
              placeholder="Example: moved in this week, inspected room today, after dinner service..."
            />
          </div>

          <div className="form-group">
            <label>Authenticity notes</label>
            <textarea
              value={formData.authenticityNotes}
              onChange={(event) => setFormData((prev) => ({ ...prev, authenticityNotes: event.target.value }))}
              placeholder="Optional context that helps reviewers verify the photo."
              maxLength={250}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tags-grid">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-btn ${formData.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'rgba(124, 144, 130, 0.08)',
              border: '1px solid rgba(124, 144, 130, 0.14)',
              fontSize: '13px',
              color: 'var(--color-muted)'
            }}
          >
            Resident uploads appear with a verification state. Admin-reviewed images earn a verified trust badge.
          </div>

          {uploadError ? (
            <div className="alert alert-danger" style={{ marginTop: '12px' }}>
              {uploadError}
            </div>
          ) : null}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={totalSelected === 0 || uploading}>
              {uploading ? 'Uploading...' : `Upload ${totalSelected} Image${totalSelected !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
