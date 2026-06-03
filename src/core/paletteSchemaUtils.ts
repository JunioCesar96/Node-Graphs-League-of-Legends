import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { NODE_STRUCTURE_PACK_FOLDER_DEFAULT } from '@/core/nodeStructurePackFolders'

export type PaletteOrganizationMode = 'az' | 'structure' | 'value-type'

/** Reexport para compatibilidade com testes e Neeko. */
export const PALETTE_PACK_FOLDER_DEFAULT = NODE_STRUCTURE_PACK_FOLDER_DEFAULT

export type ListPalettePackFoldersOptions = {
  /** Pastas de packs só em memória/localStorage (ex.: conversão dinâmica). */
  memoryPackFolders?: readonly string[]
  schemas?: readonly NodeSchemaDefinition[]
  packFolderBySchemaId?: Record<string, string>
}

function normalizeFolderNames(names: readonly string[]): string[] {
  return [...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/**
 * Pastas exibidas nos filtros da paleta Add Node.
 * Com `diskFolders` (leitura ao abrir a paleta), usa **só** o que existe em `nodeStructures/` no disco
 * (+ packs em memória opcionais). Sem disco, faz fallback a pastas dos schemas visíveis.
 */
export function listPalettePackFolders(
  diskFolders: readonly string[],
  options: ListPalettePackFoldersOptions = {},
): string[] {
  const memory = options.memoryPackFolders ?? []

  if (diskFolders.length > 0) {
    return normalizeFolderNames([...diskFolders, ...memory])
  }

  const folders = new Set<string>()
  for (const folder of memory) {
    const trimmed = folder.trim()
    if (trimmed) {
      folders.add(trimmed)
    }
  }

  const packMap = options.packFolderBySchemaId
  const schemas = options.schemas ?? []

  if (packMap) {
    for (const schema of schemas) {
      const folder = packMap[schema.id]?.trim()
      if (folder) {
        folders.add(folder)
      }
    }
  }

  return normalizeFolderNames([...folders])
}

export function matchesSchemaQuery(schema: NodeSchemaDefinition, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return `${schema.title} ${schema.id}`.toLowerCase().includes(normalizedQuery)
}

export function getSchemaStructure(schema: NodeSchemaDefinition) {
  if (schema.parameters.length > 0 && schema.internalStructures.length > 0) {
    return 'branch'
  }

  return schema.internalStructures.length > 0 ? 'internal-structure' : 'leaf'
}

/** Rótulo curto PT-BR na faixa meta da paleta (tipo de estrutura do schema). */
export function getSchemaStructureLabel(schema: NodeSchemaDefinition) {
  const kind = getSchemaStructure(schema)

  if (kind === 'leaf') {
    return 'Parameters'
  }

  if (kind === 'internal-structure') {
    return 'Internal_Structures'
  }

  return 'Branch'
}

export function getSchemaValueTypes(schema: NodeSchemaDefinition) {
  return Array.from(new Set(schema.parameters.map((parameter) => parameter.type)))
}

export function sortSchemasByOrganization(
  schemas: NodeSchemaDefinition[],
  organization: PaletteOrganizationMode,
) {
  return [...schemas].sort((schemaA, schemaB) => {
    if (organization === 'structure') {
      return getSchemaStructure(schemaA).localeCompare(getSchemaStructure(schemaB))
    }

    if (organization === 'value-type') {
      return getSchemaValueTypes(schemaA).join(',').localeCompare(getSchemaValueTypes(schemaB).join(','))
    }

    return schemaA.title.localeCompare(schemaB.title)
  })
}
