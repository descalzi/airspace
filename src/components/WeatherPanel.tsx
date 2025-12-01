import { useState, useEffect } from 'react'
import { WeatherDialog } from './WeatherDialog'

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

interface WeatherPanelProps {
    icaoCode: string | null
    airportName: string | null
    metarData: MetarData | null
    onClose: () => void
}

export const WeatherPanel = ({ icaoCode, airportName, metarData, onClose }: WeatherPanelProps) => {
    const [tafData, setTafData] = useState<TafData | null>(null)

    // Fetch TAF when ICAO code changes
    useEffect(() => {
        if (!icaoCode) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTafData(null)
            return
        }

        const fetchTaf = async () => {
            try {
                const tafResponse = await fetch(
                    `https://corsproxy.io/?https://aviationweather.gov/api/data/taf?ids=${icaoCode}&format=json`,
                )

                if (tafResponse.ok) {
                    const tafDataResult = await tafResponse.json()
                    if (tafDataResult && tafDataResult.length > 0 && tafDataResult[0].rawTAF) {
                        setTafData({
                            rawTAF: tafDataResult[0].rawTAF,
                            issueTime: tafDataResult[0].issueTime,
                            fcsts: tafDataResult[0].fcsts || [],
                        })
                    } else {
                        setTafData(null)
                    }
                } else {
                    setTafData(null)
                }
            } catch {
                setTafData(null)
            }
        }

        fetchTaf()
    }, [icaoCode])

    const isOpen = icaoCode && airportName && metarData

    return (
        <div className={`panels-column-right ${isOpen ? 'open' : 'closed'}`}>
            {isOpen && (
                <WeatherDialog
                    onClose={onClose}
                    metarData={metarData}
                    tafData={tafData}
                    airportName={airportName}
                    icaoCode={icaoCode}
                />
            )}
        </div>
    )
}
