import { useState, useEffect, useRef, useCallback } from 'react'
import './SearchBox.css'
import type { Map } from 'mapbox-gl'

interface SearchResult {
    id: string
    name: string
    type: 'airport' | 'navaid' | 'reportingPoint'
    icao?: string
    coordinates: [number, number]
    details?: string
}

interface FeatureData {
    type: string
    properties: Record<string, unknown>
    coordinates?: [number, number]
}

interface SearchBoxProps {
    map: Map | null
    onFeatureSelect?: (features: FeatureData[]) => void
    isFavourite?: (id: string) => boolean
}

export const SearchBox = ({ map, onFeatureSelect, isFavourite }: SearchBoxProps) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const searchRef = useRef<HTMLDivElement>(null)

    // Search through map features
    const performSearch = useCallback(
        (searchQuery: string) => {
            if (!map || !searchQuery || searchQuery.length < 2) {
                setResults([])
                return
            }

            const query = searchQuery.toLowerCase()
            const foundResults: SearchResult[] = []
            const seenAirports = new Set<string>()
            const seenNavaids = new Set<string>()
            const seenReportingPoints = new Set<string>()

            // Search airports
            const airportFeatures = map.querySourceFeatures('openaip', {
                sourceLayer: 'airports',
            })

            airportFeatures.forEach(feature => {
                if (foundResults.length >= 50) return // Limit results

                const props = feature.properties || {}
                const name = String(props.name || '').toLowerCase()
                const icao = String(props.icao_code || '').toLowerCase()
                const iata = String(props.iata_code || '').toLowerCase()

                // Skip if we've already seen this airport
                const airportKey = props.icao_code || props.name
                if (!airportKey || seenAirports.has(airportKey)) return

                if (name.includes(query) || icao.includes(query) || iata.includes(query)) {
                    const coords =
                        feature.geometry.type === 'Point'
                            ? (feature.geometry.coordinates as [number, number])
                            : ([0, 0] as [number, number])

                    seenAirports.add(airportKey)
                    foundResults.push({
                        id: `airport-${props.icao_code || Math.random()}`,
                        name: String(props.name || 'Unknown Airport'),
                        type: 'airport',
                        icao: props.icao_code ? String(props.icao_code) : undefined,
                        coordinates: coords,
                        details: props.icao_code ? `ICAO: ${props.icao_code}` : undefined,
                    })
                }
            })

            // Search navaids
            const navaidFeatures = map.querySourceFeatures('openaip', {
                sourceLayer: 'navaids',
            })

            navaidFeatures.forEach(feature => {
                if (foundResults.length >= 50) return

                const props = feature.properties || {}
                const name = String(props.name || '').toLowerCase()
                const identifier = String(props.identifier || '').toLowerCase()

                // Skip if we've already seen this navaid
                const navaidKey = props.identifier || props.name
                if (!navaidKey || seenNavaids.has(navaidKey)) return

                if (name.includes(query) || identifier.includes(query)) {
                    const coords =
                        feature.geometry.type === 'Point'
                            ? (feature.geometry.coordinates as [number, number])
                            : ([0, 0] as [number, number])

                    // Format navaid type: uppercase and replace underscores/dashes with spaces
                    const navaidType = String(props.type || 'Navaid')
                        .toUpperCase()
                        .replace(/[_-]/g, ' ')

                    seenNavaids.add(navaidKey)
                    foundResults.push({
                        id: `navaid-${props.identifier || Math.random()}`,
                        name: String(props.name || props.identifier || 'Unknown Navaid'),
                        type: 'navaid',
                        coordinates: coords,
                        details: `${navaidType} - ${props.identifier || ''}`,
                    })
                }
            })

            // Search reporting points
            const reportingPointFeatures = map.querySourceFeatures('openaip', {
                sourceLayer: 'reporting_points',
            })

            reportingPointFeatures.forEach(feature => {
                if (foundResults.length >= 50) return

                const props = feature.properties || {}
                const name = String(props.name || '').toLowerCase()

                // Skip if we've already seen this reporting point
                const rpKey = props.source_id || props.name
                if (!rpKey || seenReportingPoints.has(rpKey)) return

                if (name.includes(query)) {
                    const coords =
                        feature.geometry.type === 'Point'
                            ? (feature.geometry.coordinates as [number, number])
                            : ([0, 0] as [number, number])

                    seenReportingPoints.add(rpKey)
                    foundResults.push({
                        id: `reportingPoint-${props.source_id || Math.random()}`,
                        name: String(props.name || 'Unknown Reporting Point'),
                        type: 'reportingPoint',
                        coordinates: coords,
                        details: props.compulsory
                            ? 'Compulsory Reporting Point'
                            : 'Reporting Point',
                    })
                }
            })

            // Sort results: exact matches first, then alphabetically
            foundResults.sort((a, b) => {
                const aNameLower = a.name.toLowerCase()
                const bNameLower = b.name.toLowerCase()
                const aIcaoLower = a.icao?.toLowerCase() || ''
                const bIcaoLower = b.icao?.toLowerCase() || ''

                // Exact matches first
                if (aNameLower === query || aIcaoLower === query) return -1
                if (bNameLower === query || bIcaoLower === query) return 1

                // Then alphabetically
                return a.name.localeCompare(b.name)
            })

            setResults(foundResults)
            setIsOpen(true)
        },
        [map],
    )

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query)
        }, 300)

        return () => clearTimeout(timer)
    }, [query, performSearch])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle selection
    const handleSelect = (result: SearchResult) => {
        if (!map) return

        // Fly to the selected location
        map.flyTo({
            center: result.coordinates,
            zoom: result.type === 'airport' ? 10 : result.type === 'reportingPoint' ? 11 : 10,
            duration: 2000,
        })

        // Wait for map to finish moving AND tiles to load before querying features
        const handleMapIdle = () => {
            if (!map) return

            // Remove the listener after it fires once
            map.off('idle', handleMapIdle)

            // Project the coordinates to screen point
            const point = map.project(result.coordinates)

            // Query all rendered features at this point (same as map click)
            const renderedFeatures = map.queryRenderedFeatures(point, {
                layers: [
                    'airspace-fill-unclassified',
                    'airspace-fill-g',
                    'airspace-fill-f',
                    'airspace-fill-e',
                    'airspace-fill-d',
                    'airspace-fill-c',
                    'airspace-fill-b',
                    'airspace-fill-a',
                    'airports',
                    'navaids',
                    'obstacles',
                    'reporting-points',
                ],
            })

            if (renderedFeatures.length > 0 && onFeatureSelect) {
                // Convert features to our data format (same as MapBox click handler)
                const featureData: FeatureData[] = renderedFeatures.map(f => {
                    const coords =
                        f.geometry && f.geometry.type === 'Point'
                            ? (f.geometry.coordinates as [number, number])
                            : undefined

                    return {
                        type: f.properties?.feature_type || 'unknown',
                        properties: f.properties || {},
                        coordinates: coords,
                    }
                })
                onFeatureSelect(featureData)
            }
        }

        // Listen for when the map finishes moving and tiles are loaded
        map.once('idle', handleMapIdle)

        setQuery('')
        setResults([])
        setIsOpen(false)
        setSelectedIndex(-1)
    }

    // Handle clear button click
    const handleClear = () => {
        setQuery('')
        setResults([])
        setIsOpen(false)
        setSelectedIndex(-1)
    }

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault()
            handleSelect(results[selectedIndex])
        } else if (e.key === 'Escape') {
            setIsOpen(false)
            setSelectedIndex(-1)
        }
    }

    return (
        <div className="search-box" ref={searchRef}>
            <div className="search-input-wrapper">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search airports, navaids, or vrps ..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => {
                        if (query.length >= 2) setIsOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <button
                        className="search-clear-button"
                        onClick={handleClear}
                        title="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="search-results">
                    {results.length > 0 ? (
                        <>
                            {results.map((result, index) => {
                                const resultId =
                                    result.type === 'airport'
                                        ? result.icao || ''
                                        : result.id.replace('navaid-', '')
                                const isFav = isFavourite && isFavourite(resultId)

                                return (
                                    <div
                                        key={result.id}
                                        className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                                        onClick={() => handleSelect(result)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                            }}
                                        >
                                            <img
                                                src={
                                                    result.type === 'airport'
                                                        ? './airport.svg'
                                                        : result.type === 'navaid'
                                                          ? './vor.svg'
                                                          : './vrp.svg'
                                                }
                                                alt={result.type}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    flexShrink: 0,
                                                    filter: 'brightness(0) invert(1)',
                                                }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="result-main">
                                                    <span className="result-name">
                                                        {result.name}
                                                    </span>
                                                </div>
                                                {result.details && (
                                                    <div className="result-details">
                                                        {result.details}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isFav && (
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '4px',
                                                    flexShrink: 0,
                                                }}
                                                title="Saved as Favourite"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 512 512"
                                                    width="14"
                                                    height="14"
                                                    fill="#666666"
                                                >
                                                    <path d="M241 87.1l15 20.7 15-20.7C296 52.5 336.2 32 378.9 32 452.4 32 512 91.6 512 165.1l0 2.6c0 112.2-139.9 242.5-212.9 298.2-12.4 9.4-27.6 14.1-43.1 14.1s-30.8-4.6-43.1-14.1C139.9 410.2 0 279.9 0 167.7l0-2.6C0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1z" />
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                            {results.length >= 50 && (
                                <div className="search-result-info">
                                    Showing first 50 results. Refine your search for more specific
                                    results.
                                </div>
                            )}
                        </>
                    ) : (
                        query.length >= 2 && (
                            <div className="search-no-results">
                                No results found. Try zooming out to cover a larger area.
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    )
}
