import type { NodeSchemaDefinition } from '@/core/nodeSchema'

export type PaletteOrganizationMode = 'az' | 'structure' | 'value-type'

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
