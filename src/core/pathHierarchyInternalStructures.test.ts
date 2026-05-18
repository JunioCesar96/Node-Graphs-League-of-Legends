import { describe, expect, it } from 'vitest'

import type { InternalStructureDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  filterInternalStructuresByPathHierarchy,
  internalStructureDisplayNameFromChildSchema,
  internalStructurePathHierarchyLabelFromChildSchema,
  isChildStructureByPathHierarchy,
  isNodeStructurePackSubfolderPath,
  listInternalStructureCandidatesForBase,
  listInternalStructureCandidatesForModuleParent,
  nomenclatureCollectionLevel,
  pathStepsContainCollectionType,
} from '@/core/pathHierarchyInternalStructures'

function stubSchema(
  id: string,
  collection: string,
  steps: { id: string; type: string }[],
  title = id,
): NodeSchemaDefinition {
  return {
    id,
    title,
    parameters: [],
    internalStructures: [],
    nomenclature: {
      group: collection.startsWith('#2') ? '#2 Entidades' : '#3 Internal Structures',
      collection,
      collectionType: title,
      pathHierarchySteps: steps,
    },
  }
}

describe('nomenclatureCollectionLevel', () => {
  it('extrai nível de #N na collection', () => {
    expect(nomenclatureCollectionLevel('#2 Root Entry (VfxSystemDefinitionData)')).toBe(2)
    expect(nomenclatureCollectionLevel('#3 Collection Block')).toBe(3)
  })
})

describe('isChildStructureByPathHierarchy', () => {
  const parent = stubSchema(
    'vfx-system',
    '#2 Root Entry (VfxSystemDefinitionData)',
    [
      { id: 'entries', type: '#1 Root Entry' },
      { id: 'Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar', type: '#2 Root Entry (VfxSystemDefinitionData)' },
    ],
    'VfxSystemDefinitionData',
  )

  const emitterChild = stubSchema(
    'vfx-emitter',
    '#3 Collection Block',
    [
      { id: 'entries', type: '#1 Root Entry' },
      {
        id: 'Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar',
        type: '#2 Root Entry (VfxSystemDefinitionData)',
      },
      { id: 'complexEmitterDefinitionData:0', type: '#3 Collection Block' },
    ],
    'VfxEmitterDefinitionData',
  )

  const embedChild = stubSchema(
    'value-float',
    '#3 Embed Block',
    [
      { id: 'entries', type: '#1 Root Entry' },
      {
        id: 'Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar',
        type: '#2 Root Entry (VfxSystemDefinitionData)',
      },
      { id: 'complexEmitterDefinitionData:0', type: '#3 Collection Block' },
      { id: 'Rate', type: '#3 Embed Block' },
    ],
    'ValueFloat',
  )

  it('VfxSystem #2 → VfxEmitter #3 quando steps do filho contêm collection do pai', () => {
    expect(pathStepsContainCollectionType(emitterChild.nomenclature!.pathHierarchySteps!, parent.nomenclature!.collection!)).toBe(
      true,
    )
    expect(isChildStructureByPathHierarchy(parent, emitterChild)).toBe(true)
  })

  it('embed #3 sob emitter: steps contêm collection do pai imediato', () => {
    expect(isChildStructureByPathHierarchy(emitterChild, embedChild)).toBe(true)
  })

  it('rejeita filho sem step type igual à collection do pai', () => {
    const orphan = stubSchema(
      'orphan',
      '#3 Collection Block',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'other', type: '#2 Root Entry (OtherType)' },
        { id: 'x', type: '#3 Collection Block' },
      ],
    )
    expect(isChildStructureByPathHierarchy(parent, orphan)).toBe(false)
  })

  it('SkinCharacter #2 → embed #3', () => {
    const skin = stubSchema(
      'skin',
      '#2 Root Entry (SkinCharacterDataProperties)',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'Characters/Zac/Skins/Skin0', type: '#2 Root Entry (SkinCharacterDataProperties)' },
      ],
    )
    const audio = stubSchema(
      'audio',
      '#3 Embed Block',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'Characters/Zac/Skins/Skin0', type: '#2 Root Entry (SkinCharacterDataProperties)' },
        { id: 'SkinAudioProperties', type: '#3 Embed Block' },
      ],
      'SkinAudioProperties',
    )
    expect(isChildStructureByPathHierarchy(skin, audio)).toBe(true)
  })
})

describe('isNodeStructurePackSubfolderPath', () => {
  it('subpasta pack_Type sim; raiz do pack não', () => {
    expect(isNodeStructurePackSubfolderPath('teste_ccg/teste_ccg_VfxEmitter/VfxEmitter.json')).toBe(true)
    expect(isNodeStructurePackSubfolderPath('teste_ccg/vfx-system-definition-data.json')).toBe(false)
  })
})

