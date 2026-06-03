import { describe, expect, it } from 'vitest'

import {
  buildParameterDocumentsFromRitualSchema,
  classifyRitualParameterFromNodeData,
  ritualClassOutSlots,
} from './blockParameterRitualModel'
import type { MutableClassGroupSchema } from './classGroupRitualStackParser'
import { parseClassGroupRitualWithStack } from './classGroupRitualStackParser'
import { entryWithStructure, formatMapHashEmbedString } from './mapHashEmbedValue'

function schemaFromRitual(text: string, rootTitle: string): MutableClassGroupSchema {
  const parse = parseClassGroupRitualWithStack(text)
  const schema = [...parse.registry.values()].find((entry) => entry.title === rootTitle)
  if (!schema) {
    throw new Error(`schema ${rootTitle} not found`)
  }
  return schema
}

describe('blockParameterRitualModel', () => {
  it('classifica escalar simples (i16) com out = tipo', () => {
    const schema = schemaFromRitual(
      `TestBlock {
  pass: i16 = 30
}`,
      'TestBlock',
    )

    const docs = buildParameterDocumentsFromRitualSchema({
      blockName: 'TestBlock',
      nodeId: 'test-block',
      schema,
    })

    expect(classifyRitualParameterFromNodeData('i16')).toBe('simple')
    expect(docs[0]).toMatchObject({
      parameterName: 'pass',
      type: 'i16',
      value: '30',
      slots: { in: ['i16'], out: ['i16'] },
    })
  })

  it('classifica pointer de classe com out = nome do bloco', () => {
    const schema = schemaFromRitual(
      `IntegratedValueColor {
  dynamics: pointer = VfxAnimatedColorVariableData {}
}`,
      'IntegratedValueColor',
    )

    const docs = buildParameterDocumentsFromRitualSchema({
      blockName: 'IntegratedValueColor',
      nodeId: 'integrated-value-color',
      schema,
    })

    const dynamics = docs.find((doc) => doc.parameterName === 'dynamics')
    expect(dynamics).toMatchObject({
      type: 'pointer',
      pointer: 'VfxAnimatedColorVariableData',
      slots: { out: ['VfxAnimatedColorVariableData'] },
    })
    expect(ritualClassOutSlots('VfxAnimatedColorVariableData')).toEqual([
      'VfxAnimatedColorVariableData',
    ])
  })

  it('classifica option composto com out = f32', () => {
    const schema = schemaFromRitual(
      `VfxEmitterDefinitionData {
  particleLinger: option[f32] = {
    2
  }
}`,
      'VfxEmitterDefinitionData',
    )

    const docs = buildParameterDocumentsFromRitualSchema({
      blockName: 'VfxEmitterDefinitionData',
      nodeId: 'vfx-emitter',
      schema,
    })

    expect(classifyRitualParameterFromNodeData('optionF32')).toBe('compound')
    const linger = docs.find((doc) => doc.parameterName === 'particleLinger')
    expect(linger).toMatchObject({
      type: 'optionF32',
      item: '2',
      slots: { out: ['f32'] },
    })
  })

  it('map[hash,embed] serializado usa typeName como target (não entry.target)', () => {
    const mapValue = formatMapHashEmbedString([
      entryWithStructure('0xdeadbeef', 'ValueVector3', 'value-vector3-test'),
    ])

    const schema: MutableClassGroupSchema = {
      id: 'test-map',
      title: 'TestMapBlock',
      parameters: [
        {
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: mapValue,
        },
      ],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const docs = buildParameterDocumentsFromRitualSchema({
      blockName: 'TestMapBlock',
      nodeId: 'test-map-block',
      schema,
    })

    const entriesDoc = docs.find((doc) => doc.parameterName === 'entries')
    expect(entriesDoc?.type).toBe('mapHashEmbed')
    if (entriesDoc?.type !== 'mapHashEmbed') {
      return
    }
    expect(entriesDoc.entries).toEqual([{ key: '0xdeadbeef', target: 'ValueVector3' }])
    expect(entriesDoc.slots.out).toContain('ValueVector3')
  })
})
