import { CollapsiblePanel } from './CollapsiblePanel'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
}

interface ObstaclesDetailsPanelProps {
    obstacles: FeatureData[]
    isOpen: boolean
    onToggle: (isOpen: boolean) => void
}

export const ObstaclesDetailsPanel = ({
    obstacles,
    isOpen,
    onToggle,
}: ObstaclesDetailsPanelProps) => {
    // Don't render if there are no obstacles
    if (obstacles.length === 0) return null

    return (
        <CollapsiblePanel title="Obstacle" isOpen={isOpen} onToggle={onToggle}>
            <div
                style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '4px',
                }}
            >
                {obstacles.map((feature, index) => {
                    const props = feature.properties || {}
                    const name = String(props.name || props.name_label || '')

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
                            {name ? (
                                <>
                                    <strong>Name:</strong> {name}
                                    <br />
                                </>
                            ) : null}

                            {props.type ? (
                                <>
                                    <strong>Type:</strong>{' '}
                                    {String(props.type).toUpperCase().replace(/_/g, ' ')}
                                    <br />
                                </>
                            ) : null}

                            {props.name_label ? (
                                <>
                                    <strong>Info:</strong> {String(props.name_label)}
                                    <br />
                                </>
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </CollapsiblePanel>
    )
}
