import { useState, useEffect } from 'react'

export type RunwayLengthUnit = 'feet' | 'meters'

export interface Favourite {
    type: 'airport' | 'navaid' | 'obstacle' | 'reporting_point'
    id: string // ICAO code for airports, identifier for navaids, source_id for obstacles/reporting points
    name: string
    coordinates?: [number, number] // Longitude, Latitude
}

export interface Settings {
    runwayLengthUnit: RunwayLengthUnit
    favourites: Favourite[]
    showObstacles: boolean
    showReportingPoints: boolean
    hiddenNotams: string[] // Array of NOTAM numbers that are hidden
}

const DEFAULT_SETTINGS: Settings = {
    runwayLengthUnit: 'meters',
    favourites: [],
    showObstacles: true,
    showReportingPoints: true,
    hiddenNotams: [],
}

const STORAGE_KEY = 'airspace-settings'

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
            }
        } catch (error) {
            console.error('Failed to load settings from localStorage:', error)
        }
        return DEFAULT_SETTINGS
    })

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error)
        }
    }, [settings])

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }))
    }

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS)
    }

    const addFavourite = (favourite: Favourite) => {
        setSettings(prev => ({
            ...prev,
            favourites: [...prev.favourites.filter(f => f.id !== favourite.id), favourite],
        }))
    }

    const removeFavourite = (id: string) => {
        setSettings(prev => ({
            ...prev,
            favourites: prev.favourites.filter(f => f.id !== id),
        }))
    }

    const isFavourite = (id: string): boolean => {
        return settings.favourites.some(f => f.id === id)
    }

    const clearAllFavourites = () => {
        setSettings(prev => ({
            ...prev,
            favourites: [],
        }))
    }

    const hideNotam = (notamNumber: string) => {
        setSettings(prev => ({
            ...prev,
            hiddenNotams: [...new Set([...prev.hiddenNotams, notamNumber])],
        }))
    }

    const unhideNotam = (notamNumber: string) => {
        setSettings(prev => ({
            ...prev,
            hiddenNotams: prev.hiddenNotams.filter(n => n !== notamNumber),
        }))
    }

    const isNotamHidden = (notamNumber: string): boolean => {
        return settings.hiddenNotams.includes(notamNumber)
    }

    const clearAllHiddenNotams = () => {
        setSettings(prev => ({
            ...prev,
            hiddenNotams: [],
        }))
    }

    return {
        settings,
        updateSettings,
        resetSettings,
        addFavourite,
        removeFavourite,
        isFavourite,
        clearAllFavourites,
        hideNotam,
        unhideNotam,
        isNotamHidden,
        clearAllHiddenNotams,
    }
}

// Utility function to convert feet to meters
export const feetToMeters = (feet: number): number => {
    return Math.round(feet * 0.3048)
}

// Utility function to format runway length based on unit preference
export const formatRunwayLength = (lengthFt: string | number, unit: RunwayLengthUnit): string => {
    const feet = typeof lengthFt === 'string' ? parseInt(lengthFt) : lengthFt
    if (isNaN(feet)) return ''

    if (unit === 'meters') {
        return `${feetToMeters(feet)} m`
    }
    return `${feet} ft`
}
