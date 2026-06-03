import { describe, expect, it } from 'vitest'

import type { AddonManifest } from '@/services/addonLoader.service'

import {
  applyAddonBodyGridLayout,
  bindAddonHiddenInputSlotAnchors,
  isAddonSlotPinVisible,
  listAddonDockSlots,
  parseInlineAddonSlotNames,
  preprocessAddonUiHtml,
  parseAddonUiRootSize,
  parseCssPxLength,
  resolveAddonSlotPinBorderColor,
  resolveAddonSlotTip,
  splitAddonUiHtmlStyles,
} from './addonUiTemplate'

const manifest: AddonManifest = {
  id: 'addon-string-prefix',
  name: 'String Prefix',
  category: 'Utility',
  drive: 'inputChange',
  get: true,
  set: true,
  headerColor: '#000000',
  icon: 'none',
  data: [
    {
      name: 'text',
      type: 'string',
      direction: 'input',
      slot: false,
      slotTip: [{ pt: 'Ligue uma entrada de texto' }, { en: 'Connect a text input' }],
    },
    {
      name: 'prefix',
      type: 'string',
      direction: 'input',
      slot: true,
      slotColor: 'default',
      slotConnectedColor: '#943ed2',
    },
    { name: 'result', type: 'string', direction: 'output', slot: true, slotColor: '#ff00ff' },
  ],
}

const uiHtml = `<div class="addon-string-prefix-ui"><label>{slot:prefix}<span>Prefix</span>{/slot}<input name="prefix" /></label>
<label>{slot:text}<span>Text</span>{/slot}<input name="text" /></label>
<div class="addon-output-row">{slot:result}<span>Result</span>{/slot}<output name="result"></output></div>
<pre name="console-log" class="addon-console-log"></pre></div>`

