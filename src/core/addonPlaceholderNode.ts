import type { NodeInstance, NodeSchemaDefinition } from '@/core/nodeSchema'

const ADDON_PLACEHOLDER_SCHEMA: NodeSchemaDefinition = {
  id: '__addon_placeholder__',
  title: 'Add-on',
  parameters: [],
  internalStructures: [],
  nomenclature: {
    group: 'Addons',
    collection: 'Addons',
    collectionType: 'addon',
  },
}

export function createAddonPlaceholderInstance(instanceId: string): NodeInstance {
  return {
    id: instanceId,
    schema: ADDON_PLACEHOLDER_SCHEMA,
    values: [],
  }
}
