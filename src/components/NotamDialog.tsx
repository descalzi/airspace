import { useState, useEffect } from 'react'
import './WeatherDialog.css'
import { getFIRsByCountry } from '../utils/firLookup'
import { parseNotamCoordinates, type NotamCoordinates } from '../utils/notamCoordinates'
import type { Map } from 'mapbox-gl'

interface NotamData {
    notamNumber: string
    issueDate: string
    startDate: string
    endDate: string
    traditionalMessageFrom4thWord: string
    icaoMessage: string
    status: string
}

interface NotamDialogProps {
    onClose: () => void
    notams: NotamData[] | null
    airportName: string
    icaoCode: string
    countryName: string | null
    loading?: boolean
    error?: string | null
    hideNotam: (notamNumber: string) => void
    isNotamHidden: (notamNumber: string) => boolean
    clearAllHiddenNotams: () => void
    map: Map | null
}

// Parse date string to Date object
const parseNotamDate = (dateStr: string): Date | null => {
    // Handle "PERM" (permanent) case
    if (dateStr === 'PERM') return null

    // Input format: "10/11/2025 0514"
    const parts = dateStr.split(' ')
    if (parts.length !== 2) return null

    const [date, time] = parts
    const [month, day, year] = date.split('/')
    const hours = time.substring(0, 2)
    const minutes = time.substring(2, 4)

    // Create UTC date
    return new Date(
        Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
        ),
    )
}

// Format date string to more readable format
const formatDate = (dateStr: string): string => {
    // Handle "PERM" (permanent) case
    if (dateStr === 'PERM') return 'PERMANENT'

    // Input format: "10/11/2025 0514"
    const parts = dateStr.split(' ')
    if (parts.length !== 2) return dateStr

    const [date, time] = parts
    const [month, day, year] = date.split('/')
    const hours = time.substring(0, 2)
    const minutes = time.substring(2, 4)

    return `${day}/${month}/${year} ${hours}:${minutes}Z`
}

// Parse schedule from ICAO message (D) section)
const parseSchedule = (icaoMessage: string): string | null => {
    // Look for D) section - can be preceded by newline or space
    // Stop at next field marker (e.g., " E)") or newline
    const dMatch = icaoMessage.match(/[\n\s]D\)\s*([^\n]*?)(?=\s[A-Z]\)|[\n]|$)/i)
    if (!dMatch) return null

    let schedule = dMatch[1].trim()

    // Format time (e.g., "0115" -> "01:15")
    schedule = schedule.replace(/\b(\d{4})\b/g, match => {
        const hours = match.substring(0, 2)
        const minutes = match.substring(2, 4)
        return `${hours}:${minutes}`
    })

    return schedule
}

// Parse altitude limits from ICAO message (F) and G) sections)
const parseAltitudeLimits = (icaoMessage: string): string | null => {
    // Match F) and G) sections - they can be preceded by newline or space
    // Stop at next field marker (e.g., " G)") or newline
    const fMatch = icaoMessage.match(/[\n\s]F\)\s*([^\n]*?)(?=\s[A-Z]\)|[\n]|$)/i)
    const gMatch = icaoMessage.match(/[\n\s]G\)\s*([^\n]*?)(?=\s[A-Z]\)|[\n]|$)/i)

    if (!fMatch && !gMatch) return null

    // Helper function to translate altitude values
    const translateAltitude = (alt: string): string => {
        return alt.replace(/\bSFC\b/gi, 'Surface').replace(/\bUNL\b/gi, 'Unlimited')
    }

    const lower = fMatch ? translateAltitude(fMatch[1].trim()) : null
    const upper = gMatch ? translateAltitude(gMatch[1].trim()) : null

    if (lower && upper) {
        return `${lower} - ${upper}`
    } else if (lower) {
        return `${lower} and above`
    } else if (upper) {
        return `Surface - ${upper}`
    }

    return null
}