describe('filterInternalStructuresByPathHierarchy', () => {
  const parent = stubSchema(
    'vfx-system',
    '#2 Root Entry (VfxSystemDefinitionData)',
    [
      { id: 'entries', type: '#1 Root Entry' },
      { id: 'K', type: '#2 Root Entry (VfxSystemDefinitionData)' },
    ],
  )

  const catalog: InternalStructureDefinition[] = [
    { id: 'c1', name: 'emitter', schemaId: 'vfx-emitter' },
    { id: 'c2', name: 'wrong', schemaId: 'wrong' },
  ]

  const registry: Record<string, NodeSchemaDefinition> = {
    'vfx-emitter': stubSchema(
      'vfx-emitter',
      '#3 Collection Block',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'K', type: '#2 Root Entry (VfxSystemDefinitionData)' },
        { id: 'complexEmitterDefinitionData:0', type: '#3 Collection Block' },
      ],
    ),
    wrong: stubSchema(
      'wrong',
      '#3 Collection Block',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'other', type: '#2 Root Entry (Other)' },
        { id: 'x', type: '#3 Collection Block' },
      ],
    ),
  }

  const pathById = {
    'vfx-emitter': 'ccg/ccg_VfxEmitter/VfxEmitter.json',
    wrong: 'ccg/wrong-root.json',
    'vfx-root': 'ccg/vfx-system-definition-data.json',
  }

  it('sem nomenclatura no pai, devolve catálogo inalterado', () => {
    const bare: NodeSchemaDefinition = { id: 'b', title: 'B', parameters: [], internalStructures: [] }
    expect(filterInternalStructuresByPathHierarchy(bare, catalog, registry)).toEqual(catalog)
  })

  it('filtra só filhos com pathHierarchy válido em subpasta', () => {
    const out = filterInternalStructuresByPathHierarchy(parent, catalog, registry, pathById)
    expect(out.map((x) => x.schemaId)).toEqual(['vfx-emitter'])
  })

  it('ignora candidatos na pasta mãe do pack (raiz)', () => {
    const cat: InternalStructureDefinition[] = [
      { id: 'r', name: 'root', schemaId: 'vfx-root' },
      { id: 'e', name: 'emitter', schemaId: 'vfx-emitter' },
    ]
    const reg: Record<string, NodeSchemaDefinition> = {
      'vfx-root': stubSchema(
        'vfx-root',
        '#2 Root Entry (VfxSystemDefinitionData)',
        [
          { id: 'entries', type: '#1 Root Entry' },
          { id: 'K', type: '#2 Root Entry (VfxSystemDefinitionData)' },
        ],
      ),
      'vfx-emitter': registry['vfx-emitter']!,
    }
    const out = filterInternalStructuresByPathHierarchy(parent, cat, reg, pathById)
    expect(out.map((x) => x.schemaId)).toEqual(['vfx-emitter'])
  })
})

describe('internalStructureDisplayNameFromChildSchema', () => {
  it('usa title/id do schema base, nao o ultimo pathHierarchySteps.id', () => {
    const child = stubSchema(
      'SequencerClipData',
      '#3 Collection Block',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },
        { id: 'Idle1', type: '#3 Collection Block' },
      ],
      'SequencerClipData',
    )
    expect(internalStructureDisplayNameFromChildSchema(child)).toBe('SequencerClipData')
    expect(internalStructurePathHierarchyLabelFromChildSchema(child)).toBe('Idle1')
  })
})

describe('listInternalStructureCandidatesForBase', () => {
  it('lista candidatos do registo pelo mesmo critério', () => {
    const parent = stubSchema(
      'vfx-system',
      '#2 Root Entry (VfxSystemDefinitionData)',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'K', type: '#2 Root Entry (VfxSystemDefinitionData)' },
      ],
    )
    const registry: Record<string, NodeSchemaDefinition> = {
      'vfx-system': parent,
      'vfx-emitter': stubSchema(
        'vfx-emitter',
        '#3 Collection Block',
        [
          { id: 'entries', type: '#1 Root Entry' },
          { id: 'K', type: '#2 Root Entry (VfxSystemDefinitionData)' },
          { id: 'complexEmitterDefinitionData:0', type: '#3 Collection Block' },
        ],
      ),
    }
    const pathById = {
      'vfx-emitter': 'pack/pack_VfxEmitter/VfxEmitter.json',
    }
    const list = listInternalStructureCandidatesForBase(parent, registry, {
      jsonRelativePathBySchemaId: pathById,
    })
    expect(list).toHaveLength(1)
    expect(list[0]!.schemaId).toBe('vfx-emitter')
    expect(list[0]!.name).toBe(
      internalStructureDisplayNameFromChildSchema(registry['vfx-emitter']!),
    )
  })
})

describe('listInternalStructureCandidatesForModuleParent', () => {
  it('lista JSON na raiz do pack com nome pathHierarchySteps.id', () => {
    const parent = stubSchema(
      'animation-graph-data',
      '#2 Root Entry (AnimationGraphData)',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },
      ],
    )
    const selectorClip = stubSchema(
      'selector-clip-data',
      '#3 Collection Block',
      [
        { id: 'entries', type: '#1 Root Entry' },
        { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },
        { id: 'Attack1', type: '#3 Collection Block' },
      ],
      'SelectorClipData',
    )
    const registry: Record<string, NodeSchemaDefinition> = {
      'animation-graph-data': parent,
      'selector-clip-data': selectorClip,
    }
    const pathById = {
      'animation-graph-data': 'beta/animation-graph-data.json',
      'selector-clip-data': 'beta/selector-clip-data.json',
    }
    const nodeKind = {
      'animation-graph-data': 'module' as const,
      'selector-clip-data': 'module' as const,
    }
    const packFolder = {
      'animation-graph-data': 'beta',
      'selector-clip-data': 'beta',
    }

    const list = listInternalStructureCandidatesForModuleParent(parent, registry, {
      jsonRelativePathBySchemaId: pathById,
      schemaNodeKindBySchemaId: nodeKind,
      packFolderBySchemaId: packFolder,
    })

    expect(list).toHaveLength(1)
    expect(list[0]!.schemaId).toBe('selector-clip-data')
    expect(list[0]!.name).toBe('Attack1')
  })
})
