import { describe, expect, it } from 'vitest'

import {
  canvasNodeHasBlockCode,
  expandBlockTokenToScalarValue,
  expandBlockTokensInScene,
} from './blockRitualExport'
import { VFX_EMITTER_COLOR_TOKEN, makeVfxEmitterCanvasNode, makeVfxEmitterScene } from './blockTestFixtures'

describe('blockRitualExport', () => {
  it('expande token para valor escalar', () => {
    expect(expandBlockTokenToScalarValue(VFX_EMITTER_COLOR_TOKEN)).toBe('0.55,0.95,1,1')
  })

  it('remove tokens da cena para export League bin', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [{ parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN }],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const expanded = expandBlockTokensInScene(scene)
    const value = expanded.nodes[0]?.node.values.find((entry) => entry.parameterId === 'p-color')?.value
    expect(value).toBe('0.55,0.95,1,1')
    expect(value).not.toContain('_blockType&')
  })

  it('detecta nó com código de bloco activo', () => {
    const scene = makeVfxEmitterScene(
      makeVfxEmitterCanvasNode({
        blockViewActive: true,
        blockStructure: {
          blockType: 'VfxEmitterDefinitionData',
          blockName: 'Emitter',
          parameters: [],
          identification_codes: [],
        },
      }),
    )
    expect(canvasNodeHasBlockCode(scene, 'n-vfx')).toBe(true)
  })
})
