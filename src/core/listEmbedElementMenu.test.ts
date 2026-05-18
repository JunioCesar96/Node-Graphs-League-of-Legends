import { describe, expect, it } from 'vitest'



import type { NodeInstance, NodeSchemaDefinition } from '@/core/nodeSchema'

import {

  appendListEmbedBlockFromTemplate,

  appendListEmbedCatalogItemToSchema,

  appendListEmbedSlotToBlock,

  buildListEmbedAddChoices,

  filterOutListEmbedCatalogChildStructures,

  listEmbedCatalogChildSchemaIds,

  listListEmbedCatalogPicksForElementMenu,

  listRemovableListEmbedBlocks,

  listRemovableListEmbedSlotsForBlock,

  structureForListEmbedAdd,

} from '@/core/listEmbedElementMenu'



const templateSchema: NodeSchemaDefinition = {

  id: 'skin-mesh-data-properties',

  title: 'SkinMeshDataProperties',

  parameters: [],

  listEmbed: [

    {

      id: 'skin-mesh-data-properties-material-override',

      title: 'materialOverride',

      internalStructures: [

        {

          id: 'catalog-0',

          name: 'SkinMeshDataProperties_MaterialOverride',

          schemaId: 'skin-mesh-data-properties-material-override',

        },

        {

          id: 'catalog-1',

          name: 'SkinMeshDataProperties_MaterialOverride',

          schemaId: 'skin-mesh-data-properties-material-override',

        },

      ],

    },

  ],

  internalStructures: [],

}



function nodeWithOneBlockOneSlot(): NodeInstance {

  return {

    id: 'n1',

    schema: {

      ...templateSchema,

      listEmbed: [

        {

          id: 'dyn-leb-aaa',

          title: 'materialOverride',

          templateBlockId: 'skin-mesh-data-properties-material-override',

          internalStructures: templateSchema.listEmbed![0]!.internalStructures,

          slots: [

            {

              id: 'dyn-leb-aaa__slot__0',

              name: 'SkinMeshDataProperties_MaterialOverride',

              schemaId: 'skin-mesh-data-properties-material-override',

            },

          ],

        },

      ],

    },

    values: [],

  }

}



describe('listEmbedElementMenu', () => {

  it('buildListEmbedAddChoices expõe catálogo do template', () => {

    const choices = buildListEmbedAddChoices(nodeWithOneBlockOneSlot(), templateSchema)

    expect(choices).toHaveLength(1)

    expect(choices[0]!.structures).toHaveLength(2)

  })



  it('appendListEmbedSlotToBlock acrescenta slot ao bloco existente', () => {

    const node = nodeWithOneBlockOneSlot()

    const blockId = node.schema.listEmbed![0]!.id

    const structure = structureForListEmbedAdd({

      id: 'catalog-1',

      name: 'SkinMeshDataProperties_MaterialOverride',

      schemaId: 'skin-mesh-data-properties-material-override',

    })



    const next = appendListEmbedSlotToBlock(node.schema, blockId, structure)

    const block = next.listEmbed![0]!



    expect(next.listEmbed).toHaveLength(1)

    expect(block.slots).toHaveLength(2)

    expect(block.slots![1]!.id).toContain('__slot__')

  })



  it('appendListEmbedCatalogItemToSchema com id de instância adiciona slot', () => {

    const node = nodeWithOneBlockOneSlot()

    const blockId = node.schema.listEmbed![0]!.id

    const structure = structureForListEmbedAdd(templateSchema.listEmbed![0]!.internalStructures[0]!)



    const next = appendListEmbedCatalogItemToSchema(node.schema, blockId, structure, templateSchema)

    expect(next.listEmbed).toHaveLength(1)

    expect(next.listEmbed![0]!.slots).toHaveLength(2)

  })



  it('appendListEmbedBlockFromTemplate cria nova instância LIST_EMBED', () => {

    const node = nodeWithOneBlockOneSlot()

    const structure = structureForListEmbedAdd(templateSchema.listEmbed![0]!.internalStructures[0]!)



    const next = appendListEmbedBlockFromTemplate(

      node.schema,

      'skin-mesh-data-properties-material-override',

      structure,

      templateSchema,

    )



    expect(next.listEmbed).toHaveLength(2)

    expect(next.listEmbed![1]!.templateBlockId).toBe('skin-mesh-data-properties-material-override')

  })



  it('listRemovableListEmbedSlotsForBlock lista slots do bloco', () => {

    const node = nodeWithOneBlockOneSlot()

    let schema = node.schema

    const blockId = schema.listEmbed![0]!.id

    schema = appendListEmbedSlotToBlock(

      schema,

      blockId,

      structureForListEmbedAdd(templateSchema.listEmbed![0]!.internalStructures[0]!),

    )



    const slots = listRemovableListEmbedSlotsForBlock({ ...node, schema }, blockId)

    expect(slots).toHaveLength(2)

    expect(slots[0]!.name).toBe('SkinMeshDataProperties_MaterialOverride')

    expect(slots[0]!.meta).toBe('materialOverride · LIST_EMBED')

  })



  it('filterOutListEmbedCatalogChildStructures remove filhos do catálogo IS', () => {

    const filtered = filterOutListEmbedCatalogChildStructures(

      [

        {

          id: 'is-1',

          name: 'SkinMeshDataProperties_MaterialOverride',

          schemaId: 'skin-mesh-data-properties-material-override',

        },

        { id: 'is-2', name: 'Other', schemaId: 'other-schema' },

      ],

      templateSchema,

    )

    expect(filtered).toHaveLength(1)

    expect(filtered[0]!.schemaId).toBe('other-schema')

  })



  it('listEmbedCatalogChildSchemaIds reúne schemaId dos filhos LIST_EMBED', () => {

    const ids = listEmbedCatalogChildSchemaIds(templateSchema)

    expect(ids.has('skin-mesh-data-properties-material-override')).toBe(true)

  })



  it('listRemovableListEmbedBlocks lista instâncias com título LIST_EMBED', () => {
    const blocks = listRemovableListEmbedBlocks(nodeWithOneBlockOneSlot())
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.name).toBe('materialOverride')
    expect(blocks[0]!.meta).toBe('SkinMeshDataProperties_MaterialOverride')
    expect(blocks[0]!.id).toBe('dyn-leb-aaa')
  })

  it('listListEmbedCatalogPicksForElementMenu expõe tipos do template', () => {

    const picks = listListEmbedCatalogPicksForElementMenu(nodeWithOneBlockOneSlot(), templateSchema)

    expect(picks.length).toBe(2)

    expect(picks[0]!.listEmbedTitle).toBe('materialOverride')

  })

})


