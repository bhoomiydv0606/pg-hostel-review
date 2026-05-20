import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * AI PG Recommendation Engine
 * Uses collaborative filtering and content-based matching
 * to provide personalized PG suggestions
 */

class PGRecommendationEngine {
  constructor() {
    this.pgs = []
    this.userPreferences = {}
    this.weights = {
      budget: 0.25,
      location: 0.20,
      amenities: 0.15,
      rating: 0.15,
      food: 0.10,
      gender: 0.10,
      distance: 0.05
    }
  }

  /**
   * Load all active PGs from database
   */
  async loadPGs() {
    try {
      const q = query(collection(db, 'pgs'), where('isActive', '==', true))
      const snapshot = await getDocs(q)
      this.pgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return this.pgs
    } catch (error) {
      console.error('Error loading PGs:', error)
      return []
    }
  }

  /**
   * Calculate budget compatibility score (0-1)
   */
  calculateBudgetScore(pg, userBudget) {
    if (!userBudget || userBudget <= 0) return 0.5 // Neutral if no budget specified

    const pgPrice = this.getEffectivePrice(pg)
    if (!pgPrice) return 0

    const budgetRatio = pgPrice / userBudget

    if (budgetRatio <= 0.8) return 1.0 // Great deal
    if (budgetRatio <= 1.0) return 0.9 // Within budget
    if (budgetRatio <= 1.2) return 0.7 // Slightly over
    if (budgetRatio <= 1.5) return 0.4 // Moderately over
    return 0.1 // Way over budget
  }

  /**
   * Calculate location proximity score (0-1)
   */
  calculateLocationScore(pg, userLocation) {
    if (!userLocation || !pg.latitude || !pg.longitude) return 0.5

    const distance = this.getDistance(
      userLocation.lat, userLocation.lng,
      pg.latitude, pg.longitude
    )

    // Score based on distance (km)
    if (distance <= 1) return 1.0
    if (distance <= 3) return 0.9
    if (distance <= 5) return 0.8
    if (distance <= 10) return 0.6
    if (distance <= 15) return 0.4
    return 0.2
  }

  /**
   * Calculate amenities matching score (0-1)
   */
  calculateAmenitiesScore(pg, preferredAmenities) {
    if (!preferredAmenities || preferredAmenities.length === 0) return 0.5

    const pgAmenities = pg.amenities || []
    const matched = preferredAmenities.filter(amenity =>
      pgAmenities.includes(amenity)
    ).length

    return Math.min(matched / preferredAmenities.length, 1.0)
  }

  /**
   * Calculate rating score (0-1)
   */
  calculateRatingScore(pg) {
    const rating = pg.avgRating || 0
    const reviewCount = pg.reviewCount || 0

    // Boost score for higher ratings and more reviews
    let score = rating / 5.0 // Normalize to 0-1

    // Review count multiplier (more reviews = more confidence)
    const reviewMultiplier = Math.min(reviewCount / 10, 1.0)
    score = score * 0.7 + reviewMultiplier * 0.3

    return Math.min(score, 1.0)
  }

  /**
   * Calculate food preference score (0-1)
   */
  calculateFoodScore(pg, foodPreference) {
    if (!foodPreference || foodPreference === 'any') return 0.5

    const hasFood = pg.foodInfo?.available || false

    if (foodPreference === 'included' && hasFood) return 1.0
    if (foodPreference === 'not-included' && !hasFood) return 1.0
    if (foodPreference === 'included' && !hasFood) return 0.2
    if (foodPreference === 'not-included' && hasFood) return 0.2

    return 0.5
  }

  /**
   * Calculate gender compatibility score (0-1)
   */
  calculateGenderScore(pg, preferredGender) {
    if (!preferredGender || preferredGender === 'any') return 0.5

    const pgGender = pg.targetGender || 'co-ed'

    if (pgGender === preferredGender) return 1.0
    if (pgGender === 'co-ed') return 0.8 // Co-ed is flexible
    return 0.1 // Gender mismatch
  }

  /**
   * Calculate college distance score (0-1)
   */
  calculateDistanceScore(pg, maxDistance) {
    if (!maxDistance || maxDistance === 'any') return 0.5

    const distance = Number(pg.collegeDistanceKm) || Number.MAX_SAFE_INTEGER

    if (distance <= Number(maxDistance)) return 1.0
    if (distance <= Number(maxDistance) * 1.5) return 0.7
    return 0.3
  }

  /**
   * Get effective price for a PG
   */
  getEffectivePrice(pg) {
    if (pg.pricing?.trueCost) return pg.pricing.trueCost
    return pg.rentMin || 0
  }

