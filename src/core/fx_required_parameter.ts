import type { NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'

/**
 * Id usado em `required_parameter` no JSON do schema e na lista da instância.
 * Parâmetros vindos do catálogo podem ter `dyn-param-*` no canvas; nesse caso usa-se o id do stub com o mesmo name+type.
 */
export function resolveRequiredParameterListId(
  row: NodeParameterDefinition,
  stubCatalog: readonly NodeParameterDefinition[] | undefined,
): string {
  if (!row.id.startsWith('dyn-param-')) {
    return row.id
  }

  const hit = (stubCatalog ?? []).find((s) => s.name === row.name && s.type === row.type)
  return hit?.id ?? row.id
}

/**
 * Alterna o id do parâmetro em `required_parameter` na instância e no `schema` embutido (imutável).
 * Mantém `schema.required_parameter` e `required_parameter` alinhados; lista vazia usa `[]`.
 */
export function fx_required_parameter(node: NodeInstance, parameterId: string): NodeInstance {
  const current = node.required_parameter ?? node.schema.required_parameter ?? []
  const isMarked = current.includes(parameterId)
  const next = isMarked ? current.filter((id) => id !== parameterId) : [...current, parameterId]

  return {
    ...node,
    schema: {
      ...node.schema,
      required_parameter: next,
    },
    required_parameter: next,
  }
}

export function fx_required_parameter_isMarked(
  node: NodeInstance,
  canvasParameterId: string,
  stubCatalog?: readonly NodeParameterDefinition[],
): boolean {
  const list = node.required_parameter ?? node.schema.required_parameter ?? []
  const row = node.schema.parameters.find((parameter) => parameter.id === canvasParameterId)
  const listId =
    row !== undefined ? resolveRequiredParameterListId(row, stubCatalog) : canvasParameterId

  return list.includes(listId) || list.includes(canvasParameterId)
}