// Check if current time is within the schedule
const isWithinSchedule = (icaoMessage: string): boolean => {
    // Match D) section - can be preceded by newline or space
    // Stop at next field marker or newline
    const dMatch = icaoMessage.match(/[\n\s]D\)\s*([^\n]*?)(?=\s[A-Z]\)|[\n]|$)/i)
    if (!dMatch) return true // No schedule means always active

    const schedule = dMatch[1].trim()
    const now = new Date()

    // Map day abbreviations to day numbers (Sunday = 0, Monday = 1, etc.)
    const dayMap: Record<string, number> = {
        SUN: 0,
        MON: 1,
        TUE: 2,
        WED: 3,
        THU: 4,
        FRI: 5,
        SAT: 6,
    }

    const currentDay = now.getUTCDay()
    const currentTime = now.getUTCHours() * 100 + now.getUTCMinutes()

    // Check for DAILY
    if (schedule.toUpperCase().includes('DAILY')) {
        // Extract time range
        const timeMatch = schedule.match(/(\d{4})-(\d{4})/)
        if (timeMatch) {
            const startTime = parseInt(timeMatch[1])
            const endTime = parseInt(timeMatch[2])
            return currentTime >= startTime && currentTime <= endTime
        }
        return true
    }

    // Parse day range (e.g., "SUN-MON", "MON-FRI")
    const dayRangeMatch = schedule.match(/([A-Z]{3})-([A-Z]{3})/)
    if (dayRangeMatch) {
        const startDay = dayMap[dayRangeMatch[1]]
        const endDay = dayMap[dayRangeMatch[2]]

        // Check if current day is in range (handle wrap-around like SUN-MON)
        let dayInRange = false
        if (startDay <= endDay) {
            dayInRange = currentDay >= startDay && currentDay <= endDay
        } else {
            // Wrap-around case (e.g., SAT-MON)
            dayInRange = currentDay >= startDay || currentDay <= endDay
        }

        if (!dayInRange) return false

        // Check time range
        const timeMatch = schedule.match(/(\d{4})-(\d{4})/)
        if (timeMatch) {
            const startTime = parseInt(timeMatch[1])
            const endTime = parseInt(timeMatch[2])

            // Handle time wrap-around (e.g., 2300-0200)
            if (startTime <= endTime) {
                return currentTime >= startTime && currentTime <= endTime
            } else {
                return currentTime >= startTime || currentTime <= endTime
            }
        }

        return true
    }

    // Parse single day (e.g., "MON")
    for (const [dayName, dayNum] of Object.entries(dayMap)) {
        if (schedule.toUpperCase().includes(dayName)) {
            if (currentDay !== dayNum) return false

            // Check time range
            const timeMatch = schedule.match(/(\d{4})-(\d{4})/)
            if (timeMatch) {
                const startTime = parseInt(timeMatch[1])
                const endTime = parseInt(timeMatch[2])

                if (startTime <= endTime) {
                    return currentTime >= startTime && currentTime <= endTime
                } else {
                    return currentTime >= startTime || currentTime <= endTime
                }
            }
            return true
        }
    }

    return true // Default to active if we can't parse
}

