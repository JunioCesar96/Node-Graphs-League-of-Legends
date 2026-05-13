import type {
  InternalStructureDefinition,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'

/** Catálogo de parâmetros reutilizáveis para (+ Elemento dinâmico). */
export function flattenParameterTemplates(
  schemas: Iterable<NodeSchemaDefinition>,
): NodeParameterDefinition[] {
  const byKey = new Map<string, NodeParameterDefinition>()

  for (const schema of schemas) {
    for (const parameter of schema.parameters) {
      const dedupeKey = `${parameter.type}\0${parameter.name}`

      if (!byKey.has(dedupeKey)) {
        byKey.set(dedupeKey, parameter)
      }
    }
  }

  return [...byKey.values()].sort((schemaA, schemaB) =>
    schemaA.name.localeCompare(schemaB.name),
  )
}

/** Internal_Structures conhecidas no registo para adicionar slots dinâmicos ao corpo do nó. */
export function flattenInternalStructureTemplates(
  schemas: Iterable<NodeSchemaDefinition>,
): InternalStructureDefinition[] {
  const bySchemaTarget = new Map<string, InternalStructureDefinition>()

  for (const schema of schemas) {
    for (const structure of schema.internalStructures) {
      if (!bySchemaTarget.has(structure.schemaId)) {
        bySchemaTarget.set(structure.schemaId, structure)
      }
    }
  }

  return [...bySchemaTarget.values()].sort((a, b) => a.name.localeCompare(b.name))
}
