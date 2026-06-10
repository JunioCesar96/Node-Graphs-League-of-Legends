import { describe, expect, it } from 'vitest'

import { ritualJsonTextToCode } from './ritualJsonToCode'
import { codeToBlockScene } from './codeToBlockScene'
import type { NodeSchemaDefinition } from './nodeSchema'

const emitterSchema: NodeSchemaDefinition = {
  id: 'vfx-emitter-json-to-block',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    { id: 'p-name', name: 'emitterName', type: 'string', defaultValue: '' },
    { id: 'p-lifetime', name: 'particleLifetime', type: 'pointer', defaultValue: '' },
  ],
  embed: [],
  pointer: [{ field: 'particleLifetime', schemaId: 'value-float-json-to-block' }],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

const valueFloatSchema: NodeSchemaDefinition = {
  id: 'value-float-json-to-block',
  title: 'ValueFloat',
  parameters: [{ id: 'p-constant', name: 'constantValue', type: 'f32', defaultValue: '0' }],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

const schemaLookup = {
  [emitterSchema.id]: emitterSchema,
  [valueFloatSchema.id]: valueFloatSchema,
}

describe('ritualJsonToCode', () => {
  it('converte JSON ritual em código e gera blocos na cena', () => {
    const json = JSON.stringify({
      type: 'VfxEmitterDefinitionData',
      fields: {
        emitterName: { type: 'string', value: 'Emitter01' },
        particleLifetime: {
          type: 'pointer',
          ref: 'ValueFloat',
          fields: {
            constantValue: { type: 'f32', value: 1.5 },
          },
        },
      },
    })

    const ritual = ritualJsonTextToCode(json)
    expect(ritual).toContain('VfxEmitterDefinitionData {')
    expect(ritual).toContain('emitterName: string = "Emitter01"')
    expect(ritual).toContain('particleLifetime: pointer = ValueFloat {')

    const result = codeToBlockScene(ritual, schemaLookup)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.scene.nodes.filter((node) => node.blockViewActive).length).toBeGreaterThanOrEqual(2)
  })

  it('rejeita JSON sem tipo raiz', () => {
    expect(() => ritualJsonTextToCode('{"fields":{}}')).toThrow(/tipo raiz/i)
  })
})
