import { createPortal } from 'react-dom'
import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

import styles from './BlockCardParameterMenu.module.css'

const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6
const MIN_SPACE_FOR_PANEL_ABOVE = 120

type BlockCardMenuFloatingLayerProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  layerRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
}

export function BlockCardMenuFloatingLayer({
  open,
  anchorRef,
  layerRef,
  children,
}: BlockCardMenuFloatingLayerProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!open) {
      setAnchorRect(null)
      return
    }

    const update = () => {
      const element = anchorRef.current
      if (!element) {
        return
      }
      setAnchorRect(element.getBoundingClientRect())
    }

    update()

    let raf = 0
    const tick = () => {
      update()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef, open])

  if (!open || !anchorRect) {
    return null
  }

  const spaceAbove = anchorRect.top - VIEWPORT_MARGIN
  const openBelow = spaceAbove < MIN_SPACE_FOR_PANEL_ABOVE

  const style: CSSProperties = openBelow
    ? {
        position: 'fixed',
        right: Math.max(VIEWPORT_MARGIN, window.innerWidth - anchorRect.right),
        top: Math.min(
          window.innerHeight - VIEWPORT_MARGIN,
          anchorRect.bottom + ANCHOR_GAP,
        ),
        zIndex: 12000,
        maxHeight: `min(70vh, ${window.innerHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN}px)`,
        overflow: 'auto',
      }
    : {
        position: 'fixed',
        right: Math.max(VIEWPORT_MARGIN, window.innerWidth - anchorRect.right),
        bottom: Math.max(VIEWPORT_MARGIN, window.innerHeight - anchorRect.top + ANCHOR_GAP),
        zIndex: 12000,
        maxHeight: `min(70vh, ${anchorRect.top - ANCHOR_GAP - VIEWPORT_MARGIN}px)`,
        overflow: 'auto',
      }

  return createPortal(
    <div
      ref={layerRef}
      className={styles.floatingLayer}
      data-block-param-menu-portal="1"
      style={style}
    >
      {children}
    </div>,
    document.body,
  )
}
