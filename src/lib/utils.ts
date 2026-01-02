/**
 * Generate a cryptographically secure random alphanumeric invite code
 * @param length Length of the code (default: 8)
 * @returns Random alphanumeric string
 */
export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const charsLength = chars.length
  let result = ''
  
  // Use crypto.getRandomValues for cryptographically secure randomness
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment - use rejection sampling to avoid modulo bias
    const maxRange = 256 - (256 % charsLength)
    const array = new Uint8Array(length * 2) // Generate extra bytes for rejection sampling
    window.crypto.getRandomValues(array)
    
    let arrayIndex = 0
    while (result.length < length && arrayIndex < array.length) {
      const byte = array[arrayIndex++]
      // Only use bytes in the unbiased range
      if (byte < maxRange) {
        result += chars.charAt(byte % charsLength)
      }
    }
    
    // If we need more bytes (unlikely), generate more
    while (result.length < length) {
      const extraArray = new Uint8Array(length - result.length)
      window.crypto.getRandomValues(extraArray)
      for (let i = 0; i < extraArray.length && result.length < length; i++) {
        const byte = extraArray[i]
        if (byte < maxRange) {
          result += chars.charAt(byte % charsLength)
        }
      }
    }
  } else if (typeof require !== 'undefined') {
    // Node.js environment - use rejection sampling to avoid modulo bias
    try {
      const crypto = require('crypto')
      const maxRange = 256 - (256 % charsLength)
      const bytes = crypto.randomBytes(length * 2)
      
      let byteIndex = 0
      while (result.length < length && byteIndex < bytes.length) {
        const byte = bytes[byteIndex++]
        // Only use bytes in the unbiased range
        if (byte < maxRange) {
          result += chars.charAt(byte % charsLength)
        }
      }
      
      // If we need more bytes (unlikely), generate more
      while (result.length < length) {
        const extraBytes = crypto.randomBytes(length - result.length)
        for (let i = 0; i < extraBytes.length && result.length < length; i++) {
          const byte = extraBytes[i]
          if (byte < maxRange) {
            result += chars.charAt(byte % charsLength)
          }
        }
      }
    } catch (e) {
      // Fallback to Math.random if crypto is not available
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charsLength))
      }
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charsLength))
    }
  }
  
  return result
}

/**
 * Available context tags for vibe check
 */
export const CONTEXT_TAGS = [
  'family',
  'friends',
  'date',
  'exercise',
  'sport',
  'relax',
  'movies',
  'gaming',
  'reading',
  'cleaning',
  'sleep early',
  'eat healthy',
  'shopping',
] as const

export type ContextTag = typeof CONTEXT_TAGS[number]

/**
 * Get descriptive label for vibe score
 */
export function getVibeLabel(score: number): string {
  if (score <= 2) return 'Drained'
  if (score <= 4) return 'Low'
  if (score === 5) return 'Neutral'
  if (score <= 7) return 'Good'
  if (score <= 9) return 'Great'
  return 'Electric'
}

/**
 * Get color for vibe score (gradient from blue to orange)
 */
export function getVibeColor(score: number): string {
  // Interpolate between cool blue (1) and energetic orange (10)
  const colors = [
    '#3B82F6', // 1 - Blue
    '#60A5FA',
    '#93C5FD',
    '#BFDBFE', // 4
    '#D1D5DB', // 5 - Neutral gray
    '#FCD34D', // 6
    '#FBBF24',
    '#F59E0B',
    '#F97316', // 9
    '#EA580C', // 10 - Orange
  ]
  return colors[Math.max(0, Math.min(9, score - 1))]
}

/**
 * Check if data is stale (older than 24 hours)
 */
export function isDataStale(timestamp: string | Date): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)
  return hours > 24
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
