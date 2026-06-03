import { describe, expect, it } from 'vitest'

import {
  canvasNodeHasGroupCode,
  expandGroupTokenToScalarValue,
  expandGroupTokensInScene,
  syncGroupStructureTokensInScene,
} from './groupRitualExport'
import {
  VFX_EMITTER_COLOR_TOKEN,
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from './groupTestFixtures'

describe('GroupRitualExport', () => {
  it('expande token para valor escalar', () => {
    expect(expandGroupTokenToScalarValue(VFX_EMITTER_COLOR_TOKEN)).toBe('0.55,0.95,1,1')
  })

  it('remove tokens da cena para export League bin', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      groupViewActive: true,
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [{ parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN }],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const expanded = expandGroupTokensInScene(scene)
    const value = expanded.nodes[0]?.node.values.find((entry) => entry.parameterId === 'p-color')?.value
    expect(value).toBe('0.55,0.95,1,1')
    expect(value).not.toContain('_groupType&')
  })

  it('reaplica tokens a partir de groupStructure para «Ver código de grupo»', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      groupViewActive: true,
      groupStructure: {
        groupType: 'VfxEmitterDefinitionData',
        groupName: 'Emitter',
        parameters: vfxEmitterSampleParameters.slice(0, 1),
        identification_codes: [],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const synced = syncGroupStructureTokensInScene(scene)
    const value = synced.nodes[0]?.node.values.find((entry) => entry.parameterId === 'p-color')?.value
    expect(value).toContain('_groupType&')
    expect(value).toContain('_endParameter')
  })

  it('detecta nó com código de Grupo activo', () => {
    const scene = makeVfxEmitterScene(
      makeVfxEmitterCanvasNode({
        groupViewActive: true,
        groupStructure: {
          groupType: 'VfxEmitterDefinitionData',
          groupName: 'Emitter',
          parameters: [],
          identification_codes: [],
        },
      }),
    )
    expect(canvasNodeHasGroupCode(scene, 'n-vfx')).toBe(true)
  })
})
