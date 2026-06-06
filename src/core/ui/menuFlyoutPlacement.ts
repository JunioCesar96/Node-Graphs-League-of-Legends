import type { CSSProperties } from 'react'

export type MenuFlyoutFlip = {
  flipX: boolean
  flipY: boolean
  maxHeight?: number
}

function overflowForBounds(top: number, height: number, margin: number): number {
  const bottom = top + height
  return Math.max(0, margin - top) + Math.max(0, bottom + margin - window.innerHeight)
}

/** Submenu lateral (abre à direita do item, com fallback à esquerda). */
export function computeSubmenuFlyoutFlip(
  rowRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  flyoutWidth: number,
  flyoutHeight: number,
  margin = 8,
): MenuFlyoutFlip {
  const openRightLeft = rowRect.right
  const openLeftLeft = rowRect.left - flyoutWidth
  const flipX = openRightLeft + flyoutWidth + margin > window.innerWidth && openLeftLeft >= margin

  const topDefault = rowRect.top
  const topFlipped = rowRect.bottom - flyoutHeight
  const flipY = overflowForBounds(topFlipped, flyoutHeight, margin) < overflowForBounds(topDefault, flyoutHeight, margin)

  const maxHeight = flipY
    ? Math.max(140, rowRect.bottom - margin)
    : Math.max(140, window.innerHeight - rowRect.top - margin)

  return { flipX, flipY, maxHeight }
}

/** Posição fixa no viewport — evita clipping/scroll em dropdowns pai. */
export function buildSubmenuFlyoutStyle(
  rowRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  flyoutWidth: number,
  flyoutHeight: number,
  margin = 8,
): CSSProperties {
  const flip = computeSubmenuFlyoutFlip(rowRect, flyoutWidth, flyoutHeight, margin)
  const left = flip.flipX ? rowRect.left - flyoutWidth : rowRect.right
  const top = flip.flipY ? rowRect.bottom - flyoutHeight : rowRect.top
  const needsScroll = Boolean(flip.maxHeight && flyoutHeight > flip.maxHeight)

  return {
    position: 'fixed',
    top: `${Math.max(margin, top)}px`,
    left: `${Math.max(margin, left)}px`,
    zIndex: 10001,
    ...(needsScroll && flip.maxHeight
      ? { maxHeight: `${flip.maxHeight}px`, overflowY: 'auto' as const }
      : {}),
  }
}

/** Dropdown vertical (abre abaixo do trigger, com fallback acima). */
export function computeDropdownFlyoutFlip(
  triggerRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  panelWidth: number,
  panelHeight: number,
  margin = 8,
): MenuFlyoutFlip {
  const openRightLeft = triggerRect.left
  const openLeftLeft = triggerRect.right - panelWidth
  const flipX = openRightLeft + panelWidth + margin > window.innerWidth && openLeftLeft >= margin

  const topDown = triggerRect.bottom
  const topUp = triggerRect.top - panelHeight
  const flipY = overflowForBounds(topUp, panelHeight, margin) < overflowForBounds(topDown, panelHeight, margin)

  const maxHeight = flipY
    ? Math.max(140, triggerRect.top - margin)
    : Math.max(140, window.innerHeight - triggerRect.bottom - margin)

  return { flipX, flipY, maxHeight }
}
