import { describe, expect, it } from 'vitest'

import {
  composeLiteralFromMtx44Panel,
  MTX44_IDENTITY_LITERAL,
  parseMtx44LiteralComponents,
  syncAddonMtx44GridFromLiteral,
} from '@/core/addonMtx44Input'

describe('addonMtx44Input', () => {
  it('parseMtx44LiteralComponents lê 16 floats', () => {
    expect(parseMtx44LiteralComponents(MTX44_IDENTITY_LITERAL)).toHaveLength(16)
    expect(parseMtx44LiteralComponents(MTX44_IDENTITY_LITERAL)[0]).toBe('1')
    expect(parseMtx44LiteralComponents(MTX44_IDENTITY_LITERAL)[15]).toBe('1')
  })

  it('composeLiteralFromMtx44Panel junta células em literal', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div data-addon-mtx44-panel>
        <input type="hidden" name="literal" />
        ${Array.from({ length: 16 }, (_, index) => `<input class="addon-mtx44-cell-input" value="${index}" />`).join('')}
      </div>
    `
    const panel = root.querySelector('[data-addon-mtx44-panel]') as HTMLElement
    expect(composeLiteralFromMtx44Panel(panel)).toBe(
      Array.from({ length: 16 }, (_, index) => String(index)).join(', '),
    )
  })

  it('syncAddonMtx44GridFromLiteral preenche a grelha', () => {
    const cardDOM = document.createElement('div')
    cardDOM.innerHTML = `
      <div data-addon-mtx44-panel>
        <input type="hidden" name="literal" value="0" />
        ${Array.from({ length: 16 }, () => '<input class="addon-mtx44-cell-input" value="0" />').join('')}
      </div>
    `
    syncAddonMtx44GridFromLiteral(cardDOM, '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1')
    const cells = [...cardDOM.querySelectorAll<HTMLInputElement>('.addon-mtx44-cell-input')]
    expect(cells[0]?.value).toBe('1')
    expect(cells[5]?.value).toBe('1')
    expect(cells[1]?.value).toBe('0')
  })
})
