import { blockDefinitionInstanceKey } from './blockDefinitionSchemaResolve'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import type { RitualBlockCatalogSlice } from './blockAutoBuildFromRitualCode'
import { instanceNodeIdFromParameterDocument } from './blockParameterSynthesis'

export type BlockSpawnParameterLookupHints = {
  pointerType?: string
  embedType?: string
  /** nodeId ritual da instância em spawn (prioriza parâmetros extraídos do código). */
  instanceNodeId?: string
}

function parameterCatalogSuffix(
  doc: Pick<BlockParameterJsonDocument, 'block' | 'parameterName' | 'type'> & {
    pointer?: string
    embed?: string
  },
): string {
  const block = doc.block.trim()
  const name = doc.parameterName.trim()
  if (doc.type === 'pointer') {
    return `${block}::${name}::pointer::${String(doc.pointer ?? '').trim()}`
  }
  if (doc.type === 'embed') {
    return `${block}::${name}::embed::${String(doc.embed ?? '').trim()}`
  }
  return `${block}::${name}`
}

/** Chave única no catálogo — pointer/embed incluem o tipo de bloco filho; instâncias ritual incluem nodeId. */
export function blockParameterCatalogKey(doc: BlockParameterJsonDocument): string {
  const suffix = parameterCatalogSuffix(doc)
  const instanceNodeId = instanceNodeIdFromParameterDocument(doc)
  return instanceNodeId ? `${instanceNodeId}::${suffix}` : suffix
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
  const instanceNodeId = hints?.instanceNodeId?.trim()
  const pointerType = hints?.pointerType?.trim()
  const embedType = hints?.embedType?.trim()

  const lookup = (suffix: string, withInstance: boolean) => {
    const key = withInstance && instanceNodeId ? `${instanceNodeId}::${suffix}` : suffix
    return catalog.parameterByKey.get(key)
  }

  if (pointerType) {
    const suffix = `${block}::${name}::pointer::${pointerType}`
    const instanceHit = lookup(suffix, true)
    if (instanceHit) {
      return instanceHit
    }
    const typed = catalog.parameterByKey.get(suffix)
    if (typed) {
      return typed
    }
  }

  if (embedType) {
    const suffix = `${block}::${name}::embed::${embedType}`
    const instanceHit = lookup(suffix, true)
    if (instanceHit) {
      return instanceHit
    }
    const typed = catalog.parameterByKey.get(suffix)
    if (typed) {
      return typed
    }
  }

  const baseSuffix = `${block}::${name}`
  const instanceScalar = lookup(baseSuffix, true)
  if (instanceScalar) {
    return instanceScalar
  }

  return catalog.parameterByKey.get(baseSuffix)
}

export type BlockSpawnCatalog = {
  blockByInstanceKey: Map<string, BlockDefinitionJsonDocument>
  parameterByKey: Map<string, BlockParameterJsonDocument>
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
