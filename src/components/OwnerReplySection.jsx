import { useState } from 'react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function OwnerReplySection({ review, pgOwnerId }) {
  const { user } = useAuth()
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const isOwner = user && user.uid === pgOwnerId
  const hasReply = review.ownerReply && review.ownerReply.text

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'reviews', review.id), {
        ownerReply: {
          text: replyText.trim(),
          repliedAt: new Date()
        }
      })
      review.ownerReply = { text: replyText.trim(), repliedAt: new Date() }
      setShowForm(false)
      setReplyText('')
    } catch (err) {
      console.error('Owner reply error:', err)
    }
    setLoading(false)
  }

  return (
    <div>
      {/* Existing Reply Display */}
      {hasReply && (
        <div style={{
          marginTop: '20px', padding: '20px 24px', borderRadius: '14px',
          background: 'rgba(39,174,96,0.04)', border: '1px solid rgba(39,174,96,0.1)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: '-10px', left: '20px',
            background: 'var(--color-sage)', color: '#fff',
            padding: '3px 10px', borderRadius: '6px',
            fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px'
          }}>
            OWNER RESPONSE
          </div>
          <p style={{
            fontSize: '14px', lineHeight: 1.7, color: 'var(--color-muted)',
            marginTop: '4px', marginBottom: '8px'
          }}>
            {review.ownerReply.text}
          </p>
          <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>
            {review.ownerReply.repliedAt?.toDate
              ? review.ownerReply.repliedAt.toDate().toLocaleDateString()
              : 'Recently'
            }
          </div>
        </div>
      )}

      {/* Reply Form (only visible to PG owner) */}
      {isOwner && !hasReply && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{
                marginTop: '12px', background: 'none', border: '1px dashed rgba(0,0,0,0.1)',
                borderRadius: '10px', padding: '10px 16px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-sage)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
            >
              💬 RESPOND TO THIS REVIEW
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Write a professional response to this review..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                style={{ borderRadius: '12px', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '10px', padding: '10px 20px' }}
                  disabled={loading || !replyText.trim()}
                >
                  {loading ? 'POSTING...' : 'POST RESPONSE'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: '10px', padding: '10px 16px' }}
                  onClick={() => { setShowForm(false); setReplyText('') }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
