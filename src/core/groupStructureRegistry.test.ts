import { describe, expect, it } from 'vitest'

import {
  groupTypeDefinitionById,
  validateGroupTypeDefinition,
} from './groupStructureRegistry'
import { resolveGroupStructureIcon } from './groupStructureIconResolver'

describe('groupStructureRegistry', () => {
  it('valida icon Font Awesome, PNG e none', () => {
    expect(validateGroupTypeDefinition({
      id: 'TestType',
      title: 'Test',
      color: '#80ffe6',
      icon: 'fa-solid fa-sparkles',
      headerSlots: [],
    }).ok).toBe(true)

    expect(validateGroupTypeDefinition({
      id: 'TestType2',
      title: 'Test',
      color: '#80ffe6',
      icon: 'VfxEmitter.png',
      headerSlots: [],
    }).ok).toBe(true)

    const noneResult = validateGroupTypeDefinition({
      id: 'default',
      title: 'default',
      color: '#ffffff',
      icon: 'none',
      headerSlots: [],
    })
    expect(noneResult.ok).toBe(true)
    if (noneResult.ok) {
      expect(noneResult.value.icon).toBeUndefined()
    }
  })

  it('carrega icons dos JSON VFX registados', () => {
    const emitter = groupTypeDefinitionById('VfxEmitterDefinitionData')
    const system = groupTypeDefinitionById('VfxSystemDefinitionData')
    const fallback = groupTypeDefinitionById('default')

    expect(emitter?.icon).toBe('VfxEmitter.png')
    expect(system?.icon).toBe('VfxSystem.png')
    expect(fallback?.icon).toBeUndefined()

    expect(resolveGroupStructureIcon(emitter?.icon).kind).toBe('image')
    expect(resolveGroupStructureIcon(system?.icon).kind).toBe('image')
    expect(resolveGroupStructureIcon(fallback?.icon).kind).toBe('none')
  })
})
