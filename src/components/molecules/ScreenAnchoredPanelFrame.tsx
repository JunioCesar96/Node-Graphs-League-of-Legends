import type { ReactNode } from 'react'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'

import { BlockCardMenuFloatingLayer } from '@/components/molecules/BlockCardMenuFloatingLayer'

/** @deprecated Use BlockCardMenuFloatingLayer — mantido para compatibilidade. */
type ScreenAnchoredPanelFrameProps = {
  screenAnchor?: CanvasContextMenuAnchor | null
  children: ReactNode
}

export function ScreenAnchoredPanelFrame({
  screenAnchor = null,
  children,
}: ScreenAnchoredPanelFrameProps) {
  return (
    <BlockCardMenuFloatingLayer open screenAnchor={screenAnchor} zIndex={9000}>
      {children}
    </BlockCardMenuFloatingLayer>
  )
}
