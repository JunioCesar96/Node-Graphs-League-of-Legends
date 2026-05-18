import { describe, expect, it } from 'vitest'



import {

  buildElementMenuScopeCatalogSources,

  resolveAnchorModuleSchemaId,

  resolveModuleCatalogParentSchema,

} from '@/core/elementMenuScopeCatalog'

import { buildElementMenuEntries, filterElementMenuEntriesByCatalogScope } from '@/core/elementMenuCatalogUtils'

import type { NodeSchemaDefinition } from '@/core/nodeSchema'



const moduleSchema: NodeSchemaDefinition = {

  id: 'skin-character-data-properties',

  title: 'SkinCharacterDataProperties',

  parameters: [{ id: 'p1', name: 'championSkinName', type: 'string', defaultValue: 'Zac' }],

  internalStructures: [

    { id: 'is1', name: 'CharacterIdleEffect', schemaId: 'skin-character-data-properties-character-idle-effect' },

  ],

}



const baseSchema: NodeSchemaDefinition = {

  id: 'skin-character-data-properties-character-idle-effect',

  title: 'SkinCharacterDataProperties_CharacterIdleEffect',

  parameters: [{ id: 'p2', name: 'effectKey', type: 'string', defaultValue: 'Idle' }],

  internalStructures: [],

  nomenclature: {

    group: '#3 Internal Structures',

    collection: '#3 Collection Block',

    collectionType: 'SkinCharacterDataProperties_CharacterIdleEffect',

    pathHierarchySteps: [

      { id: 'entries', type: '#1 Root Entry' },

      { id: 'Characters/Zac/Skins/Skin0', type: '#2 Root Entry (SkinCharacterDataProperties)' },

      { id: 'CharacterIdleEffect', type: '#3 Collection Block' },

    ],

  },

}



const animationGraphModule: NodeSchemaDefinition = {

  id: 'animation-graph-data',

  title: 'AnimationGraphData',

  parameters: [],

  internalStructures: [],

  nomenclature: {

    group: '#2 Entidades',

    collection: '#2 Root Entry (AnimationGraphData)',

    collectionType: 'AnimationGraphData',

    pathHierarchySteps: [

      { id: 'entries', type: '#1 Root Entry' },

      { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },

    ],

  },

}



const selectorClipModule: NodeSchemaDefinition = {

  id: 'selector-clip-data',

  title: 'SelectorClipData',

  parameters: [],

  internalStructures: [],

  nomenclature: {

    group: '#3 Internal Structures',

    collection: '#3 Collection Block',

    collectionType: 'SelectorClipData',

    pathHierarchySteps: [

      { id: 'entries', type: '#1 Root Entry' },

      { id: 'Characters/Zac/Animations/Skin0', type: '#2 Root Entry (AnimationGraphData)' },

      { id: 'Attack1', type: '#3 Collection Block' },

    ],

  },

}



const registry: Record<string, NodeSchemaDefinition> = {

  'skin-character-data-properties': moduleSchema,

  'skin-character-data-properties-character-idle-effect': baseSchema,

  'animation-graph-data': animationGraphModule,

  'selector-clip-data': selectorClipModule,

}



const nodeKindById: Record<string, 'module' | 'base'> = {

  'skin-character-data-properties': 'module',

  'skin-character-data-properties-character-idle-effect': 'base',

  'animation-graph-data': 'module',

  'selector-clip-data': 'module',

}



const pathById: Record<string, string> = {

  'skin-character-data-properties': 'beta/skin-character-data-properties.json',

  'skin-character-data-properties-character-idle-effect':

    'beta/beta_SkinCharacterDataProperties_CharacterIdleEffect/SkinCharacterDataProperties_CharacterIdleEffect.json',

  'animation-graph-data': 'beta/animation-graph-data.json',

  'selector-clip-data': 'beta/selector-clip-data.json',

}



