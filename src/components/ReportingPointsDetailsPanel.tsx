import { CollapsiblePanel } from './CollapsiblePanel'
import type { Favourite } from '../hooks/useSettings'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
    coordinates?: [number, number]
}

interface ReportingPointsDetailsPanelProps {
    reportingPoints: FeatureData[]
    isOpen: boolean
    onToggle: (isOpen: boolean) => void
    addFavourite: (favourite: Favourite) => void
    removeFavourite: (id: string) => void
    isFavourite: (id: string) => boolean
}

export const ReportingPointsDetailsPanel = ({
    reportingPoints,
    isOpen,
    onToggle,
    addFavourite,
    removeFavourite,
    isFavourite,
}: ReportingPointsDetailsPanelProps) => {
    // Don't render if there are no reporting points
    if (reportingPoints.length === 0) return null

    return (
        <CollapsiblePanel title="Reporting Point" isOpen={isOpen} onToggle={onToggle}>
            <div
                style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '4px',
                }}
            >
                {reportingPoints.map((feature, index) => {
                    const props = feature.properties || {}
                    const name = String(props.name || '')
                    const rpId = String(props.source_id || name || index)

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
                            {name && (
                                <>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <div>
                                            <strong>Name:</strong> {name}
                                        </div>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation()
                                                e.currentTarget.blur()
                                                if (isFavourite(rpId)) {
                                                    removeFavourite(rpId)
                                                } else {
                                                    addFavourite({
                                                        type: 'reporting_point',
                                                        id: rpId,
                                                        name: name,
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
                                                isFavourite(rpId)
                                                    ? 'Remove from favourites'
                                                    : 'Add to favourites'
                                            }
                                        >
                                            {isFavourite(rpId) ? (
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
                                    </div>
                                </>
                            )}
                            {props.compulsory !== undefined ? (
                                <>
                                    <strong>Compulsory:</strong> {props.compulsory ? 'Yes' : 'No'}
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
