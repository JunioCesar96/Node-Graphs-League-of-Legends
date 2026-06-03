import { useCallback, useState, type MouseEvent } from 'react'

import type { Preview3dSpinAxis } from '@/core/vfx/preview3dSpin'

export type VfxPreview3dContextMenuAnchor = {
  x: number
  y: number
}

export function useVfxPreview3dContextMenu() {
  const [spinAxis, setSpinAxis] = useState<Preview3dSpinAxis>(null)
  const [menuAnchor, setMenuAnchor] = useState<VfxPreview3dContextMenuAnchor | null>(null)

  const openMenu = useCallback((event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuAnchor({ x: event.clientX, y: event.clientY })
  }, [])

  const closeMenu = useCallback(() => {
    setMenuAnchor(null)
  }, [])

  const selectAxis = useCallback(
    (axis: Preview3dSpinAxis) => {
      setSpinAxis(axis)
      closeMenu()
    },
    [closeMenu],
  )

  return {
    spinAxis,
    menuAnchor,
    openMenu,
    closeMenu,
    selectAxis,
  }
}
