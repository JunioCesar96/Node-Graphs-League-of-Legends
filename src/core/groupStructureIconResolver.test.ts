import { describe, expect, it } from 'vitest'

import {
  isGroupStructureIconEmpty,
  resolveGroupStructureIcon,
} from './groupStructureIconResolver'

describe('groupStructureIconResolver', () => {
  it('trata none como sem ícone', () => {
    expect(isGroupStructureIconEmpty('none')).toBe(true)
    expect(resolveGroupStructureIcon('none')).toEqual({ kind: 'none' })
  })

  it('interpreta Font Awesome', () => {
    expect(resolveGroupStructureIcon('fa-solid fa-sparkles')).toEqual({
      kind: 'fontawesome',
      className: 'fa-solid fa-sparkles',
    })
  })

  it('resolve PNG pedido via SVG em groupStructures/icons/', () => {
    const resolved = resolveGroupStructureIcon('VfxEmitter.png')
    expect(resolved.kind).toBe('image')
    if (resolved.kind === 'image') {
      expect(resolved.url.length).toBeGreaterThan(0)
      expect(resolved.alt).toBe('VfxEmitter.png')
    }
  })
})
