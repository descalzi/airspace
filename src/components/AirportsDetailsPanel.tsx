import { useState, useEffect } from 'react'
import { CollapsiblePanel } from './CollapsiblePanel'
import { config } from '../config'
import { formatRunwayLength } from '../hooks/useSettings'
import type { RunwayLengthUnit, Favourite } from '../hooks/useSettings'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
    coordinates?: [number, number]
}

interface MetarData {
    rawOb: string
    obsTime: number
}

interface WeatherData {
    icaoCode: string
    airportName: string
    metarData: MetarData
}

interface RunwayData {
    le_ident: string
    he_ident: string
    length_ft: string
    width_ft: string
    surface: string
    lighted: string
    closed: string
    le_ils?: {
        freq: number
        course: number
    }
    he_ils?: {
        freq: number
        course: number
    }
}

interface FrequencyData {
    type: string
    description: string
    frequency_mhz: string
}

interface AirportCountryDetails {
    name: string
    code: string
}
interface AirportDetailData {
    name: string
    icao_code: string
    iata_code?: string
    elevation_ft: string
    municipality?: string
    country: AirportCountryDetails
    runways: RunwayData[]
    freqs: FrequencyData[]
}

interface NotamData {
    icaoCode: string
    airportName: string
    countryName: string
}

interface AirportsDetailsPanelProps {
    airports: FeatureData[]
    isOpen: boolean
    onToggle: (isOpen: boolean) => void
    runwayLengthUnit: RunwayLengthUnit
    onWeatherOpen: (data: WeatherData) => void
    onNotamOpen: (data: NotamData) => void
    addFavourite: (favourite: Favourite) => void
    removeFavourite: (id: string) => void
    isFavourite: (id: string) => boolean
}

const API_TOKEN = config.airportDB.token

interface MetarData {
    rawOb: string
    obsTime: number // Unix timestamp in seconds
}

interface WindData {
    direction: number | null // null for variable winds
    speed: number
    gust?: number
}

// Parse wind from METAR
const parseWind = (metar: string): WindData | null => {
    const windMatch = metar.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT/)
    if (!windMatch) return null

    const direction = windMatch[1] === 'VRB' ? null : parseInt(windMatch[1])
    const speed = parseInt(windMatch[2])
    const gust = windMatch[4] ? parseInt(windMatch[4]) : undefined

    return { direction, speed, gust }
}

// Calculate wind components for a runway heading
const calculateWindComponents = (
    windDir: number,
    windSpeed: number,
    runwayHeading: number,
): { headwind: number; crosswind: number } => {
    // Convert to radians
    const windRad = (windDir * Math.PI) / 180
    const runwayRad = (runwayHeading * Math.PI) / 180

    // Calculate angle difference
    const angleDiff = windRad - runwayRad

    // Calculate components
    const headwind = windSpeed * Math.cos(angleDiff)
    const crosswind = windSpeed * Math.sin(angleDiff)

    return {
        headwind: Math.round(headwind),
        crosswind: Math.round(Math.abs(crosswind)),
    }
}

