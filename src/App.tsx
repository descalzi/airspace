import { useState, useCallback, useRef, useEffect } from 'react'
import './App.css'
import { MapBox } from './components/MapBox'
import { AirspacesDetailsPanel } from './components/AirspacesDetailsPanel'
import { AirportsDetailsPanel } from './components/AirportsDetailsPanel'
import { NavaidsDetailsPanel } from './components/NavaidsDetailsPanel'
import { ObstaclesDetailsPanel } from './components/ObstaclesDetailsPanel'
import { ReportingPointsDetailsPanel } from './components/ReportingPointsDetailsPanel'
import { AboutDialog } from './components/AboutDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { SearchBox } from './components/SearchBox'
import { WeatherPanel } from './components/WeatherPanel'
import { NotamPanel } from './components/NotamPanel'
import { FavouritesDropdown } from './components/FavouritesDropdown'
import { useSettings } from './hooks/useSettings'
import type { Map } from 'mapbox-gl'

interface FeatureData {
    type: string
    properties: Record<string, unknown>
    coordinates?: [number, number]
}

interface MetarData {
    rawOb: string
    obsTime: number
}

interface WeatherData {
    icaoCode: string
    airportName: string
    metarData: MetarData
}

interface NotamData {
    icaoCode: string
    airportName: string
    countryName: string
}