// Determine NOTAM effective status
const getNotamStatus = (
    startDate: string,
    endDate: string,
    icaoMessage: string,
): {
    status: 'upcoming' | 'active' | 'expired'
    label: string
    color: string
    backgroundColor: string
    borderColor: string
} => {
    const now = new Date()
    const start = parseNotamDate(startDate)
    const end = parseNotamDate(endDate)

    // If start date is in the future
    if (start && start > now) {
        return {
            status: 'upcoming',
            label: 'Upcoming',
            color: '#fc3',
            backgroundColor: 'rgba(255, 180, 100, 0.3)',
            borderColor: 'rgba(255, 180, 100, 0.5)',
        }
    }

    // If end date is PERM or in the future, and start is in the past
    if (!end || end > now) {
        // Check if there's a schedule and if we're within it
        const withinSchedule = isWithinSchedule(icaoMessage)
        const hasSchedule = parseSchedule(icaoMessage) !== null

        if (hasSchedule && !withinSchedule) {
            // Active by date but outside scheduled time
            return {
                status: 'active',
                label: 'Active (Outside Schedule)',
                color: '#fc3',
                backgroundColor: 'rgba(255, 180, 100, 0.3)',
                borderColor: 'rgba(255, 180, 100, 0.5)',
            }
        }

        return {
            status: 'active',
            label: 'Active',
            color: '#9f9',
            backgroundColor: 'rgba(100, 200, 150, 0.3)',
            borderColor: 'rgba(100, 200, 150, 0.5)',
        }
    }

    // Otherwise, it's expired
    return {
        status: 'expired',
        label: 'Expired',
        color: '#f99',
        backgroundColor: 'rgba(200, 100, 100, 0.3)',
        borderColor: 'rgba(200, 100, 100, 0.5)',
    }
}

