import { useMemo, useState, useEffect } from 'react'
import './WeatherDialog.css'

interface CloudLayer {
    coverage: string
    altitude: number
    coveragePercent: number
    label: string
}

interface MetarData {
    rawOb: string
    obsTime: number
}

interface TafForecast {
    timeFrom: number
    timeTo: number
    wdir?: number
    wspd?: number
    wgst?: number
    visib?: string
    wxString?: string
    clouds?: Array<{
        cover: string
        base: number
    }>
    fcstChange?: string
}

interface TafData {
    rawTAF: string
    issueTime: number
    fcsts?: TafForecast[]
}

interface WeatherDialogProps {
    onClose: () => void
    metarData: MetarData | null
    tafData: TafData | null
    airportName: string
    icaoCode: string
}

// Parse cloud layers from METAR
const parseCloudLayers = (metar: string): CloudLayer[] => {
    // Split to get main report only (before RMK/TEMPO)
    const mainReport = metar.split(/\s(RMK|TEMPO|BECMG)\s/)[0]
    const cloudMatch = mainReport.match(/(NSC|SKC|CLR|CAVOK|FEW|SCT|BKN|OVC)(\d{3})?(CB|TCU)?/g)
    if (!cloudMatch) return []

    const layers: CloudLayer[] = []
    const coverage: Record<string, { label: string; percent: number }> = {
        NSC: { label: 'No Significant Clouds', percent: 0 },
        SKC: { label: 'Sky Clear', percent: 0 },
        CLR: { label: 'Clear', percent: 0 },
        CAVOK: { label: 'CAVOK', percent: 0 },
        FEW: { label: 'Few', percent: 25 },
        SCT: { label: 'Scattered', percent: 50 },
        BKN: { label: 'Broken', percent: 75 },
        OVC: { label: 'Overcast', percent: 100 },
    }

    cloudMatch.forEach(cloud => {
        const type = cloud.match(/(NSC|SKC|CLR|CAVOK|FEW|SCT|BKN|OVC)/)?.[0] || ''
        const height = cloud.match(/(\d{3})/)?.[0]
        const cbTcu = cloud.match(/(CB|TCU)/)?.[0]

        if (height && type !== 'NSC' && type !== 'SKC' && type !== 'CLR' && type !== 'CAVOK') {
            const label = coverage[type]?.label || type
            const fullLabel = cbTcu ? `${label} ${cbTcu}` : label

            layers.push({
                coverage: type,
                altitude: parseInt(height) * 100,
                coveragePercent: coverage[type]?.percent || 0,
                label: fullLabel,
            })
        }
    })

    return layers.sort((a, b) => a.altitude - b.altitude)
}

