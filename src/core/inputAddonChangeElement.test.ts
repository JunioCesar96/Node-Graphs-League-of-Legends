import { describe, expect, it } from 'vitest'

import {
  DEFAULT_INPUT_ADDON_CHANGE_ID,
  findChangeElement,
  resolveChangeElementId,
} from '@/core/inputAddonChangeElement'

describe('resolveChangeElementId', () => {
  it('usa inputaddon por omissão', () => {
    expect(resolveChangeElementId(undefined)).toBe(DEFAULT_INPUT_ADDON_CHANGE_ID)
    expect(resolveChangeElementId(null)).toBe(DEFAULT_INPUT_ADDON_CHANGE_ID)
    expect(resolveChangeElementId(false)).toBe(DEFAULT_INPUT_ADDON_CHANGE_ID)
    expect(resolveChangeElementId('')).toBe(DEFAULT_INPUT_ADDON_CHANGE_ID)
    expect(resolveChangeElementId('none')).toBe(DEFAULT_INPUT_ADDON_CHANGE_ID)
  })

  it('preserva id explícito', () => {
    expect(resolveChangeElementId('color-swatch')).toBe('color-swatch')
  })
})

describe('findChangeElement', () => {
  it('encontra por id e data-attribute', () => {
    const host = document.createElement('div')
    host.innerHTML = `
      <button id="inputaddon" type="button"></button>
      <span data-inputaddon-change="alt"></span>
    `

    expect(findChangeElement(host, 'inputaddon')?.id).toBe('inputaddon')
    expect(findChangeElement(host, 'alt')?.getAttribute('data-inputaddon-change')).toBe('alt')
  })

  it('retorna null quando id custom não existe', () => {
    const host = document.createElement('div')
    host.innerHTML = `<button id="inputaddon"></button>`
    expect(findChangeElement(host, 'missing')).toBeNull()
  })
})