export const AirportsDetailsPanel = ({
    airports,
    isOpen,
    onToggle,
    runwayLengthUnit,
    onWeatherOpen,
    onNotamOpen,
    addFavourite,
    removeFavourite,
    isFavourite,
}: AirportsDetailsPanelProps) => {
    const [expandedIcao, setExpandedIcao] = useState<string | null>(null)
    const [airportData, setAirportData] = useState<AirportDetailData | null>(null)
    const [metarDataMap, setMetarDataMap] = useState<Record<string, MetarData | null>>({})
    const [metarLoadingMap, setMetarLoadingMap] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000))

    // Update current time every minute to keep METAR age display fresh
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000))
        }, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [])

    // Fetch METAR data for a specific airport
    const fetchMetarForAirport = async (icaoCode: string) => {
        setMetarLoadingMap(prev => ({ ...prev, [icaoCode]: true }))

        try {
            const metarResponse = await fetch(
                `https://corsproxy.io/?https://aviationweather.gov/api/data/metar?ids=${icaoCode}&format=json`,
            )

            if (metarResponse.ok) {
                const metarDataResult = await metarResponse.json()
                if (metarDataResult && metarDataResult.length > 0 && metarDataResult[0].rawOb) {
                    setMetarDataMap(prev => ({
                        ...prev,
                        [icaoCode]: {
                            rawOb: metarDataResult[0].rawOb,
                            obsTime: metarDataResult[0].obsTime,
                        },
                    }))
                } else {
                    setMetarDataMap(prev => ({ ...prev, [icaoCode]: null }))
                }
            } else {
                setMetarDataMap(prev => ({ ...prev, [icaoCode]: null }))
            }
        } catch {
            setMetarDataMap(prev => ({ ...prev, [icaoCode]: null }))
        } finally {
            setMetarLoadingMap(prev => ({ ...prev, [icaoCode]: false }))
        }
    }

    // Fetch METAR data for all airports when they change
    useEffect(() => {
        const fetchMetarForAirports = async () => {
            for (const airport of airports) {
                const icaoCode = String(airport.properties.icao_code || '')
                if (!icaoCode || metarDataMap[icaoCode] !== undefined) continue

                await fetchMetarForAirport(icaoCode)
            }
        }

        fetchMetarForAirports()
    }, [airports, metarDataMap])

    // Handler to refresh METAR for a specific airport
    const handleRefreshMetar = (icaoCode: string) => {
        fetchMetarForAirport(icaoCode)
    }

    const handleViewDetails = async (icaoCode: string) => {
        // If clicking the same airport, collapse it
        if (expandedIcao === icaoCode) {
            setExpandedIcao(null)
            setAirportData(null)
            return
        }

        setExpandedIcao(icaoCode)
        setLoading(true)
        setError(null)

        try {
            // Fetch airport details
            const airportResponse = await fetch(
                `https://airportdb.io/api/v1/airport/${icaoCode}?apiToken=${API_TOKEN}`,
            )

            if (!airportResponse.ok) {
                throw new Error(`Failed to fetch airport data: ${airportResponse.statusText}`)
            }

            const airportDataResult = await airportResponse.json()
            setAirportData(airportDataResult)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred')
            setAirportData(null)
        } finally {
            setLoading(false)
        }
    }

    // Don't render if there are no airports
    if (airports.length === 0) return null

    return (
        <CollapsiblePanel title="Airport" isOpen={isOpen} onToggle={onToggle}>
            <div
                style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '4px',
                }}
            >
                {airports.map((feature, index) => {
                    const props = feature.properties || {}
                    const icaoCode = String(props.icao_code || '')
                    const isExpanded = expandedIcao === icaoCode
                    const metarData = metarDataMap[icaoCode]
                    const metarLoading = metarLoadingMap[icaoCode]

                    return (
                        <div
                            key={index}
                            style={{
                                margin: '4px 0',
                                padding: '6px',
                                background: 'rgba(100,100,100,0.1)',
                                borderRadius: '4px',
                            }}
                        >
                            {props.name ? (
                                <>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <div>
                                            <strong>Name:</strong> {String(props.name)}
                                        </div>
                                        {icaoCode && (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    e.currentTarget.blur()
                                                    const favouriteId = icaoCode
                                                    if (isFavourite(favouriteId)) {
                                                        removeFavourite(favouriteId)
                                                    } else {
                                                        addFavourite({
                                                            type: 'airport',
                                                            id: favouriteId,
                                                            name: String(props.name || icaoCode),
                                                            coordinates: feature.coordinates,
                                                        })
                                                    }
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    outline: 'none',
                                                }}
                                                title={
                                                    isFavourite(icaoCode)
                                                        ? 'Remove from favourites'
                                                        : 'Add to favourites'
                                                }
                                            >
                                                {isFavourite(icaoCode) ? (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 512 512"
                                                        width="16"
                                                        height="16"
                                                        fill="#666666"
                                                    >
                                                        <path d="M241 87.1l15 20.7 15-20.7C296 52.5 336.2 32 378.9 32 452.4 32 512 91.6 512 165.1l0 2.6c0 112.2-139.9 242.5-212.9 298.2-12.4 9.4-27.6 14.1-43.1 14.1s-30.8-4.6-43.1-14.1C139.9 410.2 0 279.9 0 167.7l0-2.6C0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1z" />
                                                    </svg>
                                                ) : (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 512 512"
                                                        width="16"
                                                        height="16"
                                                        fill="#666666"
                                                    >
                                                        <path d="M378.9 80c-27.3 0-53 13.1-69 35.2l-34.4 47.6c-4.5 6.2-11.7 9.9-19.4 9.9s-14.9-3.7-19.4-9.9l-34.4-47.6c-16-22.1-41.7-35.2-69-35.2-47 0-85.1 38.1-85.1 85.1 0 49.9 32 98.4 68.1 142.3 41.1 50 91.4 94 125.9 120.3 3.2 2.4 7.9 4.2 14 4.2s10.8-1.8 14-4.2c34.5-26.3 84.8-70.4 125.9-120.3 36.2-43.9 68.1-92.4 68.1-142.3 0-47-38.1-85.1-85.1-85.1zM271 87.1c25-34.6 65.2-55.1 107.9-55.1 73.5 0 133.1 59.6 133.1 133.1 0 68.6-42.9 128.9-79.1 172.8-44.1 53.6-97.3 100.1-133.8 127.9-12.3 9.4-27.5 14.1-43.1 14.1s-30.8-4.7-43.1-14.1C176.4 438 123.2 391.5 79.1 338 42.9 294.1 0 233.7 0 165.1 0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1l15 20.7 15-20.7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                        {props.type && String(props.type).includes('mil') ? (
                                            <span
                                                style={{
                                                    padding: '2px 6px',
                                                    background: 'rgba(200, 100, 100, 0.3)',
                                                    border: '1px solid rgba(200, 100, 100, 0.5)',
                                                    borderRadius: '3px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                MILITARY
                                            </span>
                                        ) : null}
                                    </div>
                                    <br />
                                </>
                            ) : null}

                            {props.icao_code ? (
                                <>
                                    <strong>ICAO:</strong> {String(props.icao_code)}
                                    {props.iata_code ? ` (IATA: ${String(props.iata_code)})` : ''}
                                    <br />
                                </>
                            ) : null}

                            {!props.icao_code && props.iata_code ? (
                                <>
                                    <strong>IATA:</strong> {String(props.iata_code)}
                                    <br />
                                </>
                            ) : null}

                            {/* METAR display - shown immediately */}
                            {icaoCode && (
                                <div>
                                    {metarLoading ? (
                                        <>
                                            <strong>METAR:</strong>
                                            <div
                                                style={{
                                                    marginTop: '4px',
                                                    paddingLeft: '8px',
                                                    fontSize: '11px',
                                                    color: '#999',
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                Loading...
                                            </div>
                                        </>
                                    ) : metarData ? (
                                        <>
                                            <strong>METAR:</strong>
                                            {(() => {
                                                const ageMinutes = Math.floor(
                                                    (currentTime - metarData.obsTime) / 60,
                                                )
                                                const isOld = ageMinutes > 30

                                                return (
                                                    <>
                                                        <span
                                                            style={{
                                                                marginLeft: '8px',
                                                                fontSize: '11px',
                                                                color: isOld ? '#ff6666' : '#999',
                                                            }}
                                                        >
                                                            ({ageMinutes} min ago
                                                            {isOld ? ' - OLD' : ''})
                                                        </span>
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation()
                                                                handleRefreshMetar(icaoCode)
                                                            }}
                                                            style={{
                                                                marginLeft: '6px',
                                                                padding: '2px 4px',
                                                                fontSize: '10px',
                                                                cursor: 'pointer',
                                                                background: 'transparent',
                                                                border: '1px solid rgba(100,150,200,0.4)',
                                                                borderRadius: '3px',
                                                                color: 'inherit',
                                                                verticalAlign: 'middle',
                                                                outline: 'none',
                                                            }}
                                                            title="Refresh METAR"
                                                        >
                                                            ↻
                                                        </button>
                                                        <div
                                                            style={{
                                                                marginTop: '4px',
                                                                paddingLeft: '8px',
                                                                fontFamily: 'monospace',
                                                                fontSize: '11px',
                                                                color: '#d0d0d0',
                                                            }}
                                                        >
                                                            {metarData.rawOb}
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </>
                                    ) : metarDataMap[icaoCode] === null ? (
                                        <>
                                            <strong>METAR:</strong>
                                            <div
                                                style={{
                                                    marginTop: '4px',
                                                    paddingLeft: '8px',
                                                    fontSize: '11px',
                                                    color: '#999',
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                No METAR available
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            )}

                            {props.icao_code ? (
                                <div
                                    style={{
                                        marginTop: '8px',
                                        display: 'flex',
                                        gap: '8px',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <button
                                        onClick={e => {
                                            e.stopPropagation()
                                            handleViewDetails(icaoCode)
                                        }}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            background: 'rgba(100,150,200,0.3)',
                                            border: '1px solid rgba(100,150,200,0.5)',
                                            borderRadius: '3px',
                                            color: 'inherit',
                                            outline: 'none',
                                        }}
                                    >
                                        {isExpanded ? 'Close Details' : 'Expand Details'}
                                    </button>
                                    {metarData && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation()
                                                onWeatherOpen({
                                                    icaoCode,
                                                    airportName: String(props.name || icaoCode),
                                                    metarData,
                                                })
                                            }}
                                            style={{
                                                padding: '4px 12px',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                background: 'rgba(100,150,200,0.3)',
                                            border: '1px solid rgba(100,150,200,0.5)',
                                                borderRadius: '3px',
                                                color: 'inherit',
                                                outline: 'none',
                                            }}
                                        >
                                            Decode METAR
                                        </button>
                                    )}
                                    <button
                                        onClick={async e => {
                                            e.stopPropagation()
                                            // Fetch country if not already in airportData
                                            let countryName = airportData?.country?.name || ''
                                            if (!countryName) {
                                                try {
                                                    const response = await fetch(
                                                        `https://airportdb.io/api/v1/airport/${icaoCode}?apiToken=${API_TOKEN}`,
                                                    )
                                                    if (response.ok) {
                                                        const data = await response.json()
                                                        countryName = data.country?.name || ''
                                                    }
                                                } catch {
                                                    // If fetch fails, continue with empty country
                                                }
                                            }
                                            onNotamOpen({
                                                icaoCode,
                                                airportName: String(props.name || icaoCode),
                                                countryName,
                                            })
                                        }}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            background: 'rgba(100,150,200,0.3)',
                                            border: '1px solid rgba(100,150,200,0.5)',
                                            borderRadius: '3px',
                                            color: 'inherit',
                                            outline: 'none',
                                        }}
                                    >
                                        Check NOTAMs
                                    </button>
                                </div>
                            ) : null}

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div style={{ marginTop: '8px' }}>
                                    {loading && (
                                        <div style={{ padding: '4px', color: '#666' }}>
                                            Loading...
                                        </div>
                                    )}

                                    {error && (
                                        <div style={{ padding: '4px', color: '#c00' }}>
                                            Error: {error}
                                        </div>
                                    )}

                                    {airportData && !loading && (
                                        <>
                                            {/* Basic Information */}
                                            <div style={{ marginBottom: '4px' }}>
                                                {airportData.municipality && (
                                                    <>
                                                        <strong>Location:</strong>{' '}
                                                        {airportData.municipality}{airportData.country.name ? `, ${airportData.country.name}`    : ''}
                                                        <br />
                                                    </>
                                                )}
                                                <strong>Elevation:</strong>{' '}
                                                {airportData.elevation_ft} ft
                                            </div>

                                            {/* Runways */}
                                            {airportData.runways &&
                                                airportData.runways.filter(r => r.closed !== '1')
                                                    .length > 0 &&
                                                (() => {
                                                    // Parse wind from METAR if available
                                                    const wind = metarData
                                                        ? parseWind(metarData.rawOb)
                                                        : null

                                                    return (
                                                        <div style={{ marginTop: '8px' }}>
                                                            <strong>Runways:</strong>
                                                            {airportData.runways
                                                                .filter(r => r.closed !== '1')
                                                                .map((runway, idx) => {
                                                                    // Calculate runway headings from identifiers
                                                                    const leHeading =
                                                                        parseInt(
                                                                            runway.le_ident.replace(
                                                                                /[LRC]/g,
                                                                                '',
                                                                            ),
                                                                        ) * 10
                                                                    const heHeading =
                                                                        parseInt(
                                                                            runway.he_ident.replace(
                                                                                /[LRC]/g,
                                                                                '',
                                                                            ),
                                                                        ) * 10

                                                                    // Calculate wind components for both ends if wind is available and not variable
                                                                    let favoredEnd:
                                                                        | 'le'
                                                                        | 'he'
                                                                        | null = null
                                                                    let windComponents: {
                                                                        headwind: number
                                                                        crosswind: number
                                                                        gust?: {
                                                                            headwind: number
                                                                            crosswind: number
                                                                        }
                                                                    } | null = null

                                                                    if (
                                                                        wind &&
                                                                        wind.direction !== null
                                                                    ) {
                                                                        const leComponents =
                                                                            calculateWindComponents(
                                                                                wind.direction,
                                                                                wind.speed,
                                                                                leHeading,
                                                                            )
                                                                        const heComponents =
                                                                            calculateWindComponents(
                                                                                wind.direction,
                                                                                wind.speed,
                                                                                heHeading,
                                                                            )

                                                                        // Pick the end with more headwind (less tailwind)
                                                                        favoredEnd =
                                                                            leComponents.headwind >=
                                                                            heComponents.headwind
                                                                                ? 'le'
                                                                                : 'he'
                                                                        const favoredComponents =
                                                                            favoredEnd === 'le'
                                                                                ? leComponents
                                                                                : heComponents

                                                                        windComponents = {
                                                                            headwind:
                                                                                favoredComponents.headwind,
                                                                            crosswind:
                                                                                favoredComponents.crosswind,
                                                                        }

                                                                        // Calculate gust components if gusting
                                                                        if (wind.gust) {
                                                                            const gustComponents =
                                                                                calculateWindComponents(
                                                                                    wind.direction,
                                                                                    wind.gust,
                                                                                    favoredEnd ===
                                                                                        'le'
                                                                                        ? leHeading
                                                                                        : heHeading,
                                                                                )
                                                                            windComponents.gust =
                                                                                gustComponents
                                                                        }
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            style={{
                                                                                marginTop: '4px',
                                                                                paddingLeft: '8px',
                                                                            }}
                                                                        >
                                                                            <strong>
                                                                                {runway.le_ident}/
                                                                                {runway.he_ident}
                                                                            </strong>
                                                                            {favoredEnd && (
                                                                                <span
                                                                                    style={{
                                                                                        marginLeft:
                                                                                            '6px',
                                                                                        fontSize:
                                                                                            '10px',
                                                                                        color: '#9cf',
                                                                                        fontWeight:
                                                                                            'normal',
                                                                                    }}
                                                                                >
                                                                                    (Favored:{' '}
                                                                                    {favoredEnd ===
                                                                                    'le'
                                                                                        ? runway.le_ident
                                                                                        : runway.he_ident}
                                                                                    )
                                                                                </span>
                                                                            )}
                                                                            <br />
                                                                            <strong>
                                                                                Length:
                                                                            </strong>{' '}
                                                                            {formatRunwayLength(
                                                                                runway.length_ft,
                                                                                runwayLengthUnit,
                                                                            )}{' '}
                                                                            ×{' '}
                                                                            {formatRunwayLength(
                                                                                runway.width_ft,
                                                                                runwayLengthUnit,
                                                                            )}
                                                                            <br />
                                                                            <strong>
                                                                                Surface:
                                                                            </strong>{' '}
                                                                            {runway.surface}
                                                                            {/* Wind Components */}
                                                                            {windComponents && (
                                                                                <>
                                                                                    <br />
                                                                                    <strong>
                                                                                        Wind:
                                                                                    </strong>{' '}
                                                                                    <span
                                                                                        style={{
                                                                                            color:
                                                                                                windComponents.headwind <
                                                                                                0
                                                                                                    ? '#ffaa66'
                                                                                                    : '#9cf',
                                                                                        }}
                                                                                    >
                                                                                        {windComponents.headwind >=
                                                                                        0
                                                                                            ? 'Headwind'
                                                                                            : 'Tailwind'}{' '}
                                                                                        {Math.abs(
                                                                                            windComponents.headwind,
                                                                                        )}{' '}
                                                                                        kt
                                                                                    </span>
                                                                                    {', '}
                                                                                    <span
                                                                                        style={{
                                                                                            color:
                                                                                                windComponents.crosswind >
                                                                                                10
                                                                                                    ? '#ffaa66'
                                                                                                    : '#9cf',
                                                                                        }}
                                                                                    >
                                                                                        Crosswind{' '}
                                                                                        {
                                                                                            windComponents.crosswind
                                                                                        }{' '}
                                                                                        kt
                                                                                    </span>
                                                                                    {windComponents.gust && (
                                                                                        <span
                                                                                            style={{
                                                                                                fontSize:
                                                                                                    '10px',
                                                                                                color: '#ffaa66',
                                                                                            }}
                                                                                        >
                                                                                            {' '}
                                                                                            (Gust:{' '}
                                                                                            {windComponents
                                                                                                .gust
                                                                                                .headwind >=
                                                                                            0
                                                                                                ? 'H'
                                                                                                : 'T'}
                                                                                            {Math.abs(
                                                                                                windComponents
                                                                                                    .gust
                                                                                                    .headwind,
                                                                                            )}
                                                                                            /
                                                                                            {
                                                                                                windComponents
                                                                                                    .gust
                                                                                                    .crosswind
                                                                                            }
                                                                                            )
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {wind &&
                                                                                wind.direction ===
                                                                                    null && (
                                                                                    <>
                                                                                        <br />
                                                                                        <strong>
                                                                                            Wind:
                                                                                        </strong>{' '}
                                                                                        <span
                                                                                            style={{
                                                                                                color: '#999',
                                                                                                fontStyle:
                                                                                                    'italic',
                                                                                            }}
                                                                                        >
                                                                                            Variable{' '}
                                                                                            {
                                                                                                wind.speed
                                                                                            }{' '}
                                                                                            kt
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            {(runway.le_ils ||
                                                                                runway.he_ils) && (
                                                                                <>
                                                                                    <br />
                                                                                    <strong>
                                                                                        ILS:
                                                                                    </strong>{' '}
                                                                                    {runway.le_ils &&
                                                                                        `${runway.le_ident} ${runway.le_ils.freq} MHz`}
                                                                                    {runway.le_ils &&
                                                                                        runway.he_ils &&
                                                                                        ', '}
                                                                                    {runway.he_ils &&
                                                                                        `${runway.he_ident} ${runway.he_ils.freq} MHz`}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                        </div>
                                                    )
                                                })()}

                                            {/* Frequencies */}
                                            {airportData.freqs && airportData.freqs.length > 0 && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <strong>Frequencies:</strong>
                                                    {airportData.freqs.map((freq, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                marginTop: '4px',
                                                                paddingLeft: '8px',
                                                            }}
                                                        >
                                                            <strong>{freq.type}:</strong>{' '}
                                                            {freq.frequency_mhz} MHz
                                                            {freq.description &&
                                                                freq.description !== freq.type && (
                                                                    <> ({freq.description})</>
                                                                )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </CollapsiblePanel>
    )
}
