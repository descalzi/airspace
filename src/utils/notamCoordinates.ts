/**
 * Parse coordinates from NOTAM ICAO message text.
 *
 * Supports various formats:
 * - "PSN 504856N 0011248W"
 * - "POSITION 504856N 0011142W"
 * - "WI 1NM RADIUS OF 510718N 0021047W"
 * - "WI 0.5NM RADIUS OF 531152N 0021042W"
 * - "BY: 524810N 0002901E"
 * - "PSN: SITE CENTRE 512748N 0002553W"
 *
 * @param icaoMessage - The full ICAO message text
 * @returns Object with coordinates and radius, or null if not found
 */
export interface NotamCoordinates {
    latitude: number
    longitude: number
    radius?: number // in nautical miles
}

/**
 * Convert DMS (Degrees Minutes Seconds) to decimal degrees.
 *
 * Format: DDMMSS[N/S] or DDDMMSS[E/W]
 * Examples:
 * - 504856N -> 50.8156°N
 * - 0011248W -> -0.2133°W
 */
const parseDMSToDecimal = (dms: string): number | null => {
    // Extract hemisphere (N/S/E/W)
    const hemisphere = dms.slice(-1).toUpperCase()
    const numbers = dms.slice(0, -1)

    // Determine if this is latitude (N/S) or longitude (E/W)
    const isLatitude = hemisphere === 'N' || hemisphere === 'S'
    const isLongitude = hemisphere === 'E' || hemisphere === 'W'

    if (!isLatitude && !isLongitude) return null

    // For latitude: DDMMSS (6 digits)
    // For longitude: DDDMMSS (7 digits)
    const expectedLength = isLatitude ? 6 : 7

    if (numbers.length !== expectedLength) return null

    // Extract degrees, minutes, seconds
    const degrees = parseInt(numbers.slice(0, isLatitude ? 2 : 3))
    const minutes = parseInt(numbers.slice(isLatitude ? 2 : 3, isLatitude ? 4 : 5))
    const seconds = parseInt(numbers.slice(isLatitude ? 4 : 5))

    // Validate ranges
    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) return null
    if (minutes >= 60 || seconds >= 60) return null
    if (isLatitude && degrees > 90) return null
    if (isLongitude && degrees > 180) return null

    // Convert to decimal
    let decimal = degrees + minutes / 60 + seconds / 3600

    // Apply hemisphere (S and W are negative)
    if (hemisphere === 'S' || hemisphere === 'W') {
        decimal = -decimal
    }

    return decimal
}

/**
 * Extract coordinates from a NOTAM ICAO message.
 */
export const parseNotamCoordinates = (icaoMessage: string): NotamCoordinates | null => {
    // Normalize message: convert to uppercase for pattern matching
    const normalized = icaoMessage.toUpperCase()

    // Pattern 1: "WI X[.X]NM RADIUS OF DDMMSS[N/S] DDDMMSS[E/W]"
    // Matches:
    // - "WI 1NM RADIUS OF 510718N 0021047W"
    // - "WI 0.5NM RADIUS OF 531152N 0021042W"
    const radiusPattern = /WI\s+(\d+(?:\.\d+)?)\s*NM\s+RADIUS\s+OF\s+(\d{6}[NS])\s+(\d{7}[EW])/i
    const radiusMatch = normalized.match(radiusPattern)

    if (radiusMatch) {
        const radius = parseFloat(radiusMatch[1])
        const lat = parseDMSToDecimal(radiusMatch[2])
        const lon = parseDMSToDecimal(radiusMatch[3])

        if (lat !== null && lon !== null) {
            return { latitude: lat, longitude: lon, radius }
        }
    }

    // Pattern 2: "PSN[:][ ][SITE CENTRE ]DDMMSS[N/S] DDDMMSS[E/W]"
    // Matches:
    // - "PSN 504856N 0011248W"
    // - "PSN: SITE CENTRE 512748N 0002553W"
    // - "POSITION 504856N 0011142W"
    const psnPattern = /(?:PSN|POSITION)(?:\s*:\s*)?(?:\s+SITE\s+CENTRE\s+)?(\d{6}[NS])\s+(\d{7}[EW])/i
    const psnMatch = normalized.match(psnPattern)

    if (psnMatch) {
        const lat = parseDMSToDecimal(psnMatch[1])
        const lon = parseDMSToDecimal(psnMatch[2])

        if (lat !== null && lon !== null) {
            return { latitude: lat, longitude: lon }
        }
    }

    // Pattern 3: "BY: DDMMSS[N/S] DDDMMSS[E/W]"
    // Matches:
    // - "BY: 524810N 0002901E"
    const byPattern = /BY\s*:\s*(\d{6}[NS])\s+(\d{7}[EW])/i
    const byMatch = normalized.match(byPattern)

    if (byMatch) {
        const lat = parseDMSToDecimal(byMatch[1])
        const lon = parseDMSToDecimal(byMatch[2])

        if (lat !== null && lon !== null) {
            return { latitude: lat, longitude: lon }
        }
    }

    // Pattern 4: General coordinate pattern (fallback)
    // Just look for any coordinate pair in the format DDMMSS[N/S] DDDMMSS[E/W]
    const generalPattern = /(\d{6}[NS])\s+(\d{7}[EW])/i
    const generalMatch = normalized.match(generalPattern)

    if (generalMatch) {
        const lat = parseDMSToDecimal(generalMatch[1])
        const lon = parseDMSToDecimal(generalMatch[2])

        if (lat !== null && lon !== null) {
            return { latitude: lat, longitude: lon }
        }
    }

    return null
}
