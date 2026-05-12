import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { nodeSchemaFromStructureJson } from '@/core/nodeStructureJson'

export const STRUCTURE_DYNAMIC_PACKS_KEY = 'node-graphs-lol:dynamic-structure-packs'

export type DynamicStructurePack = {
  folder: string
  schemas: NodeSchemaDefinition[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Apenas caracteres seguros para pasta física/manifestação. */
export function sanitizeStructurePackFolderName(raw: string): string | null {
  const t = raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')

  if (t === '' || t === '..' || t === '.' || t.length > 48) {
    return null
  }

  return t
}

function reviveSchema(candidate: unknown): NodeSchemaDefinition | null {
  return nodeSchemaFromStructureJson(candidate)
}

export function loadDynamicStructurePacksFromStorage(): DynamicStructurePack[] {
  try {
    const stored = window.localStorage.getItem(STRUCTURE_DYNAMIC_PACKS_KEY)

    if (!stored) {
      return []
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return []
    }

    const out: DynamicStructurePack[] = []

    for (const item of parsed) {
      if (!isRecord(item) || typeof item.folder !== 'string' || !Array.isArray(item.schemas)) {
        continue
      }

      const schemas: NodeSchemaDefinition[] = []

      for (const s of item.schemas) {
        const revived = reviveSchema(s)

        if (revived) {
          schemas.push(revived)
        }
      }

      if (schemas.length === 0) {
        continue
      }

      out.push({ folder: item.folder.trim(), schemas })
    }

    return out
  } catch {
    return []
  }
}

export function saveDynamicStructurePacksToStorage(packs: DynamicStructurePack[]): void {
  try {
    window.localStorage.setItem(STRUCTURE_DYNAMIC_PACKS_KEY, JSON.stringify(packs))
  } catch {
    /** ignore quota */
  }
}

export function dynamicPacksSchemaRecord(packs: DynamicStructurePack[]): Record<string, NodeSchemaDefinition> {
  const acc: Record<string, NodeSchemaDefinition> = {}

  for (const pack of packs) {
    for (const schema of pack.schemas) {
      acc[schema.id] = structuredClone(schema)
    }
  }

  return acc
}

export function dynamicPackFolderMap(packs: DynamicStructurePack[]): Record<string, string> {
  const m: Record<string, string> = {}

  for (const pack of packs) {
    for (const schema of pack.schemas) {
      m[schema.id] = pack.folder
    }
  }

  return m
}
