import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { config } from '../config'

const MAPBOX_TOKEN = config.mapbox.token
const MAPBOX_STYLE = config.mapbox.style
const BACKEND_URL = config.backend.url

mapboxgl.accessToken = MAPBOX_TOKEN

interface FeatureData {
    type: string
    properties: Record<string, unknown>
    coordinates?: [number, number] // For point features
}

interface MapBoxProps {
    onFeaturesClick: (features: FeatureData[]) => void
    onMapReady?: (map: mapboxgl.Map) => void
    showObstacles?: boolean
    showReportingPoints?: boolean
    hideAirways?: boolean
}

export const MapBox = ({
    onFeaturesClick,
    onMapReady,
    showObstacles = true,
    showReportingPoints = true,
    hideAirways = true,
}: MapBoxProps) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)

    useEffect(() => {
        if (!mapContainer.current || map.current) return

        // Default center (UK) - fallback if geolocation fails or is denied
        const defaultCenter: [number, number] = [0.1821, 51.1537]
        const defaultZoom = 10

        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success callback
                position => {
                    const userCenter: [number, number] = [
                        position.coords.longitude,
                        position.coords.latitude,
                    ]
                    console.info('Using user location:', userCenter)
                    initializeMap(userCenter, defaultZoom)
                },
                // Error callback (denied permission or other error)
                error => {
                    console.info('Booooh! Geolocation failed, using default location:', error.message)
                    initializeMap(defaultCenter, defaultZoom)
                },
                // Options
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 0,
                },
            )
        } else {
            console.info('Geolocation not supported, using default location')
            initializeMap(defaultCenter, defaultZoom)
        }

        function initializeMap(center: [number, number], zoom: number) {
            if (!mapContainer.current || map.current) return

            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: MAPBOX_STYLE,
                center: center,
                zoom: zoom,
                pitch: 0,
                bearing: 0,
            })

            map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

            // Add OpenAIP vector tiles once the map style is loaded
            map.current.on('load', () => {
            if (!map.current) return

            // Add OpenAIP source
            map.current.addSource('openaip', {
                type: 'vector',
                tiles: [
                    `${BACKEND_URL}/openaip/tiles/{z}/{x}/{y}.pbf`,
                ],
                minzoom: 2,
                maxzoom: 22,
            })

            const loadAirportIcons = () => {
                // Load PNG at higher resolution for better quality when scaled
                const airportIcon = new Image(64, 64)
                airportIcon.onload = () => {
                    if (map.current && !map.current.hasImage('airport-icon')) {
                        map.current.addImage('airport-icon', airportIcon)
                    }
                }
                airportIcon.onerror = () => {
                    console.error('Failed to load airport icon from ./airport.png')
                }
                airportIcon.src = './airport.png'
            }

            const loadObstacleIcon = () => {
                const obstacleIcon = new Image(64, 64)
                obstacleIcon.onload = () => {
                    if (map.current && !map.current.hasImage('obstacle-icon')) {
                        map.current.addImage('obstacle-icon', obstacleIcon)
                    }
                }
                obstacleIcon.onerror = () => {
                    console.error('Failed to load obstacle icon from ./tower.svg')
                }
                obstacleIcon.src = './tower.svg'
            }

            const loadReportingPointIcon = () => {
                const reportingPointIcon = new Image(64, 64)
                reportingPointIcon.onload = () => {
                    if (map.current && !map.current.hasImage('reporting-point-icon')) {
                        map.current.addImage('reporting-point-icon', reportingPointIcon)
                    }
                }
                reportingPointIcon.onerror = () => {
                    console.error('Failed to load reporting point icon from ./vrp.svg')
                }
                reportingPointIcon.src = './vrp.svg'
            }
            // Load custom icons for navaids
            const loadNavaidIcons = () => {
                if (!map.current) return

                // VOR icon - compass rose (higher resolution for crisp rendering)
                const vorIcon = new Image(64, 64)
                vorIcon.onload = () => {
                    if (map.current && !map.current.hasImage('vor-icon')) {
                        map.current.addImage('vor-icon', vorIcon)
                    }
                }
                vorIcon.onerror = () => {
                    console.error('Failed to load VOR icon from ./vor.png')
                }
                vorIcon.src = './vor.png'

                // NDB icon - radio waves (higher resolution)
                const ndbIcon = new Image(64, 64)
                ndbIcon.onload = () => {
                    if (map.current && !map.current.hasImage('ndb-icon')) {
                        map.current.addImage('ndb-icon', ndbIcon)
                    }
                }
                ndbIcon.onerror = () => {
                    console.error('Failed to load NDB icon')
                }
                ndbIcon.src =
                    'data:image/svg+xml;base64,' +
                    btoa(`
          <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="6" fill="#000000"/>
            <circle cx="32" cy="32" r="12" fill="none" stroke="#000000" stroke-width="2" opacity="0.8"/>
            <circle cx="32" cy="32" r="20" fill="none" stroke="#000000" stroke-width="1.5" opacity="0.6"/>
            <circle cx="32" cy="32" r="28" fill="none" stroke="#000000" stroke-width="1" opacity="0.4"/>
          </svg>
        `)

                // DME icon - diamond (higher resolution)
                const dmeIcon = new Image(64, 64)
                dmeIcon.onload = () => {
                    if (map.current && !map.current.hasImage('dme-icon')) {
                        map.current.addImage('dme-icon', dmeIcon)
                    }
                }
                dmeIcon.onerror = () => {
                    console.error('Failed to load DME icon')
                }
                dmeIcon.src =
                    'data:image/svg+xml;base64,' +
                    btoa(`
          <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
            <path d="M 32 8 L 56 32 L 32 56 L 8 32 Z" fill="none" stroke="#323232" stroke-width="2"/>
            <circle cx="32" cy="32" r="6" fill="#323232"/>
          </svg>
        `)

                // Waypoint icon - triangle (higher resolution)
                const waypointIcon = new Image(64, 64)
                waypointIcon.onload = () => {
                    if (map.current && !map.current.hasImage('waypoint-icon')) {
                        map.current.addImage('waypoint-icon', waypointIcon)
                    }
                }
                waypointIcon.onerror = () => {
                    console.error('Failed to load waypoint icon')
                }
                waypointIcon.src =
                    'data:image/svg+xml;base64,' +
                    btoa(`
          <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
            <path d="M 32 12 L 52 52 L 12 52 Z" fill="none" stroke="#ffff00" stroke-width="2"/>
            <circle cx="32" cy="40" r="4" fill="#ffff00"/>
          </svg>
        `)
            }

            // Load icons once map style is loaded
            loadAirportIcons()
            loadNavaidIcons()
            loadObstacleIcon()
            loadReportingPointIcon()

            // Airspace layers - separate layers for each ICAO class for proper priority stacking
            // Render in order: Unclassified (lowest) -> G -> F -> E -> D -> C -> B -> A (highest priority)

            // Catch-all for airspaces without ICAO class (lowest priority)
            map.current.addLayer({
                id: 'airspace-fill-unclassified',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    [
                        '!',
                        ['in', ['get', 'icao_class'], ['literal', ['a', 'b', 'c', 'd', 'e', 'f', 'g']]],
                    ],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        // If lower limit is above 5000ft or FL50, transparent
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        // Otherwise use type-based color
                        [
                            'match',
                            ['get', 'type'],
                            'danger',
                            'rgba(255, 0, 0, 0.2)',
                            'restricted',
                            'rgba(255, 0, 0, 0.2)',
                            'warning',
                            'rgba(255, 200, 0, 0.2)',
                            'aerial_sporting_recreational',
                            'rgba(255, 200, 0, 0.2)',
                            'rgba(150, 150, 150, 0.1)', // default for other types
                        ],
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-unclassified',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    [
                        '!',
                        ['in', ['get', 'icao_class'], ['literal', ['a', 'b', 'c', 'd', 'e', 'f', 'g']]],
                    ],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        '#ff0000',
                        'restricted',
                        '#ff0000',
                        'warning',
                        '#ffc800',
                        'aerial_sporting_recreational',
                        '#ffc800',
                        '#969696', // default for other types
                    ],
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        'aerial_sporting_recreational',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class G (lowest priority)
            map.current.addLayer({
                id: 'airspace-fill-g',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'g'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        // If lower limit is above 5000ft or FL50, transparent
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        // Otherwise use type-based color
                        [
                            'match',
                            ['get', 'type'],
                            'atz',
                            'rgba(150, 0, 255, 0.25)',
                            'aerodrome_traffic_zone',
                            'rgba(150, 0, 255, 0.25)',
                            'rgba(100, 100, 100, 0.05)', // default Class G color
                        ],
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-g',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'g'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#787878',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class F
            map.current.addLayer({
                id: 'airspace-fill-f',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'f'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        'rgba(100, 100, 100, 0.1)',
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-f',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'f'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#646464',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class E
            map.current.addLayer({
                id: 'airspace-fill-e',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'e'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        'rgba(100, 100, 100, 0.1)',
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-e',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'e'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#646464',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class D
            map.current.addLayer({
                id: 'airspace-fill-d',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'd'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        'rgba(0, 100, 255, 0.15)',
                    ],
                },
            })

            map.current.addLayer({
                id: 'airspace-outline-d',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'd'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#0064ff',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class C
            map.current.addLayer({
                id: 'airspace-fill-c',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'c'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        'rgba(255, 0, 255, 0.15)',
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-c',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'c'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#ff00ff',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class B
            map.current.addLayer({
                id: 'airspace-fill-b',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'b'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        'rgba(0, 0, 255, 0.15)',
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-b',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'b'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#0000ff',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Class A (highest priority)
            map.current.addLayer({
                id: 'airspace-fill-a',
                type: 'fill',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'a'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'fill-color': [
                        'case',
                        [
                            'any',
                            [
                                'all',
                                ['==', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 50],
                            ],
                            [
                                'all',
                                ['!=', ['get', 'lower_limit_unit'], 'FL'],
                                ['>', ['get', 'lower_limit_value'], 5000],
                            ],
                        ],
                        'rgba(0, 0, 0, 0)',
                        'rgba(255, 0, 0, 0.15)',
                    ],
                },
            })
            map.current.addLayer({
                id: 'airspace-outline-a',
                type: 'line',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: [
                    'all',
                    ['==', ['get', 'icao_class'], 'a'],
                    ['!=', ['get', 'type'], 'awy'],
                ],
                paint: {
                    'line-color': '#ff0000',
                    'line-width': 2,
                    'line-dasharray': [
                        'match',
                        ['get', 'type'],
                        'danger',
                        [4, 2],
                        'prohibited',
                        [2, 2],
                        'restricted',
                        [4, 2],
                        'warning',
                        [4, 2],
                        [1],
                    ],
                },
            })

            // Airspace labels
            map.current.addLayer({
                id: 'airspace-labels',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'airspaces',
                filter: ['!=', ['get', 'type'], 'awy'],
                layout: {
                    'text-field': ['get', 'name_label'],
                    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                    'text-size': 10,
                    'symbol-placement': 'point',
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1,
                },
                minzoom: 9,
            })

            // Airport points
            map.current.addLayer({
                id: 'airports',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'airports',
                filter: [
                    'any',
                    [
                        'all',
                        ['!', ['in', 'HELIPORT', ['get', 'name']]],
                        ['!', ['in', 'HELISTOP', ['get', 'name']]],
                    ], // name doesn't contain HELIPORT or HELISTOP
                    ['has', 'icao_code'], // OR has icao_code
                ],
                layout: {
                    'icon-image': 'airport-icon',
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.25, 16, 1.5],
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': false,
                },
            })

            // Airport labels
            map.current.addLayer({
                id: 'airports-labels',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'airports',
                filter: [
                    'any',
                    [
                        'all',
                        ['!', ['in', 'HELIPORT', ['get', 'name']]],
                        ['!', ['in', 'HELISTOP', ['get', 'name']]],
                    ], // name doesn't contain HELIPORT or HELISTOP
                    ['has', 'icao_code'], // OR has icao_code
                ],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 11,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                    'text-allow-overlap': true,
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1.5,
                },
                minzoom: 7,
            })

            // Navaids - using custom icons
            map.current.addLayer({
                id: 'navaids',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'navaids',
                layout: {
                    'icon-image': [
                        'match',
                        ['get', 'type'],
                        ['vor', 'vor_dme', 'vortac', 'tacan'],
                        'vor-icon',
                        'ndb',
                        'ndb-icon',
                        'dme',
                        'dme-icon',
                        'waypoint-icon', // default for waypoints/fixes
                    ],
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 1, 18, 3.5],
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': false,
                },
                minzoom: 8,
            })

            // Navaid labels
            map.current.addLayer({
                id: 'navaids-labels',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'navaids',
                layout: {
                    'text-field': ['get', 'identifier'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 11,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                    'icon-allow-overlap': false,
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1.5,
                },
                minzoom: 9,
            })

            // Click handler to show feature info in panel
            map.current.on('click', e => {
                if (!map.current) return

                // Query OpenAIP features (excluding label layers to avoid duplicates)
                const features = map.current.queryRenderedFeatures(e.point, {
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

                // Debug: log what features were clicked
                console.info('[Click Debug] Features clicked:', features.length)
                features.forEach((f, idx) => {
                    console.info(`[Click Debug] Feature ${idx}:`, {
                        layer: f.layer?.id,
                        sourceLayer: f.sourceLayer,
                        featureType: f.properties?.feature_type,
                        sourceId: f.properties?.source_id,
                        osmId: f.properties?.osm_id,
                        name: f.properties?.name,
                    })
                })

                // Convert features to our data format and deduplicate
                const featureMap = new Map<string, FeatureData>()

                features.forEach(f => {
                    const featureType = f.properties?.feature_type || 'unknown'
                    // Create unique key based on feature type and ID
                    let uniqueKey = ''
                    if (featureType === 'airport') {
                        uniqueKey = `airport-${f.properties?.icao_code || f.properties?.source_id}`
                    } else if (featureType === 'navaid') {
                        uniqueKey = `navaid-${f.properties?.identifier || f.properties?.source_id}`
                    } else if (featureType === 'obstacle') {
                        // Use osm_id first as it's more stable than source_id
                        uniqueKey = `obstacle-${f.properties?.osm_id || f.properties?.source_id}`
                    } else if (featureType === 'reporting_point') {
                        uniqueKey = `reporting_point-${f.properties?.source_id || f.properties?.name}`
                    } else if (featureType === 'airspace') {
                        uniqueKey = `airspace-${f.properties?.source_id || f.properties?.name}`
                    } else {
                        uniqueKey = `${featureType}-${Math.random()}`
                    }

                    console.info(`[Click Debug] Unique key for ${featureType}:`, uniqueKey)

                    if (!featureMap.has(uniqueKey)) {
                        // Extract coordinates for point features
                        const coords =
                            f.geometry && f.geometry.type === 'Point'
                                ? (f.geometry.coordinates as [number, number])
                                : undefined

                        featureMap.set(uniqueKey, {
                            type: featureType,
                            properties: f.properties || {},
                            coordinates: coords,
                        })
                    } else {
                        console.warn('[Click Debug] Duplicate found, skipping:', uniqueKey)
                    }
                })

                const featureData: FeatureData[] = Array.from(featureMap.values())
                console.info('[Click Debug] Final deduplicated features:', featureData.length)

                // Call the callback to update the panel
                onFeaturesClick(featureData)
            })

            // Change cursor on hover for all OpenAIP layers
            map.current.on('mousemove', e => {
                if (!map.current) return
                const features = map.current.queryRenderedFeatures(e.point)
                const hasOpenAIP = features.some(f => f.source === 'openaip')
                map.current.getCanvas().style.cursor = hasOpenAIP ? 'pointer' : ''
            })

            // Obstacles layer
            map.current.addLayer({
                id: 'obstacles',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'obstacles',
                layout: {
                    'icon-image': 'obstacle-icon',
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 18, 0.8],
                    'icon-allow-overlap': true,
                },
                // minzoom: 10,
            })

            // Obstacles labels
            map.current.addLayer({
                id: 'obstacles-labels',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'obstacles',
                layout: {
                    'text-field': ['get', 'name_label'],
                    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                    'text-size': 12,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                },
                paint: {
                    'text-color': '#ff6600',
                    'text-halo-color': '#000000',
                    'text-halo-width': 0.5,
                },
                minzoom: 12,
            })

            // Reporting points layer
            map.current.addLayer({
                id: 'reporting-points',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'reporting_points',
                layout: {
                    'icon-image': 'reporting-point-icon',
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 18, 0.8],
                    'icon-allow-overlap': true,
                },
                minzoom: 9,
            })

            // Reporting points labels
            map.current.addLayer({
                id: 'reporting-points-labels',
                type: 'symbol',
                source: 'openaip',
                'source-layer': 'reporting_points',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                },
                paint: {
                    'text-color': '#666666',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1.5,
                },
                minzoom: 10,
            })

            // Notify parent that map is ready
            if (onMapReady && map.current) {
                onMapReady(map.current)
            }
        })
        }

        return () => {
            console.info('Removing MapBox map instance')
            map.current?.remove()
            map.current = null
        }
    }, [onFeaturesClick, onMapReady])

    // Effect to control layer visibility based on settings
    useEffect(() => {
        if (!map.current) return

        const visibility = (show: boolean) => (show ? 'visible' : 'none')

        // Update obstacles layers visibility
        if (map.current.getLayer('obstacles')) {
            map.current.setLayoutProperty('obstacles', 'visibility', visibility(showObstacles))
        }
        if (map.current.getLayer('obstacles-labels')) {
            map.current.setLayoutProperty(
                'obstacles-labels',
                'visibility',
                visibility(showObstacles),
            )
        }

        // Update reporting points layers visibility
        if (map.current.getLayer('reporting-points')) {
            map.current.setLayoutProperty(
                'reporting-points',
                'visibility',
                visibility(showReportingPoints),
            )
        }
        if (map.current.getLayer('reporting-points-labels')) {
            map.current.setLayoutProperty(
                'reporting-points-labels',
                'visibility',
                visibility(showReportingPoints),
            )
        }
    }, [showObstacles, showReportingPoints])

    // Effect to control airway filtering based on hideAirways setting
    useEffect(() => {
        if (!map.current) return

        console.info('[Airways Filter] Applying hideAirways =', hideAirways)

        // List of all airspace layer IDs
        const airspaceLayers = [
            'airspace-fill-unclassified',
            'airspace-outline-unclassified',
            'airspace-fill-g',
            'airspace-outline-g',
            'airspace-fill-f',
            'airspace-outline-f',
            'airspace-fill-e',
            'airspace-outline-e',
            'airspace-fill-d',
            'airspace-outline-d',
            'airspace-fill-c',
            'airspace-outline-c',
            'airspace-fill-b',
            'airspace-outline-b',
            'airspace-fill-a',
            'airspace-outline-a',
            'airspace-labels',
        ]

        // Update filters for all airspace layers
        airspaceLayers.forEach(layerId => {
            if (map.current && map.current.getLayer(layerId)) {
                const layer = map.current.getLayer(layerId)
                if (!layer) return

                // Build new filter based on hideAirways setting
                let newFilter

                if (layerId === 'airspace-labels') {
                    // For labels layer, simpler filter structure
                    newFilter = hideAirways ? ['!=', ['get', 'type'], 'awy'] : undefined
                } else if (layerId.includes('unclassified')) {
                    // For unclassified layers
                    const baseFilter = [
                        '!',
                        ['in', ['get', 'icao_class'], ['literal', ['a', 'b', 'c', 'd', 'e', 'f', 'g']]],
                    ]
                    newFilter = hideAirways
                        ? ['all', baseFilter, ['!=', ['get', 'type'], 'awy']]
                        : baseFilter
                } else {
                    // For ICAO class-specific layers (a-g)
                    const icaoClass = layerId.match(/-(a|b|c|d|e|f|g)$/)?.[1]
                    if (icaoClass) {
                        const baseFilter = ['==', ['get', 'icao_class'], icaoClass]
                        newFilter = hideAirways
                            ? ['all', baseFilter, ['!=', ['get', 'type'], 'awy']]
                            : baseFilter
                    }
                }

                if (newFilter !== undefined) {
                    console.info('[Airways Filter] Setting filter for', layerId, ':', JSON.stringify(newFilter))
                    map.current.setFilter(layerId, newFilter)
                }
            }
        })
    }, [hideAirways])

    return (
        <div
            ref={mapContainer}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
            }}
        />
    )
}