export const NotamDialog = ({
    onClose,
    notams,
    airportName,
    icaoCode,
    countryName,
    loading,
    error,
    hideNotam,
    isNotamHidden,
    clearAllHiddenNotams,
    map,
}: NotamDialogProps) => {
    // Track which NOTAMs are showing the full ICAO message
    const [expandedNotams, setExpandedNotams] = useState<Set<number>>(new Set())

    // Track active highlight layer
    const [highlightLayerId, setHighlightLayerId] = useState<string | null>(null)

    // Track current time for schedule status updates
    const [, setCurrentTime] = useState<number>(0)

    // FIR selection state
    const [selectedFIR, setSelectedFIR] = useState<string>('')
    const [firNotams, setFirNotams] = useState<NotamData[] | null>(null)
    const [firLoading, setFirLoading] = useState(false)
    const [firError, setFirError] = useState<string | null>(null)

    // Get FIRs for the airport's country, sorted by fir_name
    const availableFIRs = countryName
        ? getFIRsByCountry(countryName).sort((a, b) => a.fir_name.localeCompare(b.fir_name))
        : []

    // Update current time every minute to keep schedule status fresh
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now())
        }, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [])

    // Fetch FIR NOTAMs when a FIR is selected
    useEffect(() => {
        if (!selectedFIR) {
            setFirNotams(null)
            setFirLoading(false)
            setFirError(null)
            return
        }

        const fetchFirNotams = async () => {
            setFirLoading(true)
            setFirError(null)

            try {
                const params = new URLSearchParams({
                    searchType: '0', // 0 = Location Search
                    designatorsForLocation: selectedFIR, // FIR ICAO code
                    notamsOnly: 'false',
                    radius: '20',
                })

                const response = await fetch(
                    'https://corsproxy.io/?https://notams.aim.faa.gov/notamSearch/search',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params.toString(),
                    },
                )

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch FIR NOTAMs: ${response.status} ${response.statusText}`,
                    )
                }

                const data = await response.json()

                if (data.error && data.error !== '') {
                    throw new Error(data.error)
                }

                if (data.notamList && Array.isArray(data.notamList)) {
                    const parsedNotams: NotamData[] = data.notamList.map(
                        (notam: Record<string, unknown>) => ({
                            notamNumber: String(notam.notamNumber || ''),
                            issueDate: String(notam.issueDate || ''),
                            startDate: String(notam.startDate || ''),
                            endDate: String(notam.endDate || ''),
                            traditionalMessageFrom4thWord: String(
                                notam.traditionalMessageFrom4thWord || '',
                            ),
                            icaoMessage: String(notam.icaoMessage || ''),
                            status: String(notam.status || ''),
                        }),
                    )
                    setFirNotams(parsedNotams)
                } else {
                    setFirNotams([])
                }
            } catch (err) {
                setFirError(err instanceof Error ? err.message : 'Unknown error occurred')
                setFirNotams(null)
            } finally {
                setFirLoading(false)
            }
        }

        fetchFirNotams()
    }, [selectedFIR])

    const toggleNotamExpansion = (index: number) => {
        setExpandedNotams(prev => {
            const newSet = new Set(prev)
            if (newSet.has(index)) {
                newSet.delete(index)
            } else {
                newSet.add(index)
            }
            return newSet
        })
    }

    // Clean up map highlight when component unmounts
    useEffect(() => {
        return () => {
            if (map && highlightLayerId) {
                // Remove the highlight source and layers if they exist
                if (map.getLayer(`${highlightLayerId}-circle`)) {
                    map.removeLayer(`${highlightLayerId}-circle`)
                }
                if (map.getLayer(`${highlightLayerId}-pulse`)) {
                    map.removeLayer(`${highlightLayerId}-pulse`)
                }
                if (map.getSource(highlightLayerId)) {
                    map.removeSource(highlightLayerId)
                }
            }
        }
    }, [map, highlightLayerId])

    // Handle viewing position on map
    const handleViewOnMap = (coordinates: NotamCoordinates) => {
        if (!map) return

        // Remove previous highlight if exists
        if (highlightLayerId) {
            if (map.getLayer(`${highlightLayerId}-circle`)) {
                map.removeLayer(`${highlightLayerId}-circle`)
            }
            if (map.getLayer(`${highlightLayerId}-pulse`)) {
                map.removeLayer(`${highlightLayerId}-pulse`)
            }
            if (map.getSource(highlightLayerId)) {
                map.removeSource(highlightLayerId)
            }
        }

        // Create new unique ID for this highlight
        const newLayerId = `notam-highlight-${Date.now()}`
        setHighlightLayerId(newLayerId)

        // zoom level
        const targetZoom = 11

        // Calculate offset to account for the NOTAM dialog panel on the right
        // The panel is typically 400-500px wide, so we offset the center to the left
        const container = map.getContainer()
        const containerWidth = container.offsetWidth

        // Offset by approximately 25% of screen width to the left (negative longitude offset)
        // This moves the map center to the left, making the point appear more to the left, away from the right panel
        const offsetPixels = containerWidth * 0.10

        // Convert pixel offset to longitude offset at the target zoom level
        // At zoom level z, one degree of longitude = 256 * 2^z / 360 pixels at the equator
        // Adjust for latitude using cos(lat)
        const metersPerPixel = (156543.03392 * Math.cos(coordinates.latitude * Math.PI / 180)) / Math.pow(2, targetZoom)
        const offsetMeters = offsetPixels * metersPerPixel
        const offsetLongitude = offsetMeters / (111320 * Math.cos(coordinates.latitude * Math.PI / 180))

        // Fly to the coordinates with offset (subtract to move left)
        map.flyTo({
            center: [coordinates.longitude - offsetLongitude, coordinates.latitude],
            zoom: targetZoom,
            duration: 1500,
        })

        // Add a source for the highlight
        map.addSource(newLayerId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [coordinates.longitude, coordinates.latitude],
                },
                properties: {},
            },
        })

        // Add circle layer for the highlight
        map.addLayer({
            id: `${newLayerId}-circle`,
            type: 'circle',
            source: newLayerId,
            paint: {
                'circle-radius': coordinates.radius
                    ? [
                          'interpolate',
                          ['exponential', 2],
                          ['zoom'],
                          0,
                          0,
                          20,
                          (coordinates.radius * 1852) / 0.075, // Convert NM to meters, adjust for zoom
                      ]
                    : 30,
                'circle-color': '#ff6b6b',
                'circle-opacity': 0.3,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ff0000',
                'circle-stroke-opacity': coordinates.radius ? 0.8 : 0,
            },
        })

        // Add pulsing effect layer
        map.addLayer({
            id: `${newLayerId}-pulse`,
            type: 'circle',
            source: newLayerId,
            paint: {
                'circle-radius': 8,
                'circle-color': '#ff0000',
                'circle-opacity': 0.8,
            },
        })
    }

    return (
        <div className="weather-dialog">
            <div className="weather-dialog-header">
                <div>
                    <h3>
                        {airportName} - {icaoCode} - NOTAMs
                    </h3>
                </div>
                <button className="weather-dialog-close" onClick={onClose}>
                    ×
                </button>
            </div>

            <div className="weather-dialog-content">
                {loading && (
                    <div
                        style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#999',
                            fontStyle: 'italic',
                        }}
                    >
                        Loading NOTAMs...
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#ff6666',
                        }}
                    >
                        Error: {error}
                    </div>
                )}

                {!loading && !error && notams && notams.length === 0 && (
                    <div
                        style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#999',
                            fontStyle: 'italic',
                        }}
                    >
                        No active NOTAMs found for {icaoCode}
                    </div>
                )}

                {!loading && !error && notams && notams.length > 0 && (() => {
                    // Filter out expired and hidden NOTAMs
                    const activeNotams = notams.filter(notam => {
                        const status = getNotamStatus(
                            notam.startDate,
                            notam.endDate,
                            notam.icaoMessage,
                        )
                        return status.status !== 'expired' && !isNotamHidden(notam.notamNumber)
                    })

                    // Count hidden NOTAMs
                    const hiddenCount = notams.filter(notam => {
                        const status = getNotamStatus(
                            notam.startDate,
                            notam.endDate,
                            notam.icaoMessage,
                        )
                        return status.status !== 'expired' && isNotamHidden(notam.notamNumber)
                    }).length

                    if (activeNotams.length === 0 && hiddenCount === 0) {
                        return (
                            <div
                                style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#999',
                                    fontStyle: 'italic',
                                }}
                            >
                                No active NOTAMs found for {icaoCode}
                            </div>
                        )
                    }

                    return (
                        <>
                            <div className="weather-section" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <strong className="weather-section-header">
                                    Active NOTAMs ({activeNotams.length})
                                </strong>
                                {hiddenCount > 0 && (
                                        <strong className="weather-section-header">
                                            Hidden NOTAMs ({hiddenCount})
                                        </strong>
                                )}
                                {hiddenCount > 0 && (
                                        <button
                                            onClick={clearAllHiddenNotams}
                                            style={{
                                                padding: '3px 8px',
                                                margin: 0,
                                                cursor: 'pointer',
                                                background: 'rgba(100,150,200,0.3)',
                                                border: '1px solid rgba(100,150,200,0.5)',
                                                borderRadius: '3px',
                                                display: 'inline-flex',
                                                gap: '4px',
                                                marginBottom: "8px",
                                            }}
                                            title="Show all hidden NOTAMs"
                                        >
                                            <img src="./eye.svg" alt="Show" style={{ width: '14px', height: '14px', filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                                            <span style={{ fontSize: '10px' }}>Show All</span>
                                        </button>
                                )}
                            </div>

                            {activeNotams.map((notam, idx) => {
                            const effectiveStatus = getNotamStatus(
                                notam.startDate,
                                notam.endDate,
                                notam.icaoMessage,
                            )
                            const schedule = parseSchedule(notam.icaoMessage)
                            const altitudeLimits = parseAltitudeLimits(notam.icaoMessage)
                            const coordinates = parseNotamCoordinates(notam.icaoMessage)

                            return (
                                <div
                                    key={idx}
                                    className="weather-section"
                                    style={{
                                        marginTop: idx > 0 ? '12px' : '8px',
                                        paddingLeft: '8px',
                                        borderLeft: '2px solid rgba(100, 150, 200, 0.3)',
                                    }}
                                >
                                    {/* NOTAM Number and Status */}
                                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <strong style={{ color: '#646cff' }}>
                                                {notam.notamNumber}
                                            </strong>
                                            <span
                                                style={{
                                                    marginLeft: '8px',
                                                    padding: '2px 6px',
                                                    background: effectiveStatus.backgroundColor,
                                                    border: `1px solid ${effectiveStatus.borderColor}`,
                                                    borderRadius: '3px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                {effectiveStatus.label}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => hideNotam(notam.notamNumber)}
                                            style={{
                                                padding: '4px',
                                                cursor: 'pointer',
                                                background: 'transparent',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                            title="Hide this NOTAM"
                                        >
                                            <img src="./eye-slash.svg" alt="Hide" style={{ width: '16px', height: '16px', filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                                        </button>
                                    </div>

                                    {/* Issue Date */}
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            color: '#e0e0e0',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        <strong>Issued:</strong> {formatDate(notam.issueDate)}
                                    </div>

                                    {/* Effective Period */}
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            color: '#e0e0e0',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        <strong>Effective:</strong> {formatDate(notam.startDate)} to{' '}
                                        {formatDate(notam.endDate)}
                                    </div>

                                    {/* Schedule (if present) */}
                                    {schedule && (
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: '#e0e0e0',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            <strong>Schedule:</strong> {schedule}
                                        </div>
                                    )}

                                    {/* Altitude Limits (if present) */}
                                    {altitudeLimits && (
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: '#e0e0e0',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            <strong>Altitude:</strong> {altitudeLimits}
                                        </div>
                                    )}

                                    {/* NOTAM Message */}
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: '#d0d0d0',
                                                background: 'rgba(0, 0, 0, 0.2)',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {expandedNotams.has(idx)
                                                ? notam.icaoMessage
                                                : notam.traditionalMessageFrom4thWord}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            {notam.traditionalMessageFrom4thWord.endsWith('...') && (
                                                <button
                                                    onClick={() => toggleNotamExpansion(idx)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        background: 'rgba(100,150,200,0.3)',
                                                        border: '1px solid rgba(100,150,200,0.5)',
                                                        borderRadius: '3px',
                                                        color: 'inherit',
                                                    }}
                                                >
                                                    {expandedNotams.has(idx)
                                                        ? 'Show Summary'
                                                        : 'Show Full Message'}
                                                </button>
                                            )}
                                            {coordinates && (
                                                <button
                                                    onClick={() => handleViewOnMap(coordinates)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        background: 'rgba(100,150,200,0.3)',
                                                        border: '1px solid rgba(100,150,200,0.5)',
                                                        borderRadius: '3px',
                                                        color: 'inherit',
                                                    }}
                                                    title={"View on map"}
                                                >
                                                    View on Map
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </>
                    )
                })()}

                {/* FIR NOTAMs Section */}
                {!loading && !error && availableFIRs.length > 0 && (
                    <div className="weather-section" style={{ marginTop: '20px' }}>
                        <strong className="weather-section-header">FIR NOTAMs</strong>
                        <div style={{ marginTop: '12px' }}>
                            <label
                                htmlFor="fir-selector"
                                style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontSize: '12px',
                                    color: '#d0d0d0',
                                }}
                            >
                                Select FIR for {countryName}:
                            </label>
                            <select
                                id="fir-selector"
                                value={selectedFIR}
                                onChange={e => setSelectedFIR(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(100, 150, 200, 0.5)',
                                    borderRadius: '4px',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="">-- Select a FIR --</option>
                                {availableFIRs.map(fir => (
                                    <option key={fir.icao_code} value={fir.icao_code}>
                                        {fir.fir_name} ({fir.icao_code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedFIR && (
                            <>
                                {/* FIR Header */}
                                {(() => {
                                    const fir = availableFIRs.find(f => f.icao_code === selectedFIR)
                                    return fir ? (
                                        <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                                            <div style={{ marginBottom: '4px' }}>
                                                <strong style={{ color: '#646cff' }}>
                                                    {fir.fir_name} FIR ({fir.icao_code})
                                                </strong>
                                            </div>
                                            {fir.acc_name && (
                                                <div style={{ fontSize: '11px', color: '#999' }}>
                                                    ACC: {fir.acc_name}
                                                </div>
                                            )}
                                        </div>
                                    ) : null
                                })()}

                                {/* Loading state */}
                                {firLoading && (
                                    <div
                                        style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        Loading FIR NOTAMs...
                                    </div>
                                )}

                                {/* Error state */}
                                {firError && (
                                    <div
                                        style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#ff6666',
                                        }}
                                    >
                                        Error: {firError}
                                    </div>
                                )}

                                {/* No NOTAMs */}
                                {!firLoading && !firError && firNotams && firNotams.length === 0 && (
                                    <div
                                        style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        No active FIR NOTAMs found for {selectedFIR}
                                    </div>
                                )}

                                {/* FIR NOTAMs List */}
                                {!firLoading && !firError && firNotams && firNotams.length > 0 && (() => {
                                    // Filter out expired and hidden FIR NOTAMs
                                    const activeFirNotams = firNotams.filter(notam => {
                                        const status = getNotamStatus(
                                            notam.startDate,
                                            notam.endDate,
                                            notam.icaoMessage,
                                        )
                                        return status.status !== 'expired' && !isNotamHidden(notam.notamNumber)
                                    })

                                    // Count hidden FIR NOTAMs
                                    const hiddenFirCount = firNotams.filter(notam => {
                                        const status = getNotamStatus(
                                            notam.startDate,
                                            notam.endDate,
                                            notam.icaoMessage,
                                        )
                                        return status.status !== 'expired' && isNotamHidden(notam.notamNumber)
                                    }).length

                                    if (activeFirNotams.length === 0 && hiddenFirCount === 0) {
                                        return (
                                            <div
                                                style={{
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    color: '#999',
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                No active FIR NOTAMs found for {selectedFIR}
                                            </div>
                                        )
                                    }

                                    return (
                                        <>
                                            <div
                                                style={{
                                                    marginTop: '8px',
                                                    fontSize: '11px',
                                                    color: '#9cf',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <strong>FIR NOTAMs ({activeFirNotams.length})</strong>
                                                {hiddenFirCount > 0 && (
                                                    <>
                                                        <strong>
                                                            Hidden ({hiddenFirCount})
                                                        </strong>
                                                        <button
                                                            onClick={clearAllHiddenNotams}
                                                            style={{
                                                                padding: '3px 8px',
                                                                margin: 0,
                                                                cursor: 'pointer',
                                                                background: 'rgba(100,150,200,0.3)',
                                                                border: '1px solid rgba(100,150,200,0.5)',
                                                                borderRadius: '3px',
                                                                display: 'inline-flex',
                                                                gap: '4px',
                                                            }}
                                                            title="Show all hidden NOTAMs"
                                                        >
                                                            <img src="./eye.svg" alt="Show" style={{ width: '14px', height: '14px', filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                                                            <span style={{ fontSize: '10px' }}>Show All</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {activeFirNotams.map((notam, idx) => {
                                            const effectiveStatus = getNotamStatus(
                                                notam.startDate,
                                                notam.endDate,
                                                notam.icaoMessage,
                                            )
                                            const schedule = parseSchedule(notam.icaoMessage)
                                            const altitudeLimits = parseAltitudeLimits(notam.icaoMessage)
                                            const coordinates = parseNotamCoordinates(notam.icaoMessage)

                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        marginTop: idx > 0 ? '12px' : '8px',
                                                        paddingLeft: '8px',
                                                        borderLeft: '2px solid rgba(100, 150, 200, 0.3)',
                                                    }}
                                                >
                                                    {/* NOTAM Number and Status */}
                                                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <strong style={{ color: '#646cff' }}>
                                                                {notam.notamNumber}
                                                            </strong>
                                                            <span
                                                                style={{
                                                                    marginLeft: '8px',
                                                                    padding: '2px 6px',
                                                                    background: effectiveStatus.backgroundColor,
                                                                    border: `1px solid ${effectiveStatus.borderColor}`,
                                                                    borderRadius: '3px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                }}
                                                            >
                                                                {effectiveStatus.label}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => hideNotam(notam.notamNumber)}
                                                            style={{
                                                                padding: '4px',
                                                                cursor: 'pointer',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                            }}
                                                            title="Hide this NOTAM"
                                                        >
                                                            <img src="./eye-slash.svg" alt="Hide" style={{ width: '16px', height: '16px', filter: 'brightness(0) saturate(100%) invert(40%)' }} />
                                                        </button>
                                                    </div>

                                                    {/* Issue Date */}
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            color: '#e0e0e0',
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        <strong>Issued:</strong>{' '}
                                                        {formatDate(notam.issueDate)}
                                                    </div>

                                                    {/* Effective Period */}
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            color: '#e0e0e0',
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        <strong>Effective:</strong>{' '}
                                                        {formatDate(notam.startDate)} to{' '}
                                                        {formatDate(notam.endDate)}
                                                    </div>

                                                    {/* Schedule (if present) */}
                                                    {schedule && (
                                                        <div
                                                            style={{
                                                                fontSize: '11px',
                                                                color: '#e0e0e0',
                                                                marginBottom: '4px',
                                                            }}
                                                        >
                                                            <strong>Schedule:</strong> {schedule}
                                                        </div>
                                                    )}

                                                    {/* Altitude Limits (if present) */}
                                                    {altitudeLimits && (
                                                        <div
                                                            style={{
                                                                fontSize: '11px',
                                                                color: '#e0e0e0',
                                                                marginBottom: '8px',
                                                            }}
                                                        >
                                                            <strong>Altitude:</strong> {altitudeLimits}
                                                        </div>
                                                    )}

                                                    {/* NOTAM Message */}
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontSize: '11px',
                                                                color: '#d0d0d0',
                                                                background: 'rgba(0, 0, 0, 0.2)',
                                                                padding: '8px',
                                                                borderRadius: '4px',
                                                                fontFamily: 'monospace',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                            }}
                                                        >
                                                            {expandedNotams.has(idx + 10000) // Use offset to avoid collision with airport NOTAMs
                                                                ? notam.icaoMessage
                                                                : notam.traditionalMessageFrom4thWord}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                            {notam.traditionalMessageFrom4thWord.endsWith(
                                                                '...',
                                                            ) && (
                                                                <button
                                                                    onClick={() =>
                                                                        toggleNotamExpansion(idx + 10000)
                                                                    }
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        fontSize: '10px',
                                                                        cursor: 'pointer',
                                                                        background: 'rgba(100,150,200,0.3)',
                                                                        border: '1px solid rgba(100,150,200,0.5)',
                                                                        borderRadius: '3px',
                                                                        color: 'inherit',
                                                                    }}
                                                                >
                                                                    {expandedNotams.has(idx + 10000)
                                                                        ? 'Show Summary'
                                                                        : 'Show Full Message'}
                                                                </button>
                                                            )}
                                                            {coordinates && (
                                                                <button
                                                                    onClick={() => handleViewOnMap(coordinates)}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        fontSize: '10px',
                                                                        cursor: 'pointer',
                                                                        background: 'rgba(100,150,200,0.3)',
                                                                        border: '1px solid rgba(100,150,200,0.5)',
                                                                        borderRadius: '3px',
                                                                        color: 'inherit',
                                                                    }}
                                                                    title={`View position on map${coordinates.radius ? ` (${coordinates.radius}NM radius)` : ''}`}
                                                                >
                                                                    View on Map
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </>
                                    )
                                })()}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
