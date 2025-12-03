import './SettingsDialog.css'
import type { Settings, RunwayLengthUnit } from '../hooks/useSettings'

interface SettingsDialogProps {
    isOpen: boolean
    onClose: () => void
    settings: Settings
    onUpdateSettings: (settings: Partial<Settings>) => void
    onResetSettings: () => void
    onClearAllFavourites: () => void
    onClearAllHiddenNotams: () => void
}

export const SettingsDialog = ({
    isOpen,
    onClose,
    settings,
    onUpdateSettings,
    onResetSettings,
    onClearAllFavourites,
    onClearAllHiddenNotams,
}: SettingsDialogProps) => {
    if (!isOpen) return null

    const handleRunwayUnitChange = (unit: RunwayLengthUnit) => {
        onUpdateSettings({ runwayLengthUnit: unit })
    }

    const handleReset = () => {
        if (confirm('Reset all settings to defaults?')) {
            onResetSettings()
        }
    }

    const handleClearFavourites = () => {
        onClearAllFavourites()
    }

    const handleClearHiddenNotams = () => {
        onClearAllHiddenNotams()
    }

    return (
        <div className="settings-dialog-overlay" onClick={onClose}>
            <div className="settings-dialog" onClick={e => e.stopPropagation()}>
                <div className="settings-dialog-header">
                    <h2>Settings</h2>
                    <button className="settings-dialog-close" onClick={onClose} style={{outline: 'none'}}>
                        ×
                    </button>
                </div>

                <div className="settings-dialog-content">
                    <div className="setting-group">
                        <label className="setting-label">Runway Length Unit</label>
                        <div className="setting-options">
                            <button
                                className={`setting-option ${settings.runwayLengthUnit === 'feet' ? 'active' : ''}`}
                                onClick={() => handleRunwayUnitChange('feet')}
                            >
                                Feet
                            </button>
                            <button
                                className={`setting-option ${settings.runwayLengthUnit === 'meters' ? 'active' : ''}`}
                                onClick={() => handleRunwayUnitChange('meters')}
                            >
                                Meters
                            </button>
                        </div>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Show Obstacles</label>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.showObstacles}
                                onChange={e =>
                                    onUpdateSettings({ showObstacles: e.target.checked })
                                }
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Show Reporting Points</label>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.showReportingPoints}
                                onChange={e =>
                                    onUpdateSettings({ showReportingPoints: e.target.checked })
                                }
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Hide Airways</label>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.hideAirways}
                                onChange={e =>
                                    onUpdateSettings({ hideAirways: e.target.checked })
                                }
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Favourite Airports/Navaids</label>
                        <button
                            className="settings-button"
                            onClick={handleClearFavourites}
                            disabled={settings.favourites.length === 0}
                        >
                            Delete All
                        </button>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">Clear Hidden NOTAMs</label>
                        <button
                            className="settings-button"
                            onClick={handleClearHiddenNotams}
                            disabled={settings.hiddenNotams.length === 0}
                        >
                            Show All
                        </button>
                    </div>
                </div>

                <div className="settings-dialog-footer">
                    <button className="settings-button reset" onClick={handleReset}>
                        Restore Defaults
                    </button>
                </div>
            </div>
        </div>
    )
}
