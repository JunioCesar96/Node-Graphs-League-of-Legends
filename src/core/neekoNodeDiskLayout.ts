import type { CanvasNode } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

export const NEEKO_DISK_PACK_FOLDER = 'default'

export const NEEKO_CARD_SCHEMA_ID = 'neeko'

export function isNeekoCardSchemaId(schemaId: string): boolean {
  return schemaId === NEEKO_CARD_SCHEMA_ID
}

/** Slug do título para prefixo `neekonode_` (só a-z0-9, minúsculas). */
export function neekoTitleSlug(title: string): string {
  const slug = title
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return slug.length > 0 ? slug : 'unknown'
}

/** Segmento de pasta após `default_` (mesma regra que o plugin Vite). */
export function neekoCollectionTypeDirSegment(title: string): string {
  const t = title.normalize('NFKC').trim()
  if (t === '') {
    return 'unknown'
  }
  return t.replace(/[\s/\\]+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')
}

export function neekoSubfolderName(packFolder: string, title: string): string {
  return `${packFolder}_${neekoCollectionTypeDirSegment(title)}`
}

export function neekoFileName(
  schema: { id: string; title: string },
  usedNames: Set<string>,
): string {
  const slug = neekoTitleSlug(schema.title)
  const base = `neekonode_${slug}.json`

  if (!usedNames.has(base)) {
    usedNames.add(base)
    return base
  }

  const idSuffix = schema.id.normalize('NFKC').trim().toLowerCase()
  let candidate = `neekonode_${slug}__${idSuffix}.json`
  let counter = 0

  while (usedNames.has(candidate)) {
    counter += 1
    candidate = `neekonode_${slug}__${idSuffix}-${String(counter)}.json`
  }

  usedNames.add(candidate)
  return candidate
}

export function schemaToNeekoDiskJson(schema: NodeSchemaDefinition): Record<string, unknown> {
  return { ...schema, tag: 'neeko' }
}

export function prepareNeekoSchemasForDisk(nodes: CanvasNode[]): Record<string, unknown>[] {
  const byId = new Map<string, NodeSchemaDefinition>()

  for (const canvasNode of nodes) {
    const schemaId = canvasNode.node.schema.id
    if (isNeekoCardSchemaId(schemaId)) {
      continue
    }
    if (!byId.has(schemaId)) {
      byId.set(schemaId, canvasNode.node.schema)
    }
  }

  return [...byId.values()].map((schema) => schemaToNeekoDiskJson(schema))
}

export type NeekoDiskWriteTarget = {
  subfolderName: string
  fileName: string
  relativeLabel: string
}

export function resolveNeekoDiskWriteTarget(
  schema: { id: string; title: string },
  usedNames: Set<string>,
  packFolder: string = NEEKO_DISK_PACK_FOLDER,
): NeekoDiskWriteTarget {
  const title = schema.title.trim() || schema.id
  const subfolderName = neekoSubfolderName(packFolder, title)
  const fileName = neekoFileName(schema, usedNames)

  return {
    subfolderName,
    fileName,
    relativeLabel: `${subfolderName}/${fileName}`,
  }
}
