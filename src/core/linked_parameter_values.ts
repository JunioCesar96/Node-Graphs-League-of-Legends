import { resolveRequiredParameterListId } from '@/core/fx_required_parameter'
import {
  link_parameter_value_patch_values,
  type ParameterValueLinkPair,
} from '@/core/link_parameter_value'
import type { NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'

/** Normaliza pares (único par por id), ordem canónica a≤b. */
export function normalizeLinkedParameterPairs(
  pairs: readonly ParameterValueLinkPair[],
): ParameterValueLinkPair[] {
  const used = new Set<string>()
  const out: ParameterValueLinkPair[] = []
  for (const raw of pairs) {
    const [x, y] = raw
    if (x === y) {
      continue
    }
    const a = x <= y ? x : y
    const b = x <= y ? y : x
    if (used.has(a) || used.has(b)) {
      continue
    }
    used.add(a)
    used.add(b)
    out.push([a, b])
  }
  return out
}

/** Resolve id de ficheiro (stub) → id actual no canvas (ex.: dyn-param-*). */
export function canvasParameterIdForListId(
  node: NodeInstance,
  listId: string,
  stubCatalog: readonly NodeParameterDefinition[],
): string | undefined {
  if (node.schema.parameters.some((p) => p.id === listId)) {
    return listId
  }
  const stubRow = stubCatalog.find((s) => s.id === listId)
  if (!stubRow) {
    return undefined
  }
  const hit = node.schema.parameters.find(
    (p) =>
      p.id.startsWith('dyn-param-') &&
      p.name === stubRow.name &&
      p.type === stubRow.type,
  )
  return hit?.id
}

/** Traduz pares gravados no JSON (ids stub) para ids do canvas. */
export function translateDiskLinkedPairsToCanvas(
  disk: readonly ParameterValueLinkPair[] | undefined,
  node: NodeInstance,
  stubCatalog: readonly NodeParameterDefinition[],
): ParameterValueLinkPair[] {
  if (!disk?.length) {
    return []
  }
  const canvas: ParameterValueLinkPair[] = []
  for (const [la, lb] of disk) {
    const ca = canvasParameterIdForListId(node, la, stubCatalog)
    const cb = canvasParameterIdForListId(node, lb, stubCatalog)
    if (!ca || !cb || ca === cb) {
      continue
    }
    const norm = ca <= cb ? ([ca, cb] as const) : ([cb, ca] as const)
    canvas.push(norm)
  }
  return normalizeLinkedParameterPairs(canvas)
}

function pairsSignature(pairs: readonly ParameterValueLinkPair[] | undefined): string {
  if (!pairs?.length) {
    return ''
  }
  return [...pairs]
    .map(([a, b]) => `${a}\0${b}`)
    .sort()
    .join('|')
}

/** Chave estável para comparar `linked_parameter_values` incluindo undefined vs []. */
export function linkedParameterDiskKey(v: readonly ParameterValueLinkPair[] | undefined): string {
  if (v === undefined) {
    return 'undef'
  }
  if (!v.length) {
    return 'empty'
  }
  return pairsSignature(v)
}

export function instanceLinkedPairsEqual(
  a: readonly ParameterValueLinkPair[] | undefined,
  b: readonly ParameterValueLinkPair[] | undefined,
): boolean {
  return pairsSignature(a) === pairsSignature(b)
}

/** Id de lista/stub para gravar no JSON (igual a required_parameter). */
export function resolveLinkedPairForDisk(
  node: NodeInstance,
  canvasIdA: string,
  canvasIdB: string,
  stubCatalog: readonly NodeParameterDefinition[],
): ParameterValueLinkPair {
  const rowA = node.schema.parameters.find((p) => p.id === canvasIdA)
  const rowB = node.schema.parameters.find((p) => p.id === canvasIdB)
  const a = rowA ? resolveRequiredParameterListId(rowA, stubCatalog) : canvasIdA
  const b = rowB ? resolveRequiredParameterListId(rowB, stubCatalog) : canvasIdB
  return a <= b ? [a, b] : [b, a]
}

/** Gera lista `linked_parameter_values` para o JSON a partir dos pares do canvas. */
export function diskLinkedPairsFromCanvas(
  node: NodeInstance,
  canvasPairs: readonly ParameterValueLinkPair[] | undefined,
  stubCatalog: readonly NodeParameterDefinition[],
): ParameterValueLinkPair[] {
  if (!canvasPairs?.length) {
    return []
  }
  const out: ParameterValueLinkPair[] = []
  for (const [ca, cb] of canvasPairs) {
    out.push(resolveLinkedPairForDisk(node, ca, cb, stubCatalog))
  }
  return normalizeLinkedParameterPairs(out)
}

/**
 * Aplica `parameter_value_links` (ids do canvas), sincroniza valores e actualiza
 * `schema.linked_parameter_values` (ids de disco/stub).
 *
 * @param diskSchema — se omitido (`undefined`), calcula os ids de disco a partir dos pares do canvas.
 */
export function linked_parameter_values_apply_to_instance(
  node: NodeInstance,
  canvasPairs: readonly ParameterValueLinkPair[],
  diskSchema: readonly ParameterValueLinkPair[] | undefined,
  stubCatalog: readonly NodeParameterDefinition[],
): NodeInstance {
  const normCanvas = normalizeLinkedParameterPairs([...canvasPairs])
  const disk =
    diskSchema !== undefined
      ? normalizeLinkedParameterPairs([...diskSchema])
      : diskLinkedPairsFromCanvas(node, normCanvas, stubCatalog)

  let next: NodeInstance = {
    ...node,
    schema: {
      ...node.schema,
      linked_parameter_values: [...disk],
    },
  }

  if (!normCanvas.length) {
    delete next.parameter_value_links
    return next
  }

  next.parameter_value_links = normCanvas.map(
    ([a, b]) => (a <= b ? ([a, b] as const) : ([b, a] as const)),
  )

  let values = next.values
  for (const [a] of next.parameter_value_links) {
    const v =
      values.find((x) => x.parameterId === a)?.value ??
      next.schema.parameters.find((p) => p.id === a)?.defaultValue ??
      ''
    values = link_parameter_value_patch_values(values, a, v, next.parameter_value_links)
  }

  return { ...next, values }
}
