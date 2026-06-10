import { describe, expect, it } from 'vitest'

import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from '@/core/blockTestFixtures'
import { resolveLabelEffectsForParent } from '@/core/labelParentEffects'
import type { LabelStructurePayload } from '@/core/labelSchema'

function makeLabelNode(
  id: string,
  parentId: string,
  color: string,
  parameters: LabelStructurePayload['parameters'],
) {
  return makeVfxEmitterCanvasNode({
    id,
    position: { x: 520, y: 80 },
    labelViewActive: true,
    labelStructure: {
      labelName: `Label ${id}`,
      color,
      parentBlockNodeId: parentId,
      parameters,
    },
  })
}

describe('labelParentEffects', () => {
  it('agrega highlight por parâmetro e oculta se qualquer label marcar hiddenInParent', () => {
    const parent = makeVfxEmitterCanvasNode({
      id: 'n-parent',
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
      },
    })

    const labelA = makeLabelNode('n-label-a', 'n-parent', '#f5d000', [
      { parameterId: 'Emitter01' },
      { parameterId: 'Emitter02', hiddenInParent: true },
    ])
    const labelB = makeLabelNode('n-label-b', 'n-parent', '#44aaff', [
      { parameterId: 'Emitter02' },
      { parameterId: 'Emitter03', hiddenInParent: true },
    ])

    const scene = {
      ...makeVfxEmitterScene(parent),
      nodes: [parent, labelA, labelB],
    }

    const effects = resolveLabelEffectsForParent(scene, 'n-parent')

    expect(effects.highlighted.get('Emitter01')).toBe('#f5d000')
    expect(effects.highlighted.get('Emitter02')).toBe('#f5d000')
    expect(effects.highlighted.get('Emitter03')).toBe('#44aaff')

    expect(effects.hidden.has('Emitter01')).toBe(false)
    expect(effects.hidden.has('Emitter02')).toBe(true)
    expect(effects.hidden.has('Emitter03')).toBe(true)
  })
})
