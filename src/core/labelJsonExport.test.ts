import { describe, expect, it } from 'vitest'

import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from '@/core/blockTestFixtures'
import { buildLabelJsonExport, serializeLabelJsonExport } from '@/core/labelJsonExport'
import type { LabelStructurePayload } from '@/core/labelSchema'

describe('labelJsonExport', () => {
  it('serializa parâmetros com value e type do bloco pai', () => {
    const parentNode = makeVfxEmitterCanvasNode({
      id: 'n-parent',
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
      },
    })

    const labelStructure: LabelStructurePayload = {
      labelName: 'Label Teste',
      color: '#f5d000',
      parentBlockNodeId: 'n-parent',
      parameters: [
        { parameterId: 'Emitter01' },
        { parameterId: 'Emitter02' },
      ],
    }

    const labelNode = makeVfxEmitterCanvasNode({
      id: 'n-label',
      position: { x: 520, y: 80 },
      labelViewActive: true,
      labelStructure,
    })

    const scene = {
      ...makeVfxEmitterScene(parentNode),
      nodes: [parentNode, labelNode],
    }

    const exported = buildLabelJsonExport(scene, labelNode, labelStructure)
    expect(exported).toEqual({
      color: { value: '0.55,0.95,1,1', type: 'vec4' },
      particleLifetime: { value: '1.15', type: 'f32' },
    })

    const json = serializeLabelJsonExport(exported)
    expect(JSON.parse(json)).toEqual({
      color: { value: '0.55,0.95,1,1', type: 'vec4' },
      particleLifetime: { value: '1.15', type: 'f32' },
    })
  })
})
