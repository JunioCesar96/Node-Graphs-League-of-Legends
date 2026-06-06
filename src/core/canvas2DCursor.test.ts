import { describe, expect, it } from 'vitest'

import {
  CANVAS_2D_CURSOR_RESET_HOLD_MS,
  computePanCenteredOnGraphPoint,
  DEFAULT_CANVAS_2D_CURSOR_POSITION,
} from '@/core/canvas2DCursor'

describe('canvas2DCursor', () => {
  it('inicia no ponto 0,0', () => {
    expect(DEFAULT_CANVAS_2D_CURSOR_POSITION).toEqual({ x: 0, y: 0 })
  })

  it('usa 2 segundos para reset com ctrl+clique direito', () => {
    expect(CANVAS_2D_CURSOR_RESET_HOLD_MS).toBe(2000)
  })

  it('centra a câmera no ponto do cursor 2D', () => {
    expect(computePanCenteredOnGraphPoint({ x: 0, y: 0 }, 800, 600, 1)).toEqual({
      x: 400,
      y: 300,
    })
    expect(computePanCenteredOnGraphPoint({ x: 100, y: 50 }, 800, 600, 2)).toEqual({
      x: 200,
      y: 200,
    })
  })
})
