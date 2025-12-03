import { useState, useEffect } from 'react'
import { NotamDialog } from './NotamDialog'
import type { Map } from 'mapbox-gl'

interface NotamData {
    notamNumber: string
    issueDate: string
    startDate: string
    endDate: string
    traditionalMessageFrom4thWord: string
    icaoMessage: string
    status: string
}

interface NotamPanelProps {
    icaoCode: string | null
    airportName: string | null
    countryName: string | null
    onClose: () => void
    hideNotam: (notamNumber: string) => void
    isNotamHidden: (notamNumber: string) => boolean
    clearAllHiddenNotams: () => void
    map: Map | null
}

export const NotamPanel = ({
    icaoCode,
    airportName,
    countryName,
    onClose,
    hideNotam,
    isNotamHidden,
    clearAllHiddenNotams,
    map,
}: NotamPanelProps) => {
    const [notams, setNotams] = useState<NotamData[] | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch NOTAMs when ICAO code changes
    useEffect(() => {
        if (!icaoCode) {
            setNotams(null)
            setLoading(false)
            setError(null)
            return
        }

        const fetchNotams = async () => {
            setLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams({
                    searchType: '0', // 0 = Location Search
                    designatorsForLocation: icaoCode, // ICAO code
                    notamsOnly: 'false', // Include other notices?
                    radius: '20', // Radius in NM (optional)
                })

                const response = await fetch(
                    'https://corsproxy.io/?https://notams.aim.faa.gov/notamSearch/search',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params.toString(),
                    },
                )

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch NOTAMs: ${response.status} ${response.statusText}`,
                    )
                }

                const data = await response.json()

                // Check if there's an error in the response
                if (data.error && data.error !== '') {
                    throw new Error(data.error)
                }

                // Extract the relevant fields from the response
                if (data.notamList && Array.isArray(data.notamList)) {
                    const parsedNotams: NotamData[] = data.notamList.map(
                        (notam: Record<string, unknown>) => ({
                            notamNumber: String(notam.notamNumber || ''),
                            issueDate: String(notam.issueDate || ''),
                            startDate: String(notam.startDate || ''),
                            endDate: String(notam.endDate || ''),
                            traditionalMessageFrom4thWord: String(
                                notam.traditionalMessageFrom4thWord || '',
                            ),
                            icaoMessage: String(notam.icaoMessage || ''),
                            status: String(notam.status || ''),
                        }),
                    )

                    setNotams(parsedNotams)
                } else {
                    setNotams([])
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error occurred')
                setNotams(null)
            } finally {
                setLoading(false)
            }
        }

        fetchNotams()
    }, [icaoCode])

    const isOpen = icaoCode && airportName

    return (
        <div className={`panels-column-right ${isOpen ? 'open' : 'closed'}`}>
            {isOpen && (
                <NotamDialog
                    onClose={onClose}
                    notams={notams}
                    airportName={airportName}
                    icaoCode={icaoCode}
                    countryName={countryName}
                    loading={loading}
                    error={error}
                    hideNotam={hideNotam}
                    isNotamHidden={isNotamHidden}
                    clearAllHiddenNotams={clearAllHiddenNotams}
                    map={map}
                />
            )}
        </div>
    )
}
