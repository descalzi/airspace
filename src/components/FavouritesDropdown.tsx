import { useState, useRef, useEffect } from 'react'
import './SearchBox.css'
import type { Map } from 'mapbox-gl'
import type { Favourite } from '../hooks/useSettings'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
    coordinates?: [number, number]
}

interface FavouritesDropdownProps {
    map: Map | null
    favourites: Favourite[]
    onFeatureSelect?: (features: FeatureData[]) => void
    removeFavourite: (id: string) => void
}

export const FavouritesDropdown = ({
    map,
    favourites,
    onFeatureSelect,
    removeFavourite,
}: FavouritesDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (favourite: Favourite) => {
        if (!map) return

        // Use stored coordinates if available
        const coords = favourite.coordinates

        if (!coords) {
            console.warn(`No coordinates stored for favourite: ${favourite.id}`)
            setIsOpen(false)
            return
        }

        // Fly to the location
        map.flyTo({
            center: coords,
            zoom:
                favourite.type === 'airport' ? 10 : favourite.type === 'reporting_point' ? 11 : 10,
            duration: 2000,
        })

        // Wait for map to finish moving AND tiles to load before querying features
        const handleMapIdle = () => {
            if (!map) return

            // Remove the listener after it fires once
            map.off('idle', handleMapIdle)

            const point = map.project(coords)

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

        setIsOpen(false)
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', pointerEvents: 'all' }}>
            <button className="header-button" onClick={() => setIsOpen(!isOpen)}>
                Favourites
            </button>

            {isOpen && (
                <div
                    className="search-results"
                    style={{ top: '100%', marginTop: '8px', minWidth: '250px' }}
                >
                    {favourites.length === 0 ? (
                        <div
                            style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#999',
                                fontSize: '13px',
                                lineHeight: '1.5',
                            }}
                        >
                            Click the{' '}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                width="14"
                                height="14"
                                fill="#666666"
                                style={{
                                    display: 'inline',
                                    verticalAlign: 'middle',
                                    margin: '0 2px',
                                }}
                            >
                                <path d="M378.9 80c-27.3 0-53 13.1-69 35.2l-34.4 47.6c-4.5 6.2-11.7 9.9-19.4 9.9s-14.9-3.7-19.4-9.9l-34.4-47.6c-16-22.1-41.7-35.2-69-35.2-47 0-85.1 38.1-85.1 85.1 0 49.9 32 98.4 68.1 142.3 41.1 50 91.4 94 125.9 120.3 3.2 2.4 7.9 4.2 14 4.2s10.8-1.8 14-4.2c34.5-26.3 84.8-70.4 125.9-120.3 36.2-43.9 68.1-92.4 68.1-142.3 0-47-38.1-85.1-85.1-85.1zM271 87.1c25-34.6 65.2-55.1 107.9-55.1 73.5 0 133.1 59.6 133.1 133.1 0 68.6-42.9 128.9-79.1 172.8-44.1 53.6-97.3 100.1-133.8 127.9-12.3 9.4-27.5 14.1-43.1 14.1s-30.8-4.7-43.1-14.1C176.4 438 123.2 391.5 79.1 338 42.9 294.1 0 233.7 0 165.1 0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1l15 20.7 15-20.7z" />
                            </svg>{' '}
                            in an airport, navaid, or reporting point to add them to your favourites
                        </div>
                    ) : (
                        favourites.map(fav => (
                            <div
                                key={fav.id}
                                className="search-result-item"
                                onClick={() => handleSelect(fav)}
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
                                            fav.type === 'airport'
                                                ? './airport.svg'
                                                : fav.type === 'navaid'
                                                  ? './vor.svg'
                                                  : './vrp.svg'
                                        }
                                        alt={fav.type}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            flexShrink: 0,
                                            filter: 'brightness(0) invert(1)',
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="result-main">
                                            <span className="result-name">{fav.name}</span>
                                        </div>
                                        <div className="result-details">
                                            {fav.type === 'airport'
                                                ? `ICAO: ${fav.id}`
                                                : fav.type === 'navaid'
                                                  ? `Identifier: ${fav.id}`
                                                  : 'Reporting Point'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={e => {
                                        e.stopPropagation()
                                        e.currentTarget.blur()
                                        removeFavourite(fav.id)
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                        outline: 'none',
                                    }}
                                    title="Remove from favourites"
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
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
