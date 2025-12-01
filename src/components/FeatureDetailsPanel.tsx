import { CollapsiblePanel } from './CollapsiblePanel'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
}

interface FeatureDetailsPanelProps {
    features: FeatureData[]
    isOpen?: boolean
    onToggle?: (isOpen: boolean) => void
}

export const FeatureDetailsPanel = ({ features, isOpen, onToggle }: FeatureDetailsPanelProps) => {
    if (features.length === 0) {
        return (
            <CollapsiblePanel title="Feature Details" isOpen={isOpen} onToggle={onToggle}>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '8px' }}>
                    <p className="info-text">Click on the map to view feature details</p>
                </div>
            </CollapsiblePanel>
        )
    }

    const airspaces = features.filter(f => f.properties?.feature_type === 'airspace')
    const airports = features.filter(f => f.properties?.feature_type === 'airport')
    const navaids = features.filter(f => f.properties?.feature_type === 'navaid')

    return (
        <CollapsiblePanel title="Feature Details" isOpen={isOpen} onToggle={onToggle}>
            <div
                style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '8px',
                }}
            >
                {/* Airspaces */}
                {airspaces.length > 0 && (
                    <>
                        <strong style={{ fontSize: '14px', color: '#646cff' }}>
                            AIRSPACES ({airspaces.length})
                        </strong>
                        <br />

                        {airspaces.map((feature, index) => {
                            const props = feature.properties || {}
                            return (
                                <div
                                    key={index}
                                    style={{
                                        margin: '8px 0',
                                        padding: '8px',
                                        background: 'rgba(100,100,100,0.1)',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <strong>
                                        Class{' '}
                                        {props.icao_class
                                            ? String(props.icao_class).toUpperCase()
                                            : 'Unknown'}
                                    </strong>
                                    {props.name ? ` - ${String(props.name)}` : ''}
                                    <br />

                                    {props.type ? (
                                        <>
                                            <strong>Type:</strong>{' '}
                                            {String(props.type).toUpperCase()}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.lower_limit_value !== undefined ? (
                                        <>
                                            <strong>Lower:</strong>{' '}
                                            {String(props.lower_limit_value)}{' '}
                                            {String(props.lower_limit_unit)}{' '}
                                            {String(props.lower_limit_reference_datum)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.upper_limit_value !== undefined ? (
                                        <>
                                            <strong>Upper:</strong>{' '}
                                            {String(props.upper_limit_value)}{' '}
                                            {String(props.upper_limit_unit)}{' '}
                                            {String(props.upper_limit_reference_datum)}
                                            <br />
                                        </>
                                    ) : null}

                                    <details style={{ marginTop: '4px' }}>
                                        <summary style={{ cursor: 'pointer', fontSize: '10px' }}>
                                            All Properties
                                        </summary>
                                        <pre
                                            style={{
                                                marginTop: '4px',
                                                fontSize: '9px',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {JSON.stringify(props, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )
                        })}
                    </>
                )}

                {/* Airports */}
                {airports.length > 0 && (
                    <>
                        {airspaces.length > 0 && (
                            <hr
                                style={{
                                    margin: '8px 0',
                                    border: '0',
                                    borderTop: '1px solid #ccc',
                                }}
                            />
                        )}

                        {airports.map((feature, index) => {
                            const props = feature.properties || {}
                            return (
                                <div key={index} style={{ margin: '8px 0' }}>
                                    <strong style={{ fontSize: '14px', color: '#646cff' }}>
                                        AIRPORT
                                    </strong>
                                    <br />

                                    {props.name ? (
                                        <>
                                            <strong>Name:</strong> {String(props.name)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.icao_code ? (
                                        <>
                                            <strong>ICAO:</strong> {String(props.icao_code)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.iata_code ? (
                                        <>
                                            <strong>IATA:</strong> {String(props.iata_code)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.type ? (
                                        <>
                                            <strong>Type:</strong> {String(props.type)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.runway_surface ? (
                                        <>
                                            <strong>Runway:</strong> {String(props.runway_surface)}
                                            <br />
                                        </>
                                    ) : null}

                                    <details>
                                        <summary style={{ cursor: 'pointer', fontSize: '10px' }}>
                                            All Properties
                                        </summary>
                                        <pre
                                            style={{
                                                marginTop: '4px',
                                                fontSize: '9px',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {JSON.stringify(props, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )
                        })}
                    </>
                )}

                {/* Navaids */}
                {navaids.length > 0 && (
                    <>
                        {(airspaces.length > 0 || airports.length > 0) && (
                            <hr
                                style={{
                                    margin: '8px 0',
                                    border: '0',
                                    borderTop: '1px solid #ccc',
                                }}
                            />
                        )}

                        {navaids.map((feature, index) => {
                            const props = feature.properties || {}
                            return (
                                <div key={index} style={{ margin: '8px 0' }}>
                                    <strong style={{ fontSize: '14px', color: '#646cff' }}>
                                        NAVAID
                                    </strong>
                                    <br />

                                    {props.identifier ? (
                                        <>
                                            <strong>Identifier:</strong> {String(props.identifier)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.name ? (
                                        <>
                                            <strong>Name:</strong> {String(props.name)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.type ? (
                                        <>
                                            <strong>Type:</strong> {String(props.type)}
                                            <br />
                                        </>
                                    ) : null}

                                    {props.country ? (
                                        <>
                                            <strong>Country:</strong> {String(props.country)}
                                            <br />
                                        </>
                                    ) : null}

                                    <details>
                                        <summary style={{ cursor: 'pointer', fontSize: '10px' }}>
                                            All Properties
                                        </summary>
                                        <pre
                                            style={{
                                                marginTop: '4px',
                                                fontSize: '9px',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {JSON.stringify(props, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )
                        })}
                    </>
                )}
            </div>
        </CollapsiblePanel>
    )
}
