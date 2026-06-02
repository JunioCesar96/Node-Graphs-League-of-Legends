import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import styles from './CanvasToolbarToolSlot.module.css'

type CanvasToolbarToolSlotProps = {
  label: string
  children: ReactNode
  className?: string
  /** `above` centra o rótulo acima do botão; `below` abaixo (barra embutida nas abas). */
  placement?: 'above' | 'below'
}

export function CanvasToolbarToolSlot({
  label,
  children,
  className = '',
  placement = 'above',
}: CanvasToolbarToolSlotProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  const syncCoords = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) {
      return
    }

    const rect = anchor.getBoundingClientRect()
    setCoords({
      x: rect.left + rect.width / 2,
      y: placement === 'below' ? rect.bottom + 8 : rect.top - 8,
    })
  }, [placement])

  const show = useCallback(() => {
    syncCoords()
    setVisible(true)
  }, [syncCoords])

  const hide = useCallback(() => {
    setVisible(false)
  }, [])

  useEffect(() => {
    if (!visible) {
      return
    }

    syncCoords()
    window.addEventListener('scroll', syncCoords, true)
    window.addEventListener('resize', syncCoords)

    return () => {
      window.removeEventListener('scroll', syncCoords, true)
      window.removeEventListener('resize', syncCoords)
    }
  }, [syncCoords, visible])

  const tooltip =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.tooltip}
            role="tooltip"
            style={{
              left: coords.x,
              top: coords.y,
              transform: placement === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            }}
          >
            {label}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        className={[styles.slot, className].filter(Boolean).join(' ')}
        onBlur={hide}
        onFocus={show}
        onMouseEnter={show}
        onMouseLeave={hide}
        ref={anchorRef}
      >
        {children}
      </div>
      {tooltip}
    </>
  )
}
