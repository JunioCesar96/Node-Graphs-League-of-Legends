import { describe, expect, it } from 'vitest'

import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from '@/core/blockTestFixtures'
import {
  applySceneLabelsToCanvas,
  extractSceneLabelsFromCanvas,
  parseSceneLabels,
} from '@/core/labelScenePersistence'

describe('labelScenePersistence', () => {
  it('faz round-trip de estrutura da label no canvas', () => {
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

    const labelNode = makeVfxEmitterCanvasNode({
      id: 'n-label',
      position: { x: 520, y: 80 },
      labelViewActive: true,
      labelStructure: {
        labelName: 'Label Teste',
        color: '#f5d000',
        parentBlockNodeId: 'n-parent',
        parameters: [
          { parameterId: 'Emitter01' },
          { parameterId: 'Emitter02', hiddenInParent: true },
        ],
      },
    })

    const scene = {
      ...makeVfxEmitterScene(parent),
      nodes: [parent, labelNode],
    }

    const stored = extractSceneLabelsFromCanvas(scene)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      nodeId: 'n-label',
      labelName: 'Label Teste',
      color: '#f5d000',
      parentBlockNodeId: 'n-parent',
      parameters: [
        { parameterId: 'Emitter01' },
        { parameterId: 'Emitter02', hiddenInParent: true },
      ],
    })

    const parsed = parseSceneLabels(stored)
    expect(parsed).not.toBeNull()

    const target = makeVfxEmitterCanvasNode({ id: 'n-label', labelViewActive: true })
    const applied = applySceneLabelsToCanvas(
      { ...makeVfxEmitterScene(parent), nodes: [parent, target] },
      parsed ?? [],
    )
    expect(applied).not.toBeNull()

    const restored = applied?.nodes.find((node) => node.id === 'n-label')
    expect(restored?.labelStructure).toMatchObject({
      labelName: 'Label Teste',
      color: '#f5d000',
      parentBlockNodeId: 'n-parent',
      parameters: [
        { parameterId: 'Emitter01' },
        { parameterId: 'Emitter02', hiddenInParent: true },
      ],
    })
    expect(restored?.labelViewActive).toBe(true)
  })
})
