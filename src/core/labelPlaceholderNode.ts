import type { NodeInstance, NodeSchemaDefinition } from '@/core/nodeSchema'

const LABEL_PLACEHOLDER_SCHEMA: NodeSchemaDefinition = {
  id: '__label_placeholder__',
  title: 'Label',
  parameters: [],
  internalStructures: [],
  nomenclature: {
    group: 'Labels',
    collection: 'Labels',
    collectionType: 'label',
  },
}

export function createLabelPlaceholderInstance(instanceId: string): NodeInstance {
  return {
    id: instanceId,
    schema: LABEL_PLACEHOLDER_SCHEMA,
    values: [],
  }
}
