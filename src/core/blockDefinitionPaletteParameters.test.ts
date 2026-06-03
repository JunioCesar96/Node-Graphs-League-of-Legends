import { describe, expect, it } from 'vitest'

import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import { resolveBlockPaletteParameters } from './blockDefinitionPaletteParameters'

const VFX_VEC3_BLOCK: BlockDefinitionJsonDocument = {
  id: 'VfxAnimatedVector3fVariableData_VfxAnimatedVector3fVariableData',
  block: 'dynamics',
  blockName: 'VfxAnimatedVector3fVariableData',
  type: 'pointer',
  name: 'VfxAnimatedVector3fVariableData',
  source: { kind: 'block', nodeId: 'test' },
  color: '#40ff56',
  headerSlots: ['in[dynamics]', 'out[VfxAnimatedVector3fVariableDataPreview]'],
  parameters: ['times', 'values', 'probabilityTables'],
}

describe('resolveBlockPaletteParameters', () => {
  it('resolve tipos de sintaxe a partir do catálogo JSON', () => {
    const entries = resolveBlockPaletteParameters(VFX_VEC3_BLOCK)
    expect(entries.map((entry) => entry.name)).toEqual(['times', 'values', 'probabilityTables'])
    expect(entries.find((entry) => entry.name === 'times')?.dataType).toBe('listF32')
    expect(entries.find((entry) => entry.name === 'values')?.dataType).toBe('listVector3')
    expect(entries.find((entry) => entry.name === 'probabilityTables')?.dataType).toBe('mapHashPointer')
  })
})
