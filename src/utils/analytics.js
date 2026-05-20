import { addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../firebase'

const SESSION_STORAGE_KEY = 'pg_platform_session_id'

function createSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') return createSessionId()

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const next = createSessionId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

export async function trackEvent(eventName, payload = {}, stage = eventName) {
  try {
    await addDoc(collection(db, 'analytics_events'), {
      eventName,
      stage,
      sessionId: getAnalyticsSessionId(),
      userId: auth.currentUser?.uid || null,
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      payload,
      createdAt: new Date()
    })
  } catch (error) {
    console.error('Analytics tracking failed:', error)
  }
}
