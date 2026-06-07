import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import type { RitualBlockCatalogSlice } from './blockAutoBuildFromRitualCode'

export type BlockSpawnParameterLookupHints = {
  pointerType?: string
  embedType?: string
}

/** Chave única no catálogo — pointer/embed incluem o tipo de bloco filho. */
export function blockParameterCatalogKey(doc: BlockParameterJsonDocument): string {
  const block = doc.block.trim()
  const name = doc.parameterName.trim()
  if (doc.type === 'pointer') {
    return `${block}::${name}::pointer::${doc.pointer.trim()}`
  }
  if (doc.type === 'embed') {
    return `${block}::${name}::embed::${doc.embed.trim()}`
  }
  return `${block}::${name}`
}

export type BlockSpawnCatalog = {
  blockByInstanceKey: Map<string, BlockDefinitionJsonDocument>
  parameterByKey: Map<string, BlockParameterJsonDocument>
}

export function resolveSpawnCatalogParameterDocument(
  catalog: BlockSpawnCatalog | undefined,
  blockName: string,
  parameterName: string,
  hints?: BlockSpawnParameterLookupHints,
): BlockParameterJsonDocument | undefined {
  if (!catalog) {
    return undefined
  }

  const block = blockName.trim()
  const name = parameterName.trim()
  const pointerType = hints?.pointerType?.trim()
  if (pointerType) {
    const typed = catalog.parameterByKey.get(`${block}::${name}::pointer::${pointerType}`)
    if (typed) {
      return typed
    }
  }

  const embedType = hints?.embedType?.trim()
  if (embedType) {
    const typed = catalog.parameterByKey.get(`${block}::${name}::embed::${embedType}`)
    if (typed) {
      return typed
    }
  }

  return catalog.parameterByKey.get(`${block}::${name}`)
}

export function buildBlockSpawnCatalog(catalog: RitualBlockCatalogSlice): BlockSpawnCatalog {
  const blockByInstanceKey = new Map<string, BlockDefinitionJsonDocument>()
  for (const document of catalog.blockDocuments) {
    blockByInstanceKey.set(blockDefinitionInstanceKey(document), document)
  }

  const parameterByKey = new Map<string, BlockParameterJsonDocument>()
  for (const document of catalog.parameterDocuments) {
    parameterByKey.set(blockParameterCatalogKey(document), document)
  }

  return { blockByInstanceKey, parameterByKey }
}