describe('addonUiTemplate', () => {
  it('detecta slots inline no ui.html', () => {
    expect([...parseInlineAddonSlotNames(uiHtml)].sort()).toEqual(['prefix', 'result', 'text'])
  })

  it('substitui marcadores por linhas de slot', () => {
    const processed = preprocessAddonUiHtml(uiHtml, manifest)
    expect(processed).toContain('data-addon-slot-line="prefix"')
    expect(processed).toContain('data-addon-slot-line="result"')
    expect(processed).toContain('data-addon-slot-line="text"')
    expect(processed).not.toContain('{slot:')
  })

  it('monta grelha 3 colunas com pinos alinhados às linhas equivalentes', () => {
    const root = document.createElement('div')
    root.innerHTML = preprocessAddonUiHtml(uiHtml, manifest)
    applyAddonBodyGridLayout(root, manifest)

    const grid = root.querySelector('.addon-body-grid')
    expect(grid).not.toBeNull()

    const prefixRow = root.querySelector('[data-addon-grid-row="prefix"]')
    expect(prefixRow?.querySelector('.addon-grid-col--input [data-addon-slot-pin-host="prefix"]')).not.toBeNull()
    expect(prefixRow?.querySelector('.addon-grid-col--output')?.children.length).toBe(0)
    expect(prefixRow?.querySelector('.addon-grid-col--body label')).not.toBeNull()

    const textRow = root.querySelector('[data-addon-grid-row="text"]')
    expect(textRow?.querySelector('.addon-grid-col--input [data-addon-input-slot="text"]')).not.toBeNull()

    const resultRow = root.querySelector('[data-addon-grid-row="result"]')
    expect(resultRow?.querySelector('.addon-grid-col--output [data-addon-slot-pin-host="result"]')).not.toBeNull()
    expect(resultRow?.querySelector('.addon-grid-col--input')?.children.length).toBe(0)
    expect(resultRow?.querySelector('.addon-grid-col--body output')).not.toBeNull()
  })

  it('não lista slots inline no dock', () => {
    expect(listAddonDockSlots(manifest, uiHtml)).toEqual([])
  })

  it('bindAddonHiddenInputSlotAnchors expõe metadados de ligação e tooltip', () => {
    const root = document.createElement('div')
    root.innerHTML = preprocessAddonUiHtml(
      '<div class="addon-string-prefix-ui"><label>{slot:text}<span>Text</span>{/slot}</label></div>',
      manifest,
    )
    applyAddonBodyGridLayout(root, manifest)
    bindAddonHiddenInputSlotAnchors(root, 'addon-1', manifest, 'pt')

    const field = root.querySelector('[data-addon-input-slot="text"]')
    expect(field?.getAttribute('data-addon-slot-id')).toBe('addon:text:input')
    expect(field?.getAttribute('data-addon-slot-node-id')).toBe('addon-1')
    expect(field?.getAttribute('title')).toBe('Ligue uma entrada de texto')
  })

  it('resolve cores e dicas do manifest', () => {
    const prefix = manifest.data[1]!
    const result = manifest.data[2]!
    expect(resolveAddonSlotPinBorderColor(prefix, false)).toBeUndefined()
    expect(resolveAddonSlotPinBorderColor(prefix, true)).toBe('#943ed2')
    expect(resolveAddonSlotPinBorderColor(result, false)).toBe('#ff00ff')
    expect(resolveAddonSlotTip(manifest.data[0]!, 'en')).toBe('Connect a text input')
  })

  it('isAddonSlotPinVisible respeita slot false/string', () => {
    expect(isAddonSlotPinVisible({ name: 'text', type: 'string', direction: 'input', slot: false })).toBe(
      false,
    )
    expect(isAddonSlotPinVisible({ name: 'prefix', type: 'string', direction: 'input', slot: 'true' })).toBe(
      true,
    )
  })

  it('extrai blocos style do ui.html sem perder marcadores de slot', () => {
    const withStyle = `${uiHtml}<style>.addon-output-row { color: #ff00ff; }</style>`
    const split = splitAddonUiHtmlStyles(withStyle)
    expect(split.css).toContain('#ff00ff')
    expect(split.html).not.toContain('<style')
    expect(parseInlineAddonSlotNames(split.html).size).toBe(3)
  })

  it('parseAddonUiRootSize lê width/height da classe raiz do ui', () => {
    const css = `.addon-string-prefix-ui { width: 600px; height: 480px; color: red; }`
    const size = parseAddonUiRootSize(css, 'addon-string-prefix-ui')
    expect(size.width).toBe('600px')
    expect(size.height).toBe('480px')
    expect(parseCssPxLength(size.width)).toBe(600)
  })

  it('applyAddonBodyGridLayout com slot dentro de .slot-label (galeria)', () => {
    const galeriaManifest: AddonManifest = {
      id: 'addon-galeria',
      name: 'Galeria',
      category: 'Media',
      drive: 'inputChange{folder-input}',
      get: true,
      set: true,
      data: [
        { name: 'index', type: 'number', direction: 'input', slot: true },
        { name: 'currentImage', type: 'string', direction: 'output', slot: true },
      ],
    }
    const galeriaUi = `<div class="addon-galeria-ui">
<div class="node-row input-row">
<div class="slot-label">{slot:index}<span>Índice</span>{/slot}</div>
<input name="index" />
</div>
<div class="node-row output-row">
<div class="slot-label right">{slot:currentImage}<span>Imagem</span>{/slot}</div>
</div>
</div>`

    const root = document.createElement('div')
    root.innerHTML = preprocessAddonUiHtml(galeriaUi, galeriaManifest)
    expect(() => applyAddonBodyGridLayout(root, galeriaManifest)).not.toThrow()

    const indexRow = root.querySelector('[data-addon-grid-row="index"]')
    expect(indexRow?.querySelector('[data-addon-slot-pin-host="index"]')).not.toBeNull()
    expect(indexRow?.querySelector('.slot-label span')).not.toBeNull()
  })
})