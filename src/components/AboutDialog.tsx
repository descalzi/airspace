import './AboutDialog.css'

interface AboutDialogProps {
    isOpen: boolean
    onClose: () => void
}

export const AboutDialog = ({ isOpen, onClose }: AboutDialogProps) => {
    if (!isOpen) return null

    return (
        <div className="about-dialog-overlay" onClick={onClose}>
            <div className="about-dialog" onClick={e => e.stopPropagation()}>
                <div className="about-dialog-header">
                    <h2>About Airspace</h2>
                    <button className="about-dialog-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="about-dialog-content">
                    <h3>Data Sources</h3>
                    <div className="data-sources">
                        <div className="data-source">
                            <strong>Map</strong>
                            <a
                                href="https://www.mapbox.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                mapbox.com
                            </a>
                        </div>

                        <div className="data-source">
                            <strong>Airspace Data</strong>
                            <a
                                href="https://www.openaip.net"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                openaip.net
                            </a>
                        </div>

                        <div className="data-source">
                            <strong>Airport Details</strong>
                            <a
                                href="https://airportdb.io"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                airportdb.io
                            </a>
                        </div>

                        <div className="data-source">
                            <strong>METAR</strong>
                            <a
                                href="https://aviationweather.gov"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                aviationweather.gov
                            </a>
                        </div>
                        <div className="data-source">
                            <strong>NOTAMs</strong>
                            <a
                                href="https://notams.aim.faa.gov"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                faa.gov
                            </a>
                        </div>
                    </div>

                    <div className="disclaimer">
                        <strong>Disclaimer:</strong> The usual caveats apply; don't rely on the maps
                        for your flight planning. You must always use official sources. The data
                        presented here carries no guarantee whatsoever as to accuracy.
                    </div>
                </div>

                <div className="about-dialog-footer">Made by Martin</div>
            </div>
        </div>
    )
}
