import { useLayoutEffect, useState, type RefObject } from 'react'

import { computeContextMenuPlacement, type ContextMenuPlacement } from '@/core/ui/contextMenuPlacement'

export function useContextMenuPlacement(
  anchorX: number,
  anchorY: number,
  menuRef: RefObject<HTMLElement | null>,
): ContextMenuPlacement {
  const [placement, setPlacement] = useState(() =>
    computeContextMenuPlacement(anchorX, anchorY, 200, 120),
  )

  useLayoutEffect(() => {
    const element = menuRef.current
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    setPlacement(computeContextMenuPlacement(anchorX, anchorY, rect.width, rect.height))
  }, [anchorX, anchorY, menuRef])

  return placement
}
