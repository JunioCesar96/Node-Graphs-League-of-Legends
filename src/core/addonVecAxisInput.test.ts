import { describe, expect, it } from 'vitest'

import {
  composeLiteralFromPanel,
  parseLiteralComponents,
  syncAddonVecAxisFromLiteral,
} from '@/core/addonVecAxisInput'

describe('addonVecAxisInput', () => {
  it('parseLiteralComponents separa valores ritual', () => {
    expect(parseLiteralComponents('1, 2, 3', 3)).toEqual(['1', '2', '3'])
    expect(parseLiteralComponents('{ 4, 5, 6 }', 3)).toEqual(['4', '5', '6'])
    expect(parseLiteralComponents('', 2)).toEqual(['0', '0'])
  })

  it('composeLiteralFromPanel junta eixos no formato de saída', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div data-addon-vec-panel>
        <input type="hidden" name="literal" value="0, 0, 0" />
        <input class="addon-vec-axis-input" value="1" />
        <input class="addon-vec-axis-input" value="2" />
        <input class="addon-vec-axis-input" value="3" />
      </div>
    `
    const panel = root.querySelector('[data-addon-vec-panel]') as HTMLElement
    expect(composeLiteralFromPanel(panel)).toBe('1, 2, 3')
  })

  it('syncAddonVecAxisFromLiteral preenche os eixos', () => {
    const cardDOM = document.createElement('div')
    cardDOM.innerHTML = `
      <div data-addon-vec-panel>
        <input type="hidden" name="literal" value="0, 0, 0" />
        <input class="addon-vec-axis-input" value="0" />
        <input class="addon-vec-axis-input" value="0" />
        <input class="addon-vec-axis-input" value="0" />
      </div>
    `
    syncAddonVecAxisFromLiteral(cardDOM, '4, 5, 6')
    const axes = [...cardDOM.querySelectorAll<HTMLInputElement>('.addon-vec-axis-input')]
    expect(axes.map((axis) => axis.value)).toEqual(['4', '5', '6'])
    expect((cardDOM.querySelector('input[name="literal"]') as HTMLInputElement).value).toBe('4, 5, 6')
  })
})