// Format TAF timestamp to readable time
const formatTafTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    const day = date.getUTCDate().toString().padStart(2, '0')
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${day}/${hours}:${minutes}Z`
}

// Decode METAR into human-friendly text
const decodeMetar = (metar: string): string => {
    const parts: string[] = []

    // Split METAR into main report and remarks
    const mainParts = metar.split(/\s(RMK|TEMPO|BECMG)\s/)
    const mainReport = mainParts[0]
    const hasRemarks = metar.includes('RMK')
    const hasTempo = metar.includes('TEMPO')

    // 1. Wind information
    const windMatch = mainReport.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT/)
    if (windMatch) {
        const dir = windMatch[1] === 'VRB' ? 'variable' : `${windMatch[1]}°`
        const speed = parseInt(windMatch[2])
        const gust = windMatch[4] ? ` gusting to ${windMatch[4]}` : ''
        parts.push(`Wind from ${dir} at ${speed}${gust} knots`)
    } else if (mainReport.includes('00000KT')) {
        parts.push('Calm winds')
    }

    // Variable wind direction
    const windVarMatch = mainReport.match(/(\d{3})V(\d{3})/)
    if (windVarMatch) {
        parts[parts.length - 1] += `, variable between ${windVarMatch[1]}° and ${windVarMatch[2]}°`
    }

    // 2. Visibility
    const visMatch = mainReport.match(/\s(\d+|\d+\/\d+)?SM/)
    const metricVisMatch = mainReport.match(/\s(\d{4})\s/)
    if (visMatch) {
        const vis = visMatch[1]
        if (!vis || parseInt(vis) >= 10) {
            parts.push('Visibility 10+ statute miles')
        } else {
            parts.push(`Visibility ${vis} statute miles`)
        }
    } else if (metricVisMatch && parseInt(metricVisMatch[1]) >= 9999) {
        parts.push('Visibility 10 km or more')
    } else if (metricVisMatch) {
        parts.push(`Visibility ${parseInt(metricVisMatch[1]) / 1000} km`)
    }

    // 3. Present weather phenomena
    const wxCodes: Record<string, string> = {
        '-': 'Light',
        '+': 'Heavy',
        VC: 'in vicinity',
        MI: 'Shallow',
        BC: 'Patches',
        PR: 'Partial',
        DR: 'Drifting',
        BL: 'Blowing',
        SH: 'Showers',
        TS: 'Thunderstorm',
        FZ: 'Freezing',
        DZ: 'drizzle',
        RA: 'rain',
        SN: 'snow',
        SG: 'snow grains',
        IC: 'ice crystals',
        PL: 'ice pellets',
        GR: 'hail',
        GS: 'small hail',
        BR: 'mist',
        FG: 'fog',
        FU: 'smoke',
        VA: 'volcanic ash',
        DU: 'dust',
        SA: 'sand',
        HZ: 'haze',
        PY: 'spray',
        PO: 'dust/sand whirls',
        SQ: 'squalls',
        FC: 'funnel cloud',
        SS: 'sandstorm',
        DS: 'duststorm',
    }

    const wxMatch = mainReport.match(
        /\s([-+]|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+/g,
    )
    if (wxMatch) {
        const wxDescriptions = wxMatch.map(wx => {
            wx = wx.trim()
            let description = ''

            if (wx.startsWith('-')) {
                description = 'Light '
                wx = wx.substring(1)
            } else if (wx.startsWith('+')) {
                description = 'Heavy '
                wx = wx.substring(1)
            } else if (wx.startsWith('VC')) {
                description = 'Nearby '
                wx = wx.substring(2)
            }

            const descriptorMatch = wx.match(/^(MI|BC|PR|DR|BL|SH|TS|FZ)/)
            if (descriptorMatch) {
                description += wxCodes[descriptorMatch[1]] + ' '
                wx = wx.substring(descriptorMatch[1].length)
            }

            const phenomena = wx.match(
                /(DZ|RA|SN|SG|IC|PL|GR|GS|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)/g,
            )
            if (phenomena) {
                description += phenomena.map(p => wxCodes[p]).join(' and ')
            }

            return description.trim()
        })

        if (wxDescriptions.length > 0) {
            parts.push(wxDescriptions.join('; '))
        }
    }

    // 4. Cloud coverage
    const cloudMatch = mainReport.match(/(NSC|SKC|CLR|CAVOK|FEW|SCT|BKN|OVC)(\d{3})?(CB|TCU)?/g)
    if (cloudMatch && cloudMatch.length > 0) {
        const cloudLayers = cloudMatch
            .map(cloud => {
                const typeMatch = cloud.match(/(NSC|SKC|CLR|CAVOK|FEW|SCT|BKN|OVC)/)
                const heightMatch = cloud.match(/(\d{3})/)
                const cbMatch = cloud.match(/(CB|TCU)/)

                if (!typeMatch) return ''

                const type = typeMatch[0]
                const coverage: Record<string, string> = {
                    NSC: 'No significant clouds',
                    SKC: 'Sky clear',
                    CLR: 'Clear',
                    CAVOK: 'Ceiling and visibility OK',
                    FEW: 'Few clouds',
                    SCT: 'Scattered clouds',
                    BKN: 'Broken clouds',
                    OVC: 'Overcast',
                }

                let desc = coverage[type]
                if (heightMatch) {
                    desc += ` at ${parseInt(heightMatch[1]) * 100} feet`
                }
                if (cbMatch) {
                    desc += cbMatch[1] === 'CB' ? ' (Cumulonimbus)' : ' (Towering Cumulus)'
                }
                return desc
            })
            .filter(d => d)

        if (cloudLayers.length > 0) {
            parts.push(cloudLayers.join(', '))
        }
    }

    // 5. Temperature and dewpoint
    const tempMatch = mainReport.match(/\s(M?\d{2})\/(M?\d{2})(\s|$)/)
    if (tempMatch) {
        const temp = tempMatch[1].replace('M', '-')
        const dewpoint = tempMatch[2].replace('M', '-')
        parts.push(`Temperature ${temp}°C, Dewpoint ${dewpoint}°C`)
    }

    // 6. Altimeter setting
    const altMatch = mainReport.match(/A(\d{4})/)
    const qnhMatch = mainReport.match(/Q(\d{4})/)
    if (altMatch) {
        const alt = altMatch[1]
        const inHg = `${alt.slice(0, 2)}.${alt.slice(2)}`
        parts.push(`Altimeter ${inHg} inHg`)
    } else if (qnhMatch) {
        parts.push(`QNH ${qnhMatch[1]} hPa`)
    }

    // 7. TEMPO (temporary conditions)
    if (hasTempo) {
        const tempoMatch = metar.match(/TEMPO\s+\d+\/\d+\s+(.+?)(?=\s(?:RMK|BECMG|$))/)
        if (tempoMatch) {
            parts.push(`Temporary conditions: ${tempoMatch[1].trim()}`)
        }
    }

    // 8. Remarks
    if (hasRemarks) {
        const remarksMatch = metar.match(/RMK\s+(.+)$/)
        if (remarksMatch) {
            const remarks = remarksMatch[1].trim()
            if (remarks.length < 50) {
                parts.push(`Remarks: ${remarks}`)
            }
        }
    }

    return parts.length > 0 ? parts.join('. ') + '.' : 'Unable to decode METAR'
}

export const WeatherDialog = ({
    onClose,
    metarData,
    tafData,
    airportName,
    icaoCode,
}: WeatherDialogProps) => {
    const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000))

    // Update current time every minute to keep METAR age display fresh
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000))
        }, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [])

    // Memoize expensive cloud parsing operation
    const allCloudLayers = useMemo(
        () => (metarData ? parseCloudLayers(metarData.rawOb) : []),
        [metarData],
    )

    // Memoize altitude calculations
    const { maxAlt, cloudLayers } = useMemo(() => {
        let maxAltitude = 10000 // Default to 10,000 feet
        if (allCloudLayers.length > 0) {
            const highestCloud = Math.max(...allCloudLayers.map(l => l.altitude))
            maxAltitude = highestCloud + 1000 // Highest cloud + 1000 feet
        }

        // Filter clouds to show only those within our max altitude
        const filteredLayers = allCloudLayers.filter(l => l.altitude <= maxAltitude)

        return { maxAlt: maxAltitude, cloudLayers: filteredLayers }
    }, [allCloudLayers])

    // Calculate METAR age
    const ageMinutes = metarData ? Math.floor((currentTime - metarData.obsTime) / 60) : 0
    const isOld = ageMinutes > 30

    if (!metarData) return null

    return (
        <div className="weather-dialog">
            <div className="weather-dialog-header">
                <div>
                    <h3>
                        {airportName} - {icaoCode} - Weather Information
                    </h3>
                </div>
                <button className="weather-dialog-close" onClick={onClose}>
                    ×
                </button>
            </div>

            <div className="weather-dialog-content">
                {/* METAR Section */}
                <div className="weather-section">
                    <div className="weather-section-header">
                        <strong>METAR</strong>
                        <span
                            className={`metar-age ${isOld ? 'old' : ''}`}
                            style={{
                                marginLeft: '8px',
                                fontSize: '11px',
                            }}
                        >
                            ({ageMinutes} min ago{isOld ? ' - OLD' : ''})
                        </span>
                    </div>
                    <div className="metar-raw">{metarData.rawOb}</div>
                </div>

                {/* Decoded Weather Conditions */}
                <div className="weather-section">
                    <strong className="weather-section-header">Weather Conditions</strong>
                    <div className="weather-decoded">{decodeMetar(metarData.rawOb)}</div>
                </div>

                {/* Cloud Layer Chart */}
                <div className="weather-section">
                    <strong className="weather-section-header">Cloud Layers</strong>
                    <div className="cloud-chart">
                        {cloudLayers.length > 0 ? (
                            <>
                                {/* Altitude scale */}
                                <div className="cloud-chart-scale">
                                    <div>
                                        {maxAlt >= 10000
                                            ? `${Math.round(maxAlt / 1000)}k ft`
                                            : `${maxAlt} ft`}
                                    </div>
                                    <div>0 ft</div>
                                </div>

                                {/* Cloud layers */}
                                <div className="cloud-chart-layers">
                                    {cloudLayers.map((layer, idx) => {
                                        const bottomPercent =
                                            maxAlt > 0 ? (layer.altitude / maxAlt) * 100 : 0

                                        const cloudCount =
                                            layer.coveragePercent >= 100
                                                ? 8
                                                : layer.coveragePercent >= 75
                                                  ? 6
                                                  : layer.coveragePercent >= 50
                                                    ? 4
                                                    : 2

                                        return (
                                            <div
                                                key={idx}
                                                className="cloud-layer"
                                                style={{
                                                    bottom: `${bottomPercent}%`,
                                                }}
                                            >
                                                <div className="cloud-icons">
                                                    {Array.from({ length: cloudCount }).map(
                                                        (_, cloudIdx) => (
                                                            <svg
                                                                key={cloudIdx}
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 640 640"
                                                                className="cloud-icon"
                                                            >
                                                                <path d="M112 256C112 167.6 183.6 96 272 96C319.1 96 361.4 116.4 390.7 148.7C401.3 145.6 412.5 144 424 144C490.3 144 544 197.7 544 264C544 277.2 541.9 289.9 537.9 301.8C579.5 322.9 608 366.1 608 416C608 486.7 550.7 544 480 544L176 544C96.5 544 32 479.5 32 400C32 343.2 64.9 294.1 112.7 270.6C112.3 265.8 112 260.9 112 256zM272 144C210.1 144 160 194.1 160 256C160 264.4 160.9 272.6 162.7 280.5C165.4 292.6 158.4 304.8 146.6 308.6C107.9 321 80 357.3 80 400C80 453 123 496 176 496L480 496C524.2 496 560 460.2 560 416C560 378.6 534.3 347.1 499.5 338.4C492 336.5 485.9 331.2 483 324.1C480.1 317 480.9 308.9 485 302.4C492 291.3 496 278.2 496 264.1C496 224.3 463.8 192.1 424 192.1C412.9 192.1 402.5 194.6 393.2 199C382.7 204 370.1 200.7 363.4 191.2C343.1 162.6 309.7 144.1 272.1 144.1z" />
                                                            </svg>
                                                        ),
                                                    )}
                                                </div>
                                                <div className="cloud-label">
                                                    {layer.label} {layer.altitude}'
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="cloud-chart-empty">
                                {(() => {
                                    const metar = metarData.rawOb
                                    if (metar.includes('CAVOK')) return 'Ceiling and Visibility OK'
                                    if (metar.includes('NSC')) return 'No Significant Clouds'
                                    if (metar.includes('SKC')) return 'Sky Clear'
                                    if (metar.includes('CLR')) return 'Clear'
                                    if (allCloudLayers.length > cloudLayers.length) {
                                        return `No clouds below ${maxAlt >= 10000 ? `${Math.round(maxAlt / 1000)}k` : maxAlt} feet`
                                    }
                                    return 'No cloud data available'
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* TAF Section */}
                {tafData && (
                    <>
                        <div className="weather-section">
                            <strong className="weather-section-header">
                                TAF (Terminal Aerodrome Forecast)
                            </strong>
                            <div className="metar-raw">{tafData.rawTAF}</div>
                        </div>

                        {/* Individual TAF Forecasts */}
                        {tafData.fcsts && tafData.fcsts.length > 0 && (
                            <div className="weather-section">
                                <strong className="weather-section-header">Forecast Periods</strong>
                                {tafData.fcsts.map((fcst, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            marginTop: idx > 0 ? '12px' : '8px',
                                            paddingLeft: '8px',
                                            borderLeft: '2px solid rgba(100, 150, 200, 0.3)',
                                        }}
                                    >
                                        {/* Time Range */}
                                        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                                            <strong style={{ color: '#646cff' }}>
                                                {formatTafTime(fcst.timeFrom)} to{' '}
                                                {formatTafTime(fcst.timeTo)}
                                            </strong>
                                            {fcst.fcstChange && (
                                                <span
                                                    style={{
                                                        marginLeft: '8px',
                                                        padding: '2px 6px',
                                                        background: 'rgba(200, 150, 100, 0.3)',
                                                        border: '1px solid rgba(200, 150, 100, 0.5)',
                                                        borderRadius: '3px',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    {fcst.fcstChange}
                                                </span>
                                            )}
                                        </div>

                                        {/* Wind */}
                                        {(fcst.wdir != null || fcst.wspd != null) && (
                                            <div style={{ fontSize: '11px', color: '#e0e0e0' }}>
                                                <strong>Wind:</strong>{' '}
                                                {fcst.wdir != null ? `${fcst.wdir}°` : 'VRB'}
                                                {fcst.wspd != null && ` at ${fcst.wspd} kt`}
                                                {fcst.wgst != null && ` gusting to ${fcst.wgst} kt`}
                                            </div>
                                        )}

                                        {/* Visibility */}
                                        {fcst.visib != null && (
                                            <div style={{ fontSize: '11px', color: '#e0e0e0' }}>
                                                <strong>Visibility:</strong> {fcst.visib}
                                            </div>
                                        )}

                                        {/* Weather */}
                                        {fcst.wxString && (
                                            <div style={{ fontSize: '11px', color: '#e0e0e0' }}>
                                                <strong>Weather:</strong> {fcst.wxString}
                                            </div>
                                        )}

                                        {/* Clouds */}
                                        {fcst.clouds && fcst.clouds.length > 0 && (
                                            <div style={{ fontSize: '11px', color: '#e0e0e0' }}>
                                                <strong>Clouds:</strong>{' '}
                                                {fcst.clouds
                                                    .map(
                                                        cloud =>
                                                            `${cloud.cover} at ${cloud.base} ft`,
                                                    )
                                                    .join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {tafData === null && (
                    <div className="weather-section">
                        <strong className="weather-section-header">
                            TAF (Terminal Aerodrome Forecast)
                        </strong>
                        <div
                            style={{
                                fontSize: '11px',
                                color: '#999',
                                fontStyle: 'italic',
                            }}
                        >
                            No TAF available
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
