// Input validation and sanitization utilities

// Basic HTML sanitization - removes potentially dangerous tags
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input

  // Remove script tags and other dangerous elements
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength
export const isValidPassword = (password) => {
  return password && password.length >= 6
}

// Validate text length
export const isValidLength = (text, min = 1, max = 1000) => {
  if (!text) return min === 0
  return text.length >= min && text.length <= max
}

// Validate rating (1-5 stars)
export const isValidRating = (rating) => {
  const num = Number(rating)
  return !isNaN(num) && num >= 1 && num <= 5
}

// Validate coordinates
export const isValidCoordinates = (lat, lng) => {
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  return !isNaN(latNum) && !isNaN(lngNum) &&
         latNum >= -90 && latNum <= 90 &&
         lngNum >= -180 && lngNum <= 180
}

// Validate file size (in bytes)
export const isValidFileSize = (file, maxSizeBytes = 10 * 1024 * 1024) => { // 10MB default
  return file && file.size <= maxSizeBytes
}

// Validate file type
export const isValidFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']) => {
  return file && allowedTypes.includes(file.type)
}