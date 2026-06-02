export type ContextMenuPlacement = {
  x: number
  y: number
  expandDown: boolean
  expandRight: boolean
}

export type DockedPanelPlacement = ContextMenuPlacement & {
  maxHeight: number
}

/** Quadrante da tela: metade superior/inferior × metade esquerda/direita. */
export function computeContextMenuPlacement(
  anchorX: number,
  anchorY: number,
  menuWidth: number,
  menuHeight: number,
  margin = 8,
): ContextMenuPlacement {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const expandDown = anchorY < viewportHeight / 2
  const expandRight = anchorX < viewportWidth / 2

  let x = expandRight ? anchorX : anchorX - menuWidth
  let y = expandDown ? anchorY : anchorY - menuHeight

  x = Math.max(margin, Math.min(x, viewportWidth - menuWidth - margin))
  y = Math.max(margin, Math.min(y, viewportHeight - menuHeight - margin))

  return { x, y, expandDown, expandRight }
}

type RectLike = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>

/** Inspetor acoplado: abre junto ao ícone fixado na toolbar (mesma regra de quadrante). */
export function computeDockedPanelPlacement(
  tabRect: RectLike,
  panelWidth: number,
  estimatedHeight: number,
  margin = 8,
  gap = 8,
): DockedPanelPlacement {
  const centerX = tabRect.left + tabRect.width / 2
  const centerY = tabRect.top + tabRect.height / 2
  const expandDown = centerY < window.innerHeight / 2
  const expandRight = centerX < window.innerWidth / 2

  const anchorX = expandRight ? tabRect.left : tabRect.right
  const anchorY = expandDown ? tabRect.bottom + gap : tabRect.top - gap

  const placement = computeContextMenuPlacement(anchorX, anchorY, panelWidth, estimatedHeight, margin)

  const top = expandDown ? tabRect.bottom + gap : placement.y
  const maxHeight = expandDown
    ? Math.max(160, window.innerHeight - top - margin)
    : Math.max(160, tabRect.top - gap - margin)

  return {
    x: placement.x,
    y: top,
    expandDown: placement.expandDown,
    expandRight: placement.expandRight,
    maxHeight,
  }
}
