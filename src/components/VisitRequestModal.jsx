import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'

export default function VisitRequestModal({ isOpen, onClose, pg, user }) {
  const [form, setForm] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addDoc(collection(db, 'visitRequests'), {
        ...form,
        pgId: pg.id,
        pgName: pg.name,
        userId: user?.uid,
        status: 'pending',
        createdAt: new Date()
      })
      setSuccess('Visit request sent! The owner will contact you soon.')
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 3000)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-card modal-glass-card" style={{ maxWidth: '500px', width: '100%', padding: '32px', margin: '20px' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '24px' }}>Request a Visit</h3>
        {success && <div className="alert alert-success" style={{ marginBottom: '24px' }}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Preferred Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.preferredDate}
                  onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Time</label>
                <select
                  className="form-control"
                  value={form.preferredTime}
                  onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                  required
                >
                  <option value="">Select time</option>
                  <option value="morning">Morning (9AM-12PM)</option>
                  <option value="afternoon">Afternoon (12PM-5PM)</option>
                  <option value="evening">Evening (5PM-8PM)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message (Optional)</label>
              <textarea
                className="form-control"
                rows="3"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Any specific questions or requirements..."
              />
            </div>
          </div>
          <div className="responsive-action-row" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
