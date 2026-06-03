import { describe, expect, it } from 'vitest'

import { computeContextMenuPlacement, computeDockedPanelPlacement } from './contextMenuPlacement'

describe('computeContextMenuPlacement', () => {
  it('quadrante superior esquerdo: abre para baixo e direita', () => {
    const placement = computeContextMenuPlacement(100, 100, 180, 120, 0)
    expect(placement.expandDown).toBe(true)
    expect(placement.expandRight).toBe(true)
    expect(placement.x).toBe(100)
    expect(placement.y).toBe(100)
  })

  it('quadrante inferior direito: abre para cima e esquerda', () => {
    const vw = 800
    const vh = 600
    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: vw })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh })

    const placement = computeContextMenuPlacement(600, 500, 180, 120, 0)
    expect(placement.expandDown).toBe(false)
    expect(placement.expandRight).toBe(false)
    expect(placement.x).toBe(420)
    expect(placement.y).toBe(380)

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
  })

  it('inspetor acoplado: abre abaixo do ícone à direita', () => {
    const vw = 1200
    const vh = 800
    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: vw })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh })

    const docked = computeDockedPanelPlacement(
      { left: 900, top: 12, right: 936, bottom: 48, width: 36, height: 36 },
      380,
      320,
      16,
      8,
    )

    expect(docked.expandDown).toBe(true)
    expect(docked.expandRight).toBe(false)
    expect(docked.y).toBe(56)
    expect(docked.x).toBeLessThanOrEqual(900)

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
  })
})
