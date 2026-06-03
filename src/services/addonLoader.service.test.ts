import { describe, expect, it } from 'vitest'

import { AddonLoaderService, normalizeAddonManifest, validateAddonManifest } from '@/services/addonLoader.service'

describe('validateAddonManifest', () => {
  it('aceita manifest válido', () => {
    const raw = {
      id: 'addon-test',
      name: 'Test',
      category: 'Utility',
      drive: 'inputChange',
      get: true,
      set: true,
      data: [{ name: 'text', type: 'string', direction: 'input' }],
    }
    expect(validateAddonManifest(raw)).toBe(true)
  })

  it('aceita manifest da galeria com aparência e slotTip em mapa', () => {
    const raw = {
      id: 'addon-galeria',
      name: '[{0}]',
      category: 'Media',
      drive: ['inputChange{folder-input}', 'buttonClick{loadImages}'],
      headerColor: '#173F73',
      backgroundColor: '#173F73',
      icon: 'public/addons/addon-galeria/assets/icon.png',
      get: true,
      set: true,
      data: [
        {
          name: 'index',
          type: 'number',
          direction: 'input',
          slotTip: { pt: '{7}', en: '{7}' },
        },
      ],
    }
    expect(validateAddonManifest(raw)).toBe(true)
    const normalized = normalizeAddonManifest(raw as never)
    expect(normalized.data[0]?.slotTip).toEqual([{ pt: '{7}', en: '{7}' }])
  })

  it('aceita drive como array de acionamentos', () => {
    const raw = {
      id: 'addon-galeria',
      name: 'Galeria',
      category: 'Media',
      drive: ['inputChange{folder-input}', 'buttonClick{loadImages}', 'inputChange{index-input}'],
      get: true,
      set: true,
      data: [{ name: 'index', type: 'number', direction: 'input' }],
    }
    expect(validateAddonManifest(raw)).toBe(true)
    const normalized = normalizeAddonManifest(raw as never)
    expect(Array.isArray(normalized.drive)).toBe(true)
    expect(normalized.drive).toHaveLength(3)
  })

  it('aceita drive inputChange{id}', () => {
    const raw = {
      id: 'addon-galeria',
      name: 'Galeria',
      category: 'Media',
      drive: 'inputChange{folder-input}',
      get: true,
      set: true,
      data: [{ name: 'index', type: 'number', direction: 'input' }],
    }
    expect(validateAddonManifest(raw)).toBe(true)
    const normalized = normalizeAddonManifest(raw as never)
    expect(normalized.drive).toEqual({ kind: 'inputChange', inputId: 'folder-input' })
  })

  it('aceita drive buttonClick{id}', () => {
    const raw = {
      id: 'addon-galeria',
      name: 'Galeria',
      category: 'Media',
      drive: 'buttonClick{loadImages}',
      get: true,
      set: true,
      data: [{ name: 'index', type: 'number', direction: 'input' }],
    }
    expect(validateAddonManifest(raw)).toBe(true)
    const normalized = normalizeAddonManifest(raw as never)
    expect(normalized.drive).toEqual({ kind: 'buttonClick', buttonId: 'loadImages' })
  })

  it('rejeita drive inválido', () => {
    const raw = {
      id: 'x',
      name: 'X',
      category: 'U',
      drive: 'invalid',
      get: false,
      set: false,
      data: [],
    }
    expect(validateAddonManifest(raw)).toBe(false)
  })

  it('aceita info opcional no manifest', () => {
    const raw = {
      id: 'addon-galeria',
      name: '[{0}]',
      category: 'Media',
      drive: 'always',
      get: true,
      set: true,
      data: [{ name: 'index', type: 'number', direction: 'input' }],
      info: {
        author: 'Autor',
        version: '1.0.0',
        description: '[{23}]',
        tags: ['tag'],
      },
    }
    expect(validateAddonManifest(raw)).toBe(true)
  })

  it('aceita headerColor, icon e slot por entrada', () => {
    const raw = {
      id: 'addon-string-prefix',
      name: 'String Prefix',
      category: 'Utility',
      drive: 'inputChange',
      headerColor: '#000000',
      icon: 'none',
      get: true,
      set: true,
      data: [
        {
          name: 'text',
          type: 'string',
          direction: 'input',
          slot: 'false',
          slotColor: 'default',
          slotTip: [{ pt: 'Dica PT' }, { en: 'Tip EN' }],
        },
        {
          name: 'prefix',
          type: 'string',
          direction: 'input',
          slot: 'true',
          slotColor: 'default',
          slotConnectedColor: '#943ed2',
        },
        { name: 'result', type: 'string', direction: 'output', slot: 'true', slotColor: '#ff00ff' },
      ],
    }
    expect(validateAddonManifest(raw)).toBe(true)
    const normalized = normalizeAddonManifest(raw as never)
    expect(normalized.data[0]?.slot).toBe(false)
    expect(normalized.data[1]?.slot).toBe(true)
    expect(normalized.data[1]?.slotConnectedColor).toBe('#943ed2')
    expect(normalized.data[2]?.slotColor).toBe('#ff00ff')
  })
})
