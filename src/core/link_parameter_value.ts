import type { NodeInstance, NodeParameterValue } from '@/core/nodeSchema'

export type ParameterValueLinkPair = readonly [string, string]

function normalizePair(a: string, b: string): ParameterValueLinkPair {
  return a <= b ? [a, b] : [b, a]
}

function partnerFromLinks(
  links: Array<ParameterValueLinkPair> | undefined,
  parameterId: string,
): string | undefined {
  if (!links) {
    return undefined
  }

  for (const [x, y] of links) {
    if (x === parameterId) {
      return y
    }
    if (y === parameterId) {
      return x
    }
  }

  return undefined
}

export function link_parameter_value_partner(
  node: NodeInstance,
  parameterId: string,
): string | undefined {
  return partnerFromLinks(node.parameter_value_links, parameterId)
}

export function link_parameter_value_is_linked(node: NodeInstance, parameterId: string): boolean {
  return partnerFromLinks(node.parameter_value_links, parameterId) !== undefined
}

/** Remove pares que tocam em qualquer um dos dois ids e adiciona o par normalizado. */
export function link_parameter_value_add_pair(
  node: NodeInstance,
  parameterIdA: string,
  parameterIdB: string,
): NodeInstance {
  if (parameterIdA === parameterIdB) {
    return node
  }

  const nextPair = normalizePair(parameterIdA, parameterIdB)
  const existing = node.parameter_value_links ?? []
  const filtered = existing.filter(
    ([x, y]) =>
      x !== nextPair[0] && x !== nextPair[1] && y !== nextPair[0] && y !== nextPair[1],
  )
  const merged: Array<ParameterValueLinkPair> = [...filtered, nextPair]

  return {
    ...node,
    parameter_value_links: merged,
  }
}

export function link_parameter_value_remove_involving(node: NodeInstance, parameterId: string): NodeInstance {
  const existing = node.parameter_value_links ?? []
  const filtered = existing.filter(([x, y]) => x !== parameterId && y !== parameterId)

  const next: NodeInstance = { ...node }

  if (filtered.length === 0) {
    delete next.parameter_value_links
  } else {
    next.parameter_value_links = filtered
  }

  return next
}

function setValueForId(
  values: NodeParameterValue[],
  parameterId: string,
  value: string,
): NodeParameterValue[] {
  const has = values.some((entry) => entry.parameterId === parameterId)

  if (has) {
    return values.map((entry) =>
      entry.parameterId === parameterId ? { ...entry, value } : entry,
    )
  }

  return [...values, { parameterId, value }]
}

/** Actualiza o valor de `parameterId` e do parceiro vinculado, se existir. */
export function link_parameter_value_patch_values(
  values: NodeParameterValue[],
  parameterId: string,
  value: string,
  links: Array<ParameterValueLinkPair> | undefined,
): NodeParameterValue[] {
  let next = setValueForId(values, parameterId, value)
  const partner = partnerFromLinks(links, parameterId)

  if (partner) {
    next = setValueForId(next, partner, value)
  }

  return next
}
