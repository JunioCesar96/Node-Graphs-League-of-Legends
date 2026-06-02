import { blockParameterCatalogByName } from './blockParameterCatalogRegistry'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import { blockParameterJsonDocumentToNodeDataType } from './blockParameterFromJson'
import type { NodeDataType } from './nodeSchema'

export type BlockPaletteParameterEntry = {
  name: string
  dataType: NodeDataType
}

export function resolveBlockPaletteParameters(
  definition: BlockDefinitionJsonDocument,
): BlockPaletteParameterEntry[] {
  const seen = new Set<string>()
  const entries: BlockPaletteParameterEntry[] = []

  for (const rawName of definition.parameters) {
    const name = rawName.trim()
    if (!name || seen.has(name)) {
      continue
    }
    seen.add(name)

    const doc = blockParameterCatalogByName(definition.blockName, name)
    entries.push({
      name,
      dataType: doc ? blockParameterJsonDocumentToNodeDataType(doc) : 'property',
    })
  }

  return entries
}
