import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import type { RitualBlockCatalogSlice } from './blockAutoBuildFromRitualCode'

export type BlockSpawnCatalog = {
  blockByInstanceKey: Map<string, BlockDefinitionJsonDocument>
  parameterByBlockAndName: Map<string, BlockParameterJsonDocument>
}

export function buildBlockSpawnCatalog(catalog: RitualBlockCatalogSlice): BlockSpawnCatalog {
  const blockByInstanceKey = new Map<string, BlockDefinitionJsonDocument>()
  for (const document of catalog.blockDocuments) {
    blockByInstanceKey.set(blockDefinitionInstanceKey(document), document)
  }

  const parameterByBlockAndName = new Map<string, BlockParameterJsonDocument>()
  for (const document of catalog.parameterDocuments) {
    parameterByBlockAndName.set(
      `${document.block.trim()}::${document.parameterName.trim()}`,
      document,
    )
  }

  return { blockByInstanceKey, parameterByBlockAndName }
}
