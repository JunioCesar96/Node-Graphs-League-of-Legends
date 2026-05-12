import type { NodeEntityDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

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

/** Entidades conhecidas no registo para adicionar slots dinâmicos ao corpo do nó. */
export function flattenEntityTemplates(
  schemas: Iterable<NodeSchemaDefinition>,
): NodeEntityDefinition[] {
  const bySchemaTarget = new Map<string, NodeEntityDefinition>()

  for (const schema of schemas) {
    for (const entity of schema.entities) {
      if (!bySchemaTarget.has(entity.schemaId)) {
        bySchemaTarget.set(entity.schemaId, entity)
      }
    }
  }

  return [...bySchemaTarget.values()].sort((entityA, entityB) =>
    entityA.name.localeCompare(entityB.name),
  )
}
