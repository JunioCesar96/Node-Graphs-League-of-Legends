import { describe, expect, it } from 'vitest'

import {
  canvasGridHexToRgba,
  parseCanvasGridChrome,
  resolveCanvasGridHexColor,
  resolveCanvasGridPresentation,
} from '@/core/canvasGridSettings'

describe('canvasGridSettings', () => {
  it('valida cores hex', () => {
    expect(resolveCanvasGridHexColor('#AbCdEf', '#000000')).toBe('#abcdef')
    expect(resolveCanvasGridHexColor('white', '#000000')).toBe('#000000')
    expect(canvasGridHexToRgba('#ffffff', 0.5)).toBe('rgb(255 255 255 / 0.5)')
  })

  it('persiste apenas valores não predefinidos', () => {
    expect(
      parseCanvasGridChrome({
        canvasGridLineColorEnabled: true,
        canvasGridHorizontalLineColor: '#ff0000',
        canvasGridCheckerEnabled: true,
        canvasGridCheckerColorA: '#111111',
      }),
    ).toEqual({
      canvasGridLineColorEnabled: true,
      canvasGridHorizontalLineColor: '#ff0000',
      canvasGridCheckerEnabled: true,
      canvasGridCheckerColorA: '#111111',
    })
  })

  it('usa tinta do tema quando não há cor personalizada', () => {
    const presentation = resolveCanvasGridPresentation({
      canvasGridOpacity: 10,
      canvasGridLineColorEnabled: true,
      canvasGridCheckerEnabled: true,
    })

    expect(presentation.horizontalLinePaint).toBe(
      'color-mix(in srgb, var(--canvas-grid-theme-line) 10%, transparent)',
    )
    expect(presentation.resolvedCheckerColorA).toBe('var(--canvas-grid-theme-checker-a)')
    expect(presentation.resolvedCheckerColorB).toBe('var(--canvas-grid-theme-checker-b)')
    expect(presentation.canvasGridHorizontalLineColor).toBeUndefined()
  })

  it('usa cor personalizada quando definida na cena', () => {
    const presentation = resolveCanvasGridPresentation({
      canvasGridOpacity: 10,
      canvasGridHorizontalLineColor: '#ff0000',
      canvasGridCheckerColorB: '#123456',
    })

    expect(presentation.horizontalLinePaint).toBe('rgb(255 0 0 / 0.1)')
    expect(presentation.resolvedCheckerColorB).toBe('#123456')
  })
})
