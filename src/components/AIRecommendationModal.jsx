import { useState } from 'react'
import { recommendationEngine } from '../utils/recommendationEngine'

const PREFERENCE_OPTIONS = {
  amenities: ['WiFi', 'Laundry', 'Parking', 'CCTV', 'Gym', 'Power Backup', 'AC', 'Water Purifier'],
  food: [
    { value: 'any', label: 'Any' },
    { value: 'included', label: 'Food Included' },
    { value: 'not-included', label: 'No Food' }
  ],
  gender: [
    { value: 'any', label: 'Any' },
    { value: 'boys', label: 'Boys Only' },
    { value: 'girls', label: 'Girls Only' },
    { value: 'co-ed', label: 'Co-ed' }
  ],
  maxDistance: [
    { value: 'any', label: 'Any Distance' },
    { value: '1', label: 'Within 1 km' },
    { value: '3', label: 'Within 3 km' },
    { value: '5', label: 'Within 5 km' },
    { value: '10', label: 'Within 10 km' }
  ]
}

export default function AIRecommendationModal({ isOpen, onClose, onRecommendations }) {
  const [preferences, setPreferences] = useState({
    budget: '',
    location: null,
    amenities: [],
    food: 'any',
    gender: 'any',
    maxDistance: 'any'
  })
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const toggleAmenity = (amenity) => {
    setPreferences(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const getCurrentLocation = () => {
    setLocationLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPreferences(prev => ({
            ...prev,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          }))
          setLocationLoading(false)
        },
        (err) => {
          console.error('Geolocation error:', err)
          setLocationLoading(false)
        }
      )
    }
  }

  const handleGetRecommendations = async () => {
    if (!preferences.budget || preferences.budget <= 0) {
      alert('Please enter a valid budget')
      return
    }

    setLoading(true)
    try {
      const recommendations = await recommendationEngine.getRecommendations({
        budget: Number(preferences.budget),
        location: preferences.location,
        amenities: preferences.amenities,
        food: preferences.food,
        gender: preferences.gender,
        maxDistance: preferences.maxDistance,
        limit: 8
      })

      onRecommendations(recommendations)
      onClose()
    } catch (error) {
      console.error('Error getting recommendations:', error)
      alert('Failed to get recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-recommendation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Get AI PG Recommendations</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="recommendation-form">
            {/* Budget Input */}
            <div className="form-group">
              <label className="form-label">Monthly Budget (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 15000"
                value={preferences.budget}
                onChange={e => updatePreference('budget', e.target.value)}
                min="1000"
                max="50000"
              />
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Location</label>
              <div className="location-input-group">
                <button
                  type="button"
                  className="btn btn-outline location-btn"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? '📍 Getting location...' : '📍 Use my location'}
                </button>
                {preferences.location && (
                  <span className="location-status">
                    ✓ Location set ({preferences.location.lat.toFixed(2)}, {preferences.location.lng.toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            {/* Food Preference */}
            <div className="form-group">
              <label className="form-label">Food Preference</label>
              <div className="radio-group">
                {PREFERENCE_OPTIONS.food.map(option => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="food"
                      value={option.value}
                      checked={preferences.food === option.value}
                      onChange={e => updatePreference('food', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gender Preference */}
            <div className="form-group">
              <label className="form-label">Gender Preference</label>
              <div className="radio-group">
                {PREFERENCE_OPTIONS.gender.map(option => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value={option.value}
                      checked={preferences.gender === option.value}
                      onChange={e => updatePreference('gender', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Distance Preference */}
            <div className="form-group">
              <label className="form-label">Maximum Distance from College</label>
              <div className="radio-group">
                {PREFERENCE_OPTIONS.maxDistance.map(option => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="maxDistance"
                      value={option.value}
                      checked={preferences.maxDistance === option.value}
                      onChange={e => updatePreference('maxDistance', e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="form-group">
              <label className="form-label">Preferred Amenities</label>
              <div className="amenities-grid">
                {PREFERENCE_OPTIONS.amenities.map(amenity => (
                  <label key={amenity} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={preferences.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGetRecommendations}
            disabled={loading || !preferences.budget}
          >
            {loading ? '🔄 Getting recommendations...' : '🚀 Get AI Recommendations'}
          </button>
        </div>
      </div>
    </div>
  )
}