const packFolderById: Record<string, string> = {

  'skin-character-data-properties': 'beta',

  'skin-character-data-properties-character-idle-effect': 'beta',

  'animation-graph-data': 'beta',

  'selector-clip-data': 'beta',

}



describe('elementMenuScopeCatalog', () => {

  it('resolveAnchorModuleSchemaId encontra modulo #2 no pathHierarchy', () => {

    expect(

      resolveAnchorModuleSchemaId(baseSchema, registry, nodeKindById),

    ).toBe('skin-character-data-properties')

  })



  it('resolveModuleCatalogParentSchema usa #2 do pathHierarchy em clip module', () => {

    expect(resolveModuleCatalogParentSchema(selectorClipModule, registry, nodeKindById)?.id).toBe(

      'animation-graph-data',

    )

  })



  it('module scope usa parametros do modulo ancora e clips da raiz do pack', () => {

    const sources = buildElementMenuScopeCatalogSources({

      node: {

        id: 'n1',

        schema: animationGraphModule,

        values: [],

      },

      nodeKind: 'module',

      schemaRegistry: registry,

      schemaNodeKindBySchemaId: nodeKindById,

      jsonRelativePathBySchemaId: pathById,

      packFolderBySchemaId: packFolderById,

    })



    expect(sources.module.catalogStructures?.some((s) => s.schemaId === 'selector-clip-data')).toBe(

      true,

    )

    expect(sources.module.catalogStructures?.find((s) => s.schemaId === 'selector-clip-data')?.name).toBe(

      'Attack1',

    )



    const moduleEntries = buildElementMenuEntries({

      ...sources.module,

      schemaRegistry: registry,

      catalogScope: 'module',

    })



    const attackEntry = moduleEntries.find((e) => e.label === 'Attack1')

    expect(attackEntry?.catalogLabelMode).toBe('path-hierarchy')

    expect(attackEntry?.structure?.schemaId).toBe('selector-clip-data')



    const sourcesBaseNode = buildElementMenuScopeCatalogSources({

      node: {

        id: 'n2',

        schema: { ...baseSchema, parameters: [], internalStructures: [] },

        values: [],

      },

      nodeKind: 'base',

      schemaRegistry: registry,

      schemaNodeKindBySchemaId: nodeKindById,

      jsonRelativePathBySchemaId: pathById,

      packFolderBySchemaId: packFolderById,

      baseCatalogStructures: [{ id: 'c', name: 'CharacterIdleEffect', schemaId: baseSchema.id }],

      baseCatalogParameters: [{ id: 'stub', name: 'effectKey', type: 'string', defaultValue: '' }],

    })



    expect(moduleEntries.some((e) => e.label === 'championSkinName')).toBe(false)



    const skinSources = buildElementMenuScopeCatalogSources({

      node: {

        id: 'n3',

        schema: { ...baseSchema, parameters: [], internalStructures: [] },

        values: [],

      },

      nodeKind: 'base',

      schemaRegistry: registry,

      schemaNodeKindBySchemaId: nodeKindById,

      jsonRelativePathBySchemaId: pathById,

      packFolderBySchemaId: packFolderById,

      baseCatalogStructures: [{ id: 'c', name: 'CharacterIdleEffect', schemaId: baseSchema.id }],

      baseCatalogParameters: [],

    })



    const moduleFromSkin = buildElementMenuEntries({

      ...skinSources.module,

      schemaRegistry: registry,

      catalogScope: 'module',

    })

    expect(moduleFromSkin.some((e) => e.label === 'championSkinName')).toBe(true)



    const baseEntries = buildElementMenuEntries({

      ...sourcesBaseNode.base,

      schemaRegistry: registry,

      catalogScope: 'base',

    })

    expect(baseEntries.some((e) => e.catalogScope === 'base')).toBe(true)



    const onlyModule = filterElementMenuEntriesByCatalogScope(

      [...moduleEntries, ...baseEntries],

      'module',

    )

    expect(onlyModule.every((e) => e.catalogScope === 'module')).toBe(true)

  })

})


