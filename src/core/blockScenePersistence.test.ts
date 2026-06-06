import { describe, expect, it } from 'vitest'

import {
  applySceneBlocksToCanvas,
  extractSceneBlocksFromCanvas,
  parseSceneBlocks,
} from '@/core/blockScenePersistence'
import { resolveBlockHeaderSlotsForStructure } from '@/core/blockCardHeaderSlots'
import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from '@/core/blockTestFixtures'

describe('blockScenePersistence', () => {
  it('grava e restaura appearance.headerSlots e slots de parâmetros', () => {
    const blockNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
        appearance: {
          color: '#ff8844',
          headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
        },
      },
    })

    const scene = makeVfxEmitterScene(blockNode)
    const stored = extractSceneBlocksFromCanvas(scene)
    expect(stored).toHaveLength(1)
    expect(stored[0]?.appearance?.headerSlots).toEqual([
      'in[complexEmitterDefinitionData]',
      'out[VfxEmitterDefinitionDataPreview]',
    ])
    expect(stored[0]?.appearance?.color).toBe('#ff8844')
    expect(stored[0]?.parameters[0]?.slots?.out).toContain('vec4')

    const parsed = parseSceneBlocks(stored)
    expect(parsed).not.toBeNull()

    const targetNode = makeVfxEmitterCanvasNode({ blockViewActive: true })
    const applied = applySceneBlocksToCanvas(makeVfxEmitterScene(targetNode), parsed ?? [])
    expect(applied).not.toBeNull()

    const restored = applied?.nodes[0]?.blockStructure
    expect(restored?.appearance?.headerSlots).toEqual([
      'in[complexEmitterDefinitionData]',
      'out[VfxEmitterDefinitionDataPreview]',
    ])
    expect(restored?.appearance?.color).toBe('#ff8844')
    expect(restored?.parameters[0]?.slotRules?.outputs).toContain('vec4')
    expect(resolveBlockHeaderSlotsForStructure(restored!)).toEqual([
      'in[complexEmitterDefinitionData]',
      'out[VfxEmitterDefinitionDataPreview]',
    ])
  })
})
