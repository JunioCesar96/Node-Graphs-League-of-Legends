import { describe, expect, it } from 'vitest'

import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  blockDefinitionLinkDropRank,
  blockDefinitionMatchesExactOutputType,
  blockDefinitionMatchesLinkDrop,
  sortBlockDefinitionsForLinkDrop,
} from './blockDefinitionLinkPalette'

function mockDefinition(
  partial: Pick<BlockDefinitionJsonDocument, 'blockName' | 'name' | 'block' | 'headerSlots'> &
    Partial<BlockDefinitionJsonDocument>,
): BlockDefinitionJsonDocument {
  return {
    id: `${partial.blockName}_${partial.name}`,
    block: partial.block,
    blockName: partial.blockName,
    type: 'pointer',
    name: partial.name,
    source: { kind: 'block', nodeId: 'test-node' },
    color: '#40ff56',
    headerSlots: partial.headerSlots,
    parameters: [],
    ...partial,
  }
}

const VFX_VEC3 = mockDefinition({
  blockName: 'VfxAnimatedVector3fVariableData',
  name: 'VfxAnimatedVector3fVariableData',
  block: 'dynamics',
  headerSlots: ['in[dynamics]', 'out[VfxAnimatedVector3fVariableDataPreview]'],
})

const VFX_COLOR = mockDefinition({
  blockName: 'VfxAnimatedColorVariableData',
  name: 'VfxAnimatedColorVariableData',
  block: 'dynamics',
  headerSlots: ['in[dynamics]', 'out[VfxAnimatedColorVariableDataPreview]'],
})

const VFX_FLOAT = mockDefinition({
  blockName: 'VfxAnimatedFloatVariableData',
  name: 'VfxAnimatedFloatVariableData',
  block: 'dynamics',
  headerSlots: ['in[dynamics]', 'out[VfxAnimatedFloatVariableDataPreview]'],
})

describe('blockDefinitionMatchesLinkDrop', () => {
  const context = {
    fromParameterName: 'dynamics',
    outTypes: ['VfxAnimatedVector3fVariableData'],
  }

  it('inclui blocos com in[campoPai] compatível e o tipo de saída', () => {
    expect(blockDefinitionMatchesLinkDrop(VFX_VEC3, context)).toBe(true)
    expect(blockDefinitionMatchesLinkDrop(VFX_COLOR, context)).toBe(true)
    expect(blockDefinitionMatchesLinkDrop(VFX_FLOAT, context)).toBe(true)
  })

  it('exclui blocos sem entrada IN no cabeçalho', () => {
    const orphan = mockDefinition({
      blockName: 'Orphan',
      name: 'Orphan',
      block: 'dynamics',
      headerSlots: ['out[OrphanPreview]'],
    })
    expect(blockDefinitionMatchesLinkDrop(orphan, context)).toBe(false)
  })
})

describe('sortBlockDefinitionsForLinkDrop', () => {
  it('coloca o bloco com o mesmo nome do tipo de saída no topo', () => {
    const sorted = sortBlockDefinitionsForLinkDrop(
      [VFX_COLOR, VFX_FLOAT, VFX_VEC3],
      { fromParameterName: 'dynamics', outTypes: ['VfxAnimatedVector3fVariableData'] },
    )
    expect(sorted[0]?.blockName).toBe('VfxAnimatedVector3fVariableData')
  })
})

describe('blockDefinitionMatchesExactOutputType', () => {
  it('só é verdadeiro para o bloco com o mesmo nome do tipo de saída', () => {
    const context = { fromParameterName: 'dynamics', outTypes: ['VfxAnimatedVector3fVariableData'] }
    expect(blockDefinitionMatchesExactOutputType(VFX_VEC3, context)).toBe(true)
    expect(blockDefinitionMatchesExactOutputType(VFX_COLOR, context)).toBe(false)
  })
})

describe('blockDefinitionLinkDropRank', () => {
  it('prioriza correspondência exacta do tipo de saída', () => {
    const context = { fromParameterName: 'dynamics', outTypes: ['VfxAnimatedVector3fVariableData'] }
    expect(blockDefinitionLinkDropRank(VFX_VEC3, context)).toBeLessThan(
      blockDefinitionLinkDropRank(VFX_COLOR, context),
    )
  })
})
