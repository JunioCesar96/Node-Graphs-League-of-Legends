import {
  blockNameToCatalogNodeId,
  type BlockDefinitionJsonDocument,
} from './blockDefinitionJson'
import type { NodeSchemaDefinition } from './nodeSchema'

export const CATALOG_BLOCK_SCHEMA_PACK_FOLDER = 'catalog'

/** Schema ritual mínimo para um bloco criado manualmente no catálogo. */
export function buildCatalogBlockSchemaFromDefinition(
  definition: BlockDefinitionJsonDocument,
): NodeSchemaDefinition {
  const blockName = definition.blockName.trim()
  const schemaId = blockNameToCatalogNodeId(blockName)

  return {
    id: schemaId,
    title: blockName,
    parameters: [],
    embed: [],
    pointer: [],
    listEmbed: [],
    listPointer: [],
    list2Embed: [],
    list2Pointer: [],
    internalStructures: [],
    nomenclature: {
      group: '',
      collection: '#3 Collection Block',
      collectionType: blockName,
    },
  }
}

export function catalogBlockSchemaToJson(schema: NodeSchemaDefinition): Record<string, unknown> {
  return {
    id: schema.id,
    title: schema.title,
    parameters: schema.parameters,
    embed: schema.embed ?? [],
    pointer: schema.pointer ?? [],
    listEmbed: schema.listEmbed ?? [],
    listPointer: schema.listPointer ?? [],
    list2Embed: schema.list2Embed ?? [],
    list2Pointer: schema.list2Pointer ?? [],
    internalStructures: schema.internalStructures,
    nomenclature: schema.nomenclature,
  }
}

export type WriteCatalogBlockSchemaResult =
  | { ok: true; path?: string }
  | { ok: false; error: string }

/** Grava schema em `src/nodeStructures/catalog/` (apenas dev). */
export async function writeCatalogBlockSchemaToDisk(
  schema: NodeSchemaDefinition,
): Promise<WriteCatalogBlockSchemaResult> {
  if (!import.meta.env.DEV) {
    return { ok: true }
  }

  try {
    const res = await fetch('/api/node-structures-write', {
      body: JSON.stringify({
        folder: CATALOG_BLOCK_SCHEMA_PACK_FOLDER,
        layout: 'standard',
        rootSchemaIds: [schema.id],
        schemas: [catalogBlockSchemaToJson(schema)],
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    const payload: unknown = await res.json().catch(() => null)

    if (!res.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof (payload as { error: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `HTTP ${res.status}`
      return { ok: false, error: message }
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('ok' in payload) ||
      (payload as { ok: unknown }).ok !== true
    ) {
      return { ok: false, error: 'Resposta inválida ao gravar schema' }
    }

    const paths = (payload as { paths?: string[] }).paths
    return { ok: true, path: paths?.[0] }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function resolveSchemaForCatalogBlockDefinition(
  definition: BlockDefinitionJsonDocument,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  resolveByTitle: (blockName: string, registry: Record<string, NodeSchemaDefinition>) => string | null,
): NodeSchemaDefinition {
  const blockName = definition.blockName.trim()
  const existingId = resolveByTitle(blockName, schemaLookup)
  if (existingId && schemaLookup[existingId]) {
    return schemaLookup[existingId]!
  }
  return buildCatalogBlockSchemaFromDefinition(definition)
}
