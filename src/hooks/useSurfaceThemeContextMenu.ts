import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'

export function useSurfaceThemeContextMenu() {
  const [anchor, setAnchor] = useState<CanvasContextMenuAnchor | null>(null)

  const openSurfaceThemeContextMenu = useCallback((event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setAnchor({ left: event.clientX, top: event.clientY })
  }, [])

  const closeSurfaceThemeContextMenu = useCallback(() => {
    setAnchor(null)
  }, [])

  return {
    surfaceThemeMenuAnchor: anchor,
    openSurfaceThemeContextMenu,
    closeSurfaceThemeContextMenu,
  }
}
