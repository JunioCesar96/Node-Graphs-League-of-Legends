import { describe, expect, it } from 'vitest'

import { codeToBlockScene } from './codeToBlockScene'
import { schemaRegistry } from './nodeStructureRegistry'
import { ritualJsonTextToCode } from './ritualJsonToCode'

const SAMPLE_CODE = `# Preview: VfxEmitterDefinitionData
VfxEmitterDefinitionData {
    emitterName: string = "Pillar_bk2"
    alphaRef: u8 = 0
    birthColor: list[embed] = {
        ValueColor {
            constantValue: vec4 = { 0.282, 0.163, 0.156, 1 }
            dynamics: pointer = VfxAnimatedColorVariableData {
                values: list[vec4] = {
                    { 0.282, 0.163, 0.156, 1 }
                    { 0.282, 0.163, 0.156, 1 }
                    { 0.282, 0, 0, 0.522 }
                    { 0.126, 0, 0, 0.098 }
                    { 0.024, 0, 0, 0 }
                }
                times: list[f32] = {
                    0
                    0.255799
                    0.572896
                    0.8
                    1
                }
            }
        }
    }
}
`

describe('ritual JSON round-trip', () => {
  it('reconstrói list[embed] com tipo ValueColor no corpo da lista', async () => {
    const { ritualCodeToJson } = await import('../../public/addons/addon-code-to-json/ritualToJson.js')
    const json = ritualCodeToJson(SAMPLE_CODE)
    const ritual = ritualJsonTextToCode(JSON.stringify(json))

    expect(ritual).toContain('birthColor: list[embed] = {')
    expect(ritual).toContain('ValueColor {')
    expect(ritual).toContain('constantValue: vec4 = {')
    expect(ritual).toContain('dynamics: pointer = VfxAnimatedColorVariableData {')
    expect(ritual).toContain('values: list[vec4] = {')
    expect(ritual).toContain('times: list[f32] = {')
  })

  it('gera a mesma quantidade de blocos que o código ritual original', async () => {
    const { ritualCodeToJson } = await import('../../public/addons/addon-code-to-json/ritualToJson.js')
    const json = ritualCodeToJson(SAMPLE_CODE)
    const ritualFromJson = ritualJsonTextToCode(JSON.stringify(json))

    const direct = codeToBlockScene(SAMPLE_CODE, schemaRegistry)
    const viaJson = codeToBlockScene(ritualFromJson, schemaRegistry)

    expect(direct.ok).toBe(true)
    expect(viaJson.ok).toBe(true)
    if (!direct.ok || !viaJson.ok) {
      return
    }

    const directBlocks = direct.scene.nodes.filter((node) => node.blockViewActive)
    const viaJsonBlocks = viaJson.scene.nodes.filter((node) => node.blockViewActive)
    expect(viaJsonBlocks.length).toBe(directBlocks.length)

    const directTypes = directBlocks
      .map((node) => node.blockStructure?.blockType)
      .filter(Boolean)
      .sort()
    const viaJsonTypes = viaJsonBlocks
      .map((node) => node.blockStructure?.blockType)
      .filter(Boolean)
      .sort()
    expect(viaJsonTypes).toEqual(directTypes)
  })
})
