import './CollapsiblePanel.css'

interface ClosablePanelProps {
    title: string
    children: React.ReactNode
    isOpen: boolean
    onClose: () => void
}

export const ClosablePanel = ({ title, children, isOpen, onClose }: ClosablePanelProps) => {
    if (!isOpen) return null

    return (
        <div className="collapsible-panel">
            <div className="panel-header">
                <h3>{title}</h3>
                <span className="toggle-icon open" onClick={onClose} style={{ cursor: 'pointer' }}>
                    ✕
                </span>
            </div>
            <div className="panel-content">{children}</div>
        </div>
    )
}
