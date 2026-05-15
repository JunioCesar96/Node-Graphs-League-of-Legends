import { resolveRequiredParameterListId } from '@/core/fx_required_parameter'
import type { NodeInstance, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

/** Id de lista (JSON / stub) → id usado em `values` no canvas. */
export function resolveHashStringCanvasParameterId(
  schema: NodeSchemaDefinition,
  catalog: readonly NodeParameterDefinition[] | undefined,
  listParameterId: string,
): string | undefined {
  const hit = schema.parameters.find(
    (parameter) => resolveRequiredParameterListId(parameter, catalog) === listParameterId,
  )
  if (hit) {
    return hit.id
  }
  if ((catalog ?? []).some((stub) => stub.id === listParameterId)) {
    return listParameterId
  }
  return undefined
}

export function parameterMatchesHashStringSource(
  canvasParameterId: string,
  node: NodeInstance,
  catalog: readonly NodeParameterDefinition[] | undefined,
): boolean {
  const listId = node.hashStringParameterId ?? node.schema.hashStringParameterId
  if (!listId) {
    return false
  }
  const row = node.schema.parameters.find((parameter) => parameter.id === canvasParameterId)
  if (!row) {
    return false
  }
  return resolveRequiredParameterListId(row, catalog) === listId
}

export function hydrateInstanceHashStringFields(
  instance: NodeInstance,
  catalog: readonly NodeParameterDefinition[],
): NodeInstance {
  const listId = instance.schema.hashStringParameterId
  if (!listId) {
    return instance
  }

  const canvasId = resolveHashStringCanvasParameterId(instance.schema, catalog, listId)
  if (!canvasId) {
    const cleared: NodeSchemaDefinition = { ...instance.schema }
    delete cleared.hashString
    delete cleared.hashStringParameterId
    const next: NodeInstance = { ...instance, schema: cleared }
    delete next.hashString
    delete next.hashStringParameterId
    return next
  }

  const row =
    instance.schema.parameters.find((parameter) => parameter.id === canvasId) ??
    catalog.find((parameter) => parameter.id === listId)

  if (!row || row.type !== 'string') {
    const cleared: NodeSchemaDefinition = { ...instance.schema }
    delete cleared.hashString
    delete cleared.hashStringParameterId
    const next: NodeInstance = { ...instance, schema: cleared }
    delete next.hashString
    delete next.hashStringParameterId
    return next
  }

  const val = instance.values.find((entry) => entry.parameterId === canvasId)?.value ?? row.defaultValue

  return {
    ...instance,
    hashString: val,
    hashStringParameterId: listId,
    schema: {
      ...instance.schema,
      hashString: val,
      hashStringParameterId: listId,
    },
  }
}

/**
 * Define a fonte da hashString a partir do id de parâmetro no canvas (Inspector).
 * Persiste ids de lista no schema/instância (alinhado a `required_parameter`).
 */
export function addHashStringInNode(
  node: NodeInstance,
  canvasParameterId: string,
  catalog: readonly NodeParameterDefinition[] | undefined,
): NodeInstance | null {
  const row = node.schema.parameters.find((parameter) => parameter.id === canvasParameterId)
  if (!row || row.type !== 'string') {
    return null
  }

  const listId = resolveRequiredParameterListId(row, catalog)
  const val = node.values.find((entry) => entry.parameterId === canvasParameterId)?.value ?? row.defaultValue

  return {
    ...node,
    hashString: val,
    hashStringParameterId: listId,
    schema: {
      ...node.schema,
      hashString: val,
      hashStringParameterId: listId,
    },
  }
}

/** Actualiza `hashString` a partir de `values` (ex.: após editar parâmetro ou link). */
export function syncHashStringMirrorFromValues(
  node: NodeInstance,
  catalog: readonly NodeParameterDefinition[] | undefined,
): NodeInstance {
  const listId = node.hashStringParameterId ?? node.schema.hashStringParameterId
  if (!listId) {
    return node
  }

  const canvasId = resolveHashStringCanvasParameterId(node.schema, catalog, listId)
  if (!canvasId) {
    return node
  }

  const row =
    node.schema.parameters.find((parameter) => parameter.id === canvasId) ??
    (catalog ?? []).find((parameter) => parameter.id === listId)

  if (!row || row.type !== 'string') {
    const cleared: NodeSchemaDefinition = { ...node.schema }
    delete cleared.hashString
    delete cleared.hashStringParameterId
    const next: NodeInstance = { ...node, schema: cleared }
    delete next.hashString
    delete next.hashStringParameterId
    return next
  }

  const val = node.values.find((entry) => entry.parameterId === canvasId)?.value ?? row.defaultValue

  if (node.hashString === val && node.schema.hashString === val) {
    return node
  }

  return {
    ...node,
    hashString: val,
    hashStringParameterId: listId,
    schema: {
      ...node.schema,
      hashString: val,
      hashStringParameterId: listId,
    },
  }
}
