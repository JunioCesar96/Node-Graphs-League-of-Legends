import { describe, expect, it } from 'vitest'

import { parseClassGroupRitualWithStack } from '@/core/classGroupRitualStackParser'

describe('VfxMeshDefinitionData mSubmeshesToDraw', () => {
  it('list[hash] vira parâmetro listHash em embed VfxMeshDefinitionData', () => {
    const text = `
entries: map[hash,embed] = {
  0x1c1ea8de = VfxSystemDefinitionData {
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        Primitive: pointer = VfxPrimitiveMesh {
          mMesh: embed = VfxMeshDefinitionData {
            mMeshName: string = "test.skn"
            mSubmeshesToDraw: list[hash] = {
              "Base_mat"
            }
          }
        }
      }
    }
  }
}
`.trim()

    const parsed = parseClassGroupRitualWithStack(text)
    const mesh = parsed.registry.get('vfx-mesh-definition-data')
    const sub = mesh?.parameters.find((p) => p.name === 'mSubmeshesToDraw')
    expect(sub).toBeDefined()
    expect(sub?.type).toBe('listHash')
    expect(sub?.defaultValue).toBe('Base_mat')
  })
})
