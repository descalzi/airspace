import { CollapsiblePanel } from './CollapsiblePanel'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
}

interface AirspacesDetailsPanelProps {
    airspaces: FeatureData[]
    isOpen: boolean
    onToggle: (isOpen: boolean) => void
}

// Convert altitude to feet for consistent comparison
const convertToFeet = (value: number, unit: string): number => {
    if (unit === 'FL') {
        return value * 100 // Flight Level to feet
    }
    return value // Assume already in feet
}

// Get color for airspace class (matching MapBox.tsx colors)
const getAirspaceColor = (icaoClass: string, type: string): string => {
    // Check for ATZ first
    if (type === 'atz' || type === 'aerodrome_traffic_zone') {
        return 'rgba(150, 0, 255, 0.6)' // Purple for ATZ
    }

    // Check for danger/restricted/warning
    if (type === 'danger' || type === 'restricted') {
        return 'rgba(255, 0, 0, 0.6)' // Red
    }
    if (type === 'warning' || type === 'aerial_sporting_recreational') {
        return 'rgba(255, 200, 0, 0.6)' // Yellow
    }

    // ICAO class colors
    switch (icaoClass.toLowerCase()) {
        case 'a':
            return 'rgba(255, 0, 0, 0.3)'
        case 'b':
            return 'rgba(0, 0, 255, 0.3)'
        case 'c':
            return 'rgba(255, 0, 255, 0.3)'
        case 'd':
            return 'rgba(0, 100, 255, 0.3)'
        case 'e':
            return 'rgba(100, 100, 100, 0.3)'
        case 'f':
            return 'rgba(100, 100, 100, 0.3)'
        case 'g':
            return 'rgba(100, 100, 100, 0.3)'
        default:
            return 'rgba(150, 150, 150, 0.3)'
    }
}

// Check if two airspaces overlap vertically
const doAirspacesOverlap = (
    a: { lowerFt: number; upperFt: number },
    b: { lowerFt: number; upperFt: number },
): boolean => {
    // Two airspaces overlap if one doesn't end before the other starts
    return !(a.upperFt <= b.lowerFt || b.upperFt <= a.lowerFt)
}

// Assign lanes to airspaces to avoid visual overlap
interface ProcessedAirspace {
    index: number
    name: string
    icaoClass: string
    type: string
    lowerFt: number
    upperFt: number
    lowerDisplay: string
    upperDisplay: string
    properties: Record<string, unknown>
}

interface AirspaceWithLane extends ProcessedAirspace {
    lane: number
}

const assignLanes = (
    airspaces: ProcessedAirspace[],
): { airspacesWithLanes: AirspaceWithLane[]; totalLanes: number } => {
    const lanes: ProcessedAirspace[][] = []
    const airspacesWithLanes: AirspaceWithLane[] = []

    for (const airspace of airspaces) {
        // Find the first lane where this airspace doesn't overlap with any existing airspace
        let assignedLane = -1

        for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
            const lane = lanes[laneIndex]
            const hasOverlap = lane.some(other => doAirspacesOverlap(airspace, other))

            if (!hasOverlap) {
                assignedLane = laneIndex
                break
            }
        }

        // If no suitable lane found, create a new one
        if (assignedLane === -1) {
            assignedLane = lanes.length
            lanes.push([])
        }

        lanes[assignedLane].push(airspace)
        airspacesWithLanes.push({ ...airspace, lane: assignedLane })
    }

    return { airspacesWithLanes, totalLanes: lanes.length }
}