  /**
   * Calculate Haversine distance between two points
   */
  getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Generate personalized recommendations
   */
  async getRecommendations(userPreferences) {
    if (this.pgs.length === 0) {
      await this.loadPGs()
    }

    const {
      budget,
      location,
      amenities = [],
      food = 'any',
      gender = 'any',
      maxDistance = 'any',
      limit = 10
    } = userPreferences

    // Calculate scores for each PG
    const scoredPGs = this.pgs.map(pg => {
      const scores = {
        budget: this.calculateBudgetScore(pg, budget),
        location: this.calculateLocationScore(pg, location),
        amenities: this.calculateAmenitiesScore(pg, amenities),
        rating: this.calculateRatingScore(pg),
        food: this.calculateFoodScore(pg, food),
        gender: this.calculateGenderScore(pg, gender),
        distance: this.calculateDistanceScore(pg, maxDistance)
      }

      // Calculate weighted total score
      const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
        return sum + (score * this.weights[key])
      }, 0)

      return {
        ...pg,
        recommendationScore: Math.round(totalScore * 100) / 100,
        scores,
        matchReasons: this.generateMatchReasons(scores)
      }
    })

    // Sort by recommendation score and return top results
    return scoredPGs
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit)
  }

  /**
   * Generate human-readable match reasons
   */
  generateMatchReasons(scores) {
    const reasons = []

    if (scores.budget >= 0.8) reasons.push('Great budget match')
    else if (scores.budget >= 0.6) reasons.push('Good budget fit')

    if (scores.location >= 0.8) reasons.push('Very close to your location')
    else if (scores.location >= 0.6) reasons.push('Convenient location')

    if (scores.amenities >= 0.8) reasons.push('Has most preferred amenities')
    else if (scores.amenities >= 0.5) reasons.push('Has some preferred amenities')

    if (scores.rating >= 0.8) reasons.push('Highly rated by residents')
    else if (scores.rating >= 0.6) reasons.push('Well-rated option')

    if (scores.food >= 0.9) reasons.push('Matches food preference')

    if (scores.gender >= 0.9) reasons.push('Perfect gender fit')

    if (scores.distance >= 0.9) reasons.push('Close to college')

    return reasons.slice(0, 3) // Limit to top 3 reasons
  }

  /**
   * Get similar PGs based on a reference PG
   */
  async getSimilarPGs(referencePGId, limit = 5) {
    if (this.pgs.length === 0) {
      await this.loadPGs()
    }

    const referencePG = this.pgs.find(pg => pg.id === referencePGId)
    if (!referencePG) return []

    const similarPGs = this.pgs
      .filter(pg => pg.id !== referencePGId)
      .map(pg => {
        let similarity = 0

        // Price similarity
        const priceDiff = Math.abs(this.getEffectivePrice(pg) - this.getEffectivePrice(referencePG))
        const priceSimilarity = Math.max(0, 1 - (priceDiff / Math.max(this.getEffectivePrice(referencePG), 1000)))
        similarity += priceSimilarity * 0.3

        // Location similarity (if both have coordinates)
        if (referencePG.latitude && pg.latitude) {
          const distance = this.getDistance(
            referencePG.latitude, referencePG.longitude,
            pg.latitude, pg.longitude
          )
          const locationSimilarity = Math.max(0, 1 - (distance / 10)) // 10km max
          similarity += locationSimilarity * 0.2
        }

        // Amenities similarity
        const refAmenities = referencePG.amenities || []
        const pgAmenities = pg.amenities || []
        const commonAmenities = refAmenities.filter(a => pgAmenities.includes(a)).length
        const amenitiesSimilarity = commonAmenities / Math.max(refAmenities.length, 1)
        similarity += amenitiesSimilarity * 0.2

        // Rating similarity
        const ratingDiff = Math.abs((pg.avgRating || 0) - (referencePG.avgRating || 0))
        const ratingSimilarity = Math.max(0, 1 - (ratingDiff / 5))
        similarity += ratingSimilarity * 0.15

        // Gender similarity
        const genderMatch = (pg.targetGender || 'co-ed') === (referencePG.targetGender || 'co-ed') ? 1 : 0.5
        similarity += genderMatch * 0.15

        return {
          ...pg,
          similarityScore: Math.round(similarity * 100) / 100
        }
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit)

    return similarPGs
  }
}

// Export singleton instance
export const recommendationEngine = new PGRecommendationEngine()
export default recommendationEngine