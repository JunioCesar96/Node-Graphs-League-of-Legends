import { describe, expect, it } from 'vitest'

import { codeToBlockScene } from './codeToBlockScene'
import type { NodeSchemaDefinition } from './nodeSchema'

const emitterSchema: NodeSchemaDefinition = {
  id: 'vfx-emitter-code-to-block',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    { id: 'p-name', name: 'emitterName', type: 'string', defaultValue: '' },
  ],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

describe('codeToBlockScene', () => {
  it('converte ritual Class Group em cena com block cards', () => {
    const ritual = `VfxEmitterDefinitionData {
  emitterName: string = "Teste"
}`

    const result = codeToBlockScene(ritual, {
      [emitterSchema.id]: emitterSchema,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.scene.nodes.length).toBeGreaterThan(0)
    const root = result.scene.nodes.find((node) => node.id === result.rootNodeId)
    expect(root?.blockViewActive).toBe(true)
    expect(root?.blockStructure?.blockType).toBe('VfxEmitterDefinitionData')
    const emitterParam = root?.blockStructure?.parameters.find(
      (entry) => entry.nameParameter === 'emitterName',
    )
    expect(emitterParam?.defaultValue).toContain('Teste')
  })

  it('rejeita editor vazio', () => {
    const result = codeToBlockScene('   ', { [emitterSchema.id]: emitterSchema })
    expect(result.ok).toBe(false)
  })
})