export const AirspacesDetailsPanel = ({
    airspaces,
    isOpen,
    onToggle,
}: AirspacesDetailsPanelProps) => {
    // Don't render if there are no airspaces
    if (airspaces.length === 0) return null

    // Process airspaces for visualization
    const processedAirspaces = airspaces
        .map((feature, index) => {
            const props = feature.properties || {}
            const lowerValue = Number(props.lower_limit_value ?? 0)
            const upperValue = Number(props.upper_limit_value ?? 10000)
            const lowerUnit = String(props.lower_limit_unit || '')
            const upperUnit = String(props.upper_limit_unit || '')

            return {
                index,
                name: String(props.name || ''),
                icaoClass: String(props.icao_class || 'unknown'),
                type: String(props.type || ''),
                lowerFt: convertToFeet(lowerValue, lowerUnit),
                upperFt: convertToFeet(upperValue, upperUnit),
                lowerDisplay: `${lowerValue} ${lowerUnit}`,
                upperDisplay: `${upperValue} ${upperUnit}`,
                properties: props,
            }
        })
        .sort((a, b) => a.lowerFt - b.lowerFt)

    // Assign lanes to avoid visual overlap
    const { airspacesWithLanes } = assignLanes(processedAirspaces)

    // Find the maximum altitude to scale the chart
    const maxAltitude = Math.max(...processedAirspaces.map(a => a.upperFt), 10000)
    const chartHeight = 300 // Total height in pixels

    return (
        <CollapsiblePanel title="Airspace" isOpen={isOpen} onToggle={onToggle}>
            <div
                style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '4px',
                }}
            >
                {/* Visual Chart */}
                <div
                    style={{
                        marginBottom: '16px',
                        padding: '8px',
                        background: 'rgba(30,30,40,0.5)',
                        borderRadius: '4px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            color: '#e0e0e0',
                        }}
                    >
                        Altitude Profile
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Altitude scale */}
                        <div
                            style={{
                                width: '60px',
                                position: 'relative',
                                height: `${chartHeight}px`,
                            }}
                        >
                            {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
                                const altitude = Math.round(maxAltitude * (1 - fraction))
                                const unit =
                                    altitude >= 10000
                                        ? 'FL' + Math.round(altitude / 100)
                                        : altitude + 'ft'
                                return (
                                    <div
                                        key={fraction}
                                        style={{
                                            position: 'absolute',
                                            top: `${fraction * chartHeight}px`,
                                            right: '4px',
                                            fontSize: '10px',
                                            color: '#999',
                                            transform: 'translateY(-50%)',
                                        }}
                                    >
                                        {unit}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Chart bars */}
                        <div
                            style={{
                                flex: 1,
                                position: 'relative',
                                height: `${chartHeight}px`,
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '4px',
                            }}
                        >
                            {airspacesWithLanes.map(airspace => {
                                const topPercent =
                                    ((maxAltitude - airspace.upperFt) / maxAltitude) * 100
                                const bottomPercent =
                                    ((maxAltitude - airspace.lowerFt) / maxAltitude) * 100
                                const heightPercent = bottomPercent - topPercent

                                // Find all airspaces that overlap with this one at this altitude
                                const overlappingAirspaces = airspacesWithLanes.filter(other =>
                                    doAirspacesOverlap(airspace, other),
                                )

                                // Find the active lanes (only count lanes that have overlapping airspaces)
                                const activeLanes = overlappingAirspaces.map(a => a.lane)
                                const maxActiveLane = Math.max(...activeLanes)
                                const numActiveLanes = maxActiveLane + 1

                                // Calculate horizontal position based on active lanes only
                                const laneWidth = 100 / numActiveLanes
                                const leftPercent = airspace.lane * laneWidth
                                const widthPercent = laneWidth

                                return (
                                    <div
                                        key={airspace.index}
                                        style={{
                                            position: 'absolute',
                                            top: `${topPercent}%`,
                                            left: `${leftPercent}%`,
                                            width: `${widthPercent}%`,
                                            height: `${heightPercent}%`,
                                            background: getAirspaceColor(
                                                airspace.icaoClass,
                                                airspace.type,
                                            ),
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            color: '#fff',
                                            textShadow: '0 0 3px #000',
                                            overflow: 'hidden',
                                        }}
                                        title={`${airspace.icaoClass.toUpperCase()} ${airspace.name}\n${airspace.lowerDisplay} - ${airspace.upperDisplay}`}
                                    >
                                        {heightPercent > 8 && (
                                            <span>
                                                {airspace.icaoClass.toLowerCase() === 'unclassified'
                                                    ? airspace.type.toUpperCase()
                                                    : `Class ${airspace.icaoClass.toUpperCase()}${airspace.type && airspace.type.toLowerCase() !== 'other' ? ` (${airspace.type.toUpperCase()})` : ''}`}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Detailed list */}
                {airspacesWithLanes.map(airspace => (
                    <div
                        key={airspace.index}
                        style={{
                            margin: '4px 0',
                            padding: '6px',
                            background: 'rgba(100,100,100,0.1)',
                            borderRadius: '4px',
                        }}
                    >
                        <strong>
                            {airspace.icaoClass.toLowerCase() === 'unclassified'
                                ? airspace.type.toUpperCase()
                                : `Class ${airspace.icaoClass.toUpperCase()}`}
                        </strong>
                        {airspace.name && ` - ${airspace.name}`}
                        <br />
                        {airspace.type &&
                            airspace.icaoClass.toLowerCase() !== 'unclassified' &&
                            airspace.type.toLowerCase() !== 'other' && (
                                <>
                                    <strong>Type:</strong> {airspace.type.toUpperCase()}
                                    <br />
                                </>
                            )}
                        <strong>Lower:</strong> {airspace.lowerDisplay}{' '}
                        {String(airspace.properties.lower_limit_reference_datum || '')}
                        <br />
                        <strong>Upper:</strong> {airspace.upperDisplay}{' '}
                        {String(airspace.properties.upper_limit_reference_datum || '')}
                        <br />
                    </div>
                ))}
            </div>
        </CollapsiblePanel>
    )
}
