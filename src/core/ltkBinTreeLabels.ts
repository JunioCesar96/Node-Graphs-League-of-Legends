/** Chaves paralelas opcionais no JSON root: `_path_labels` ou `_node_graphs_path_labels` → `path_hash` → texto (ex.: vindo do Jade / hashtables). */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Interpreta chave decimal, `0x` hex, ou 8 hex dígitos. */
function coercePathHashKey(key: string): number | null {
  const trimmed = key.trim()

  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    const n = Number.parseInt(trimmed.slice(2), 16)

    return Number.isFinite(n) ? n >>> 0 : null
  }

  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10)

    return Number.isFinite(n) ? n >>> 0 : null
  }

  if (/^[0-9a-f]{8}$/i.test(trimmed)) {
    const n = Number.parseInt(trimmed, 16)

    return Number.isFinite(n) ? n >>> 0 : null
  }

  return null
}

/** Mapa opcional para enriquecer títulos e células de tabela Jade. */
export function parseOptionalPathLabelsFromBinTreePayload(root: Record<string, unknown>): Map<number, string> | undefined {
  const bucket =
    Reflect.get(root, '_path_labels') ?? Reflect.get(root, '_node_graphs_path_labels') ?? Reflect.get(root, '_pathLabels')

  if (!isRecord(bucket)) {
    return undefined
  }

  const accumulated = new Map<number, string>()

  for (const [candidateKey, value] of Object.entries(bucket)) {
    if (typeof value !== 'string') {
      continue
    }

    const trimmedLabel = value.trim()

    if (trimmedLabel.length === 0) {
      continue
    }

    const hashed = coercePathHashKey(candidateKey)

    if (hashed !== null) {
      accumulated.set(hashed >>> 0, trimmedLabel)
    }
  }

  return accumulated.size > 0 ? accumulated : undefined
}
