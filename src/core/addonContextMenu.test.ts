import { describe, expect, it } from 'vitest'

import type { AddonManifest } from '@/services/addonLoader.service'

import {
  findAddonContextMenuDef,
  normalizeAddonContextMenus,
  preprocessAddonContextMenuRegions,
  resolveAddonContextMenuItems,
} from './addonContextMenu'

const manifest: AddonManifest = {
  id: 'addon-galeria',
  name: 'Galeria',
  category: 'Media',
  drive: 'inputChange',
  get: true,
  set: true,
  data: [],
  cotexMenu: [
    {
      name: 'img',
      options: [
        { name: '[{10}]', action: 'saveImage' },
        { name: '[{11}]', action: 'copyPath' },
      ],
    },
  ],
}

describe('addonContextMenu', () => {
  it('preprocessAddonContextMenuRegions envolve região marcada', () => {
    const html = '<div>{cotexMenu:img}<img name="x" />{/cotexMenu}</div>'
    const out = preprocessAddonContextMenuRegions(html, manifest)
    expect(out).toContain('data-addon-context-menu="img"')
    expect(out).toContain('<img name="x"')
    expect(out).not.toContain('{cotexMenu')
  })

  it('resolveAddonContextMenuItems aplica language pack', () => {
    const menu = findAddonContextMenuDef(manifest, 'img')
    expect(menu).toBeDefined()
    const items = resolveAddonContextMenuItems(menu!, { '10': 'Guardar', '11': 'Copiar caminho' })
    expect(items[0]?.label).toBe('Guardar')
    expect(items[1]?.action).toBe('copyPath')
  })

  it('normalizeAddonContextMenus ignora entradas inválidas', () => {
    const menus = normalizeAddonContextMenus([
      { name: 'a', options: [{ name: 'X', action: 'x' }] },
      { name: '', options: [] },
      null,
    ])
    expect(menus).toHaveLength(1)
    expect(menus[0]?.name).toBe('a')
  })
})
