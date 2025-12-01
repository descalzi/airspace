import { useState, useEffect } from 'react'
import './CollapsiblePanel.css'

interface CollapsiblePanelProps {
    title: string
    children: React.ReactNode
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    defaultOpen?: boolean
    isOpen?: boolean
    onToggle?: (isOpen: boolean) => void
}

export const CollapsiblePanel = ({
    title,
    children,
    position,
    defaultOpen = false,
    isOpen: controlledIsOpen,
    onToggle,
}: CollapsiblePanelProps) => {
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen)

    // Use controlled state if provided, otherwise use internal state
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

    // Sync internal state when controlled state changes
    useEffect(() => {
        if (controlledIsOpen !== undefined) {
            setInternalIsOpen(controlledIsOpen)
        }
    }, [controlledIsOpen])

    const handleToggle = () => {
        const newState = !isOpen
        setInternalIsOpen(newState)
        onToggle?.(newState)
    }

    return (
        <div className={`collapsible-panel ${position || ''}`}>
            <div className="panel-header" onClick={handleToggle}>
                <h3>{title}</h3>
                <span className={`toggle-icon ${isOpen ? 'open' : ''}`}>{isOpen ? '−' : '+'}</span>
            </div>
            <div className={`panel-content ${isOpen ? 'open' : 'closed'}`}>{children}</div>
        </div>
    )
}