function App() {
    const [airspaces, setAirspaces] = useState<FeatureData[]>([])
    const [airports, setAirports] = useState<FeatureData[]>([])
    const [navaids, setNavaids] = useState<FeatureData[]>([])
    const [obstacles, setObstacles] = useState<FeatureData[]>([])
    const [reportingPoints, setReportingPoints] = useState<FeatureData[]>([])

    const [isAirspacesOpen, setIsAirspacesOpen] = useState(false)
    const [isAirportsOpen, setIsAirportsOpen] = useState(false)
    const [isNavaidsOpen, setIsNavaidsOpen] = useState(false)
    const [isObstaclesOpen, setIsObstaclesOpen] = useState(false)
    const [isReportingPointsOpen, setIsReportingPointsOpen] = useState(false)
    const [isAboutOpen, setIsAboutOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
    const weatherDataRef = useRef<WeatherData | null>(null)

    const [notamData, setNotamData] = useState<NotamData | null>(null)
    const notamDataRef = useRef<NotamData | null>(null)

    const [mapInstance, setMapInstance] = useState<Map | null>(null)

    const {
        settings,
        updateSettings,
        resetSettings,
        addFavourite,
        removeFavourite,
        isFavourite,
        clearAllFavourites,
        hideNotam,
        isNotamHidden,
        clearAllHiddenNotams,
    } = useSettings()

    // Keep refs in sync with state
    useEffect(() => {
        weatherDataRef.current = weatherData
    }, [weatherData])

    useEffect(() => {
        notamDataRef.current = notamData
    }, [notamData])

    const handleWeatherOpen = useCallback((data: WeatherData) => {
        setWeatherData(data)
        setNotamData(null) // Close NOTAMs when opening weather
    }, [])

    const handleWeatherClose = useCallback(() => {
        setWeatherData(null)
    }, [])

    const handleNotamOpen = useCallback((data: NotamData) => {
        setNotamData(data)
        setWeatherData(null) // Close weather when opening NOTAMs
    }, [])

    const handleNotamClose = useCallback(() => {
        setNotamData(null)
    }, [])

    const handleFeaturesClick = useCallback((features: FeatureData[]) => {
        // Debug: log all features to see what we're getting
        console.info('[App Debug] Features received:', features)
        features.forEach((f, idx) => {
            console.info(`[App Debug] Feature ${idx}:`, {
                type: f.type,
                feature_type: f.properties?.feature_type,
                name: f.properties?.name,
            })
        })

        // Separate features by type
        const airspaceFeatures = features.filter(f => f.properties?.feature_type === 'airspace')
        const airportFeatures = features.filter(f => f.properties?.feature_type === 'airport')
        const navaidFeatures = features.filter(f => f.properties?.feature_type === 'navaid')
        const obstacleFeatures = features.filter(f => f.properties?.feature_type === 'obstacle')
        const reportingPointFeatures = features.filter(
            f => f.properties?.feature_type === 'reportingPoint',
        )

        console.info('[App Debug] Reporting point features found:', reportingPointFeatures.length)

        // Update state
        setAirspaces(airspaceFeatures)
        setAirports(airportFeatures)
        setNavaids(navaidFeatures)
        setObstacles(obstacleFeatures)
        setReportingPoints(reportingPointFeatures)

        // Automatically open panels that have features
        setIsAirspacesOpen(airspaceFeatures.length > 0)
        setIsAirportsOpen(airportFeatures.length > 0)
        setIsNavaidsOpen(navaidFeatures.length > 0)
        setIsObstaclesOpen(obstacleFeatures.length > 0)
        setIsReportingPointsOpen(reportingPointFeatures.length > 0)

        // Close weather and NOTAM panels when clicking elsewhere
        // Use refs to avoid dependency on state
        if (weatherDataRef.current !== null) {
            setWeatherData(null)
        }
        if (notamDataRef.current !== null) {
            setNotamData(null)
        }
    }, [])

    return (
        <div className="app">
            <div className="app-header">
                <div className="app-header-left">
                    <img src="./logo.png" alt="Airspace Logo" className="app-logo" />
                    <h1 className="app-title">
                        <span>Air</span>space
                    </h1>
                </div>
                <div className="app-header-right">
                    <SearchBox
                        map={mapInstance}
                        onFeatureSelect={handleFeaturesClick}
                        isFavourite={isFavourite}
                    />
                    <FavouritesDropdown
                        map={mapInstance}
                        favourites={settings.favourites}
                        onFeatureSelect={handleFeaturesClick}
                        removeFavourite={removeFavourite}
                    />
                    <button className="header-button" onClick={() => setIsSettingsOpen(true)}>
                        Settings
                    </button>
                    <button className="header-button" onClick={() => setIsAboutOpen(true)}>
                        About
                    </button>
                </div>
            </div>

            <MapBox
                onFeaturesClick={handleFeaturesClick}
                onMapReady={setMapInstance}
                showObstacles={settings.showObstacles}
                showReportingPoints={settings.showReportingPoints}
                showAirways={settings.showAirways}
            />

            <div className="panels-container">
                <div className="panels-column panels-column-left">
                    <AirportsDetailsPanel
                        airports={airports}
                        isOpen={isAirportsOpen}
                        onToggle={setIsAirportsOpen}
                        runwayLengthUnit={settings.runwayLengthUnit}
                        onWeatherOpen={handleWeatherOpen}
                        onNotamOpen={handleNotamOpen}
                        addFavourite={addFavourite}
                        removeFavourite={removeFavourite}
                        isFavourite={isFavourite}
                    />
                    <NavaidsDetailsPanel
                        navaids={navaids}
                        isOpen={isNavaidsOpen}
                        onToggle={setIsNavaidsOpen}
                        addFavourite={addFavourite}
                        removeFavourite={removeFavourite}
                        isFavourite={isFavourite}
                    />
                    <ObstaclesDetailsPanel
                        obstacles={obstacles}
                        isOpen={isObstaclesOpen}
                        onToggle={setIsObstaclesOpen}
                    />
                    <ReportingPointsDetailsPanel
                        reportingPoints={reportingPoints}
                        isOpen={isReportingPointsOpen}
                        onToggle={setIsReportingPointsOpen}
                        addFavourite={addFavourite}
                        removeFavourite={removeFavourite}
                        isFavourite={isFavourite}
                    />
                    <AirspacesDetailsPanel
                        airspaces={airspaces}
                        isOpen={isAirspacesOpen}
                        onToggle={setIsAirspacesOpen}
                    />
                </div>

                <WeatherPanel
                    icaoCode={weatherData?.icaoCode || null}
                    airportName={weatherData?.airportName || null}
                    metarData={weatherData?.metarData || null}
                    onClose={handleWeatherClose}
                />

                <NotamPanel
                    icaoCode={notamData?.icaoCode || null}
                    airportName={notamData?.airportName || null}
                    countryName={notamData?.countryName || null}
                    onClose={handleNotamClose}
                    hideNotam={hideNotam}
                    isNotamHidden={isNotamHidden}
                    clearAllHiddenNotams={clearAllHiddenNotams}
                    map={mapInstance}
                />
            </div>

            <SettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onUpdateSettings={updateSettings}
                onResetSettings={resetSettings}
                onClearAllFavourites={clearAllFavourites}
                onClearAllHiddenNotams={clearAllHiddenNotams}
            />

            <AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        </div>
    )
}

export default App
