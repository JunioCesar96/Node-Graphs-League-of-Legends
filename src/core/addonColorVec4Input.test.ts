import { describe, expect, it } from 'vitest'

import {
  composeLiteralFromColorPanel,
  formatColorVec4Component,
  hexToRgb01,
  rgb01ToHex,
  syncColorPanelFromLiteral,
} from '@/core/addonColorVec4Input'
import { formatColorVec4Display } from '@/core/colorVec4DisplayFormat'

describe('addonColorVec4Input', () => {
  it('converte hex ↔ rgb 0–1', () => {
    expect(hexToRgb01('#ffffff')).toEqual([1, 1, 1])
    expect(hexToRgb01('#000000')).toEqual([0, 0, 0])
    expect(rgb01ToHex(1, 0, 0)).toBe('#ff0000')
  })

  it('compõe literal vec4 a partir do painel', () => {
    const panel = document.createElement('div')
    panel.innerHTML = `
      <button type="button" data-color-vec4-swatch></button>
      <input type="text" data-color-vec4-alpha value="0.5" />
      <input type="hidden" name="literal" value="1, 0, 0, 1" />
    `

    expect(composeLiteralFromColorPanel(panel)).toBe('1, 0, 0, 0.5')
  })

  it('syncColorPanelFromLiteral actualiza swatch, preview e alpha', () => {
    const panel = document.createElement('div')
    panel.innerHTML = `
      <button type="button" data-color-vec4-swatch></button>
      <input type="range" data-color-vec4-alpha-range value="1" />
      <input type="text" data-color-vec4-alpha value="1" />
      <select data-color-vec4-format>
        <option value="vec4" selected>VEC4</option>
      </select>
      <div data-color-vec4-preview></div>
      <input type="hidden" name="literal" />
    `

    syncColorPanelFromLiteral(panel, '0, 0.5, 1, 0.25')

    expect(panel.querySelector<HTMLInputElement>('[data-color-vec4-alpha]')?.value).toBe('0.25')
    expect(panel.querySelector('[data-color-vec4-preview]')?.textContent).toBe('0, 0.5, 1, 0.25')
    expect(formatColorVec4Component(0.5)).toBe('0.5')
  })
})

describe('colorVec4DisplayFormat', () => {
  it('formata vec4 e hex', () => {
    expect(formatColorVec4Display('vec4', 1, 0, 0, 0.5)).toBe('1, 0, 0, 0.5')
    expect(formatColorVec4Display('hex', 1, 0, 0, 1)).toBe('#FF0000')
  })
})
