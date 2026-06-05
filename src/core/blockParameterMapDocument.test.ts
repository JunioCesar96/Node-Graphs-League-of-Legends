import { describe, expect, it } from 'vitest'

import {
  buildMapParameterEntriesFromRaw,
  buildMapParameterJsonDocument,
} from './blockParameterMapDocument'
import { synthesizeBlockParameterDocument } from './blockParameterSynthesis'
import { entryWithStructure, formatMapHashEmbedString } from './mapHashEmbedValue'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { NodeSchemaDefinition } from './nodeSchema'
import { validateBlockParameterDocument } from './blockParameterRegistry'

describe('blockParameterMapDocument', () => {
  it('gera entries com key (path) e target (typeName) para mapHashEmbed', () => {
    const pathKey = 'Characters/Brand/Skins/Skin0/Particles/Brand_Base_E_Conflagration_buf'
    const raw = formatMapHashEmbedString([
      entryWithStructure(pathKey, 'VfxSystemDefinitionData', 'vfx-system-def'),
    ])

    const doc = buildMapParameterJsonDocument({
      blockName: 'Main',
      parameterName: 'entries',
      parameterId: 'main_parameter_entries',
      mapKind: 'mapHashEmbed',
      rawValue: raw,
    })

    expect(doc).toMatchObject({
      id: 'entries_entries_mapHashEmbed',
      block: 'Main',
      parameterName: 'entries',
      name: 'entries',
      type: 'mapHashEmbed',
      mapKind: 'mapHashEmbed',
      entries: [{ key: pathKey, target: 'VfxSystemDefinitionData' }],
      slots: { out: ['VfxSystemDefinitionData'] },
      source: { kind: 'parameter', parameterId: 'main_parameter_entries' },
    })

    const validated = validateBlockParameterDocument(doc)
    expect(validated.ok).toBe(true)
  })

  it('buildMapParameterEntriesFromRaw ignora entradas sem estrutura', () => {
    const raw = '0xabc\t\t\n'
    expect(buildMapParameterEntriesFromRaw('mapHashEmbed', raw)).toEqual([])
  })

  it('synthesizeBlockParameterDocument converte mapHashEmbed do schema', () => {
    const pathKey = 'Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar'
    const raw = formatMapHashEmbedString([
      entryWithStructure(pathKey, 'VfxSystemDefinitionData', 'vfx-system-def'),
    ])

    const mainSchema: NodeSchemaDefinition = {
      id: 'main',
      title: 'Main',
      parameters: [
        {
          id: 'main_parameter_entries',
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: raw,
        },
      ],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const definition: BlockDefinitionJsonDocument = {
      id: 'main_main',
      block: 'main',
      blockName: 'Main',
      type: 'embed',
      name: 'Main',
      source: { kind: 'block', nodeId: 'main' },
      color: '#40ff56',
      headerSlots: [],
      parameters: ['entries'],
    }

    const doc = synthesizeBlockParameterDocument(definition, 'entries', mainSchema)
    expect(doc?.type).toBe('mapHashEmbed')
    if (doc?.type !== 'mapHashEmbed') {
      return
    }
    expect(doc.entries).toEqual([{ key: pathKey, target: 'VfxSystemDefinitionData' }])
    expect(doc.slots.out).toEqual(['VfxSystemDefinitionData'])
  })
})
