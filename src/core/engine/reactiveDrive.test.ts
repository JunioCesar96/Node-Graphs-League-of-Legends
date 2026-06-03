import { describe, expect, it } from 'vitest'

import type { AddonManifest } from '@/services/addonLoader.service'

import {
  applyAddonInputFieldInteraction,
  mergeWiredAndDomAddonInputs,
  syncWiredAddonInputsToDom,
} from './reactiveDrive'

const manifest: AddonManifest = {
  id: 'addon-string-prefix',
  name: 'String Prefix',
  category: 'Utility',
  drive: 'inputChange',
  get: true,
  set: true,
  data: [
    { name: 'text', type: 'string', direction: 'input' },
    { name: 'prefix', type: 'string', direction: 'input' },
    { name: 'result', type: 'string', direction: 'output' },
  ],
}

describe('reactiveDrive', () => {
  it('mergeWiredAndDomAddonInputs usa DOM para slots sem ligação', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <input name="text" value="from-dom-text" />
      <input name="prefix" value="local-prefix" />
    `

    const merged = mergeWiredAndDomAddonInputs(manifest, {}, new Set(), root)
    expect(merged).toEqual({
      text: 'from-dom-text',
      prefix: 'local-prefix',
    })
  })

  it('mergeWiredAndDomAddonInputs prioriza grafo em slots ligados', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <input name="text" value="from-dom" />
      <input name="prefix" value="local" />
    `

    const merged = mergeWiredAndDomAddonInputs(
      manifest,
      { text: 'wired-text' },
      new Set(['text']),
      root,
    )
    expect(merged.text).toBe('wired-text')
    expect(merged.prefix).toBe('local')
  })

  it('syncWiredAddonInputsToDom actualiza só campos ligados', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <input name="text" value="" />
      <input name="prefix" value="keep-me" />
    `

    syncWiredAddonInputsToDom(manifest, { text: 'wired' }, new Set(['text']), root)

    const text = root.querySelector('input[name="text"]')
    const prefix = root.querySelector('input[name="prefix"]')
    expect(text).toBeInstanceOf(HTMLInputElement)
    expect(prefix).toBeInstanceOf(HTMLInputElement)
    expect((text as HTMLInputElement).value).toBe('wired')
    expect((prefix as HTMLInputElement).value).toBe('keep-me')
  })

  it('applyAddonInputFieldInteraction bloqueia só campos ligados', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <input name="text" value="" />
      <input name="prefix" value="editable" />
    `

    applyAddonInputFieldInteraction(manifest, new Set(['text']), root)

    const text = root.querySelector('input[name="text"]') as HTMLInputElement
    const prefix = root.querySelector('input[name="prefix"]') as HTMLInputElement
    expect(text.readOnly).toBe(true)
    expect(text.dataset.addonWired).toBe('1')
    expect(prefix.readOnly).toBe(false)
    expect(prefix.dataset.addonWired).toBe('0')
  })

  it('applyAddonInputFieldInteraction libera campo ao remover ligação', () => {
    const root = document.createElement('div')
    root.innerHTML = `<input name="text" value="was-wired" readonly data-addon-wired="1" />`

    applyAddonInputFieldInteraction(manifest, new Set(), root)

    const text = root.querySelector('input[name="text"]') as HTMLInputElement
    expect(text.readOnly).toBe(false)
    expect(text.dataset.addonWired).toBe('0')
    expect(text.value).toBe('was-wired')
  })
})
