import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  sortBlockDefinitions,
  validateBlockDefinitionDocument,
} from './blockDefinitionRegistry'

const BLOCK_DEFINITIONS_LIST_ENDPOINT = '/api/block-definitions-list'

export type FetchBlockDefinitionsFromDiskResult =
  | { ok: true; definitions: BlockDefinitionJsonDocument[] }
  | { ok: false; error: string }

/**
 * Lê definições de bloco em `src/blockStructures/blocks/**` via API dev (sem reload da página).
 */
export async function fetchBlockDefinitionsFromDisk(): Promise<FetchBlockDefinitionsFromDiskResult> {
  try {
    const res = await fetch(BLOCK_DEFINITIONS_LIST_ENDPOINT, {
      headers: { Accept: 'application/json' },
    })
    const payload: unknown = await res.json().catch(() => null)

    if (!res.ok || typeof payload !== 'object' || payload === null || Reflect.get(payload, 'ok') !== true) {
      const error =
        typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Listagem de blocos falhou (${String(res.status)}).`
      return { ok: false, error }
    }

    const rawDefinitions = Reflect.get(payload, 'definitions')
    if (!Array.isArray(rawDefinitions)) {
      return { ok: false, error: 'Resposta inválida da API de blocos.' }
    }

    const definitions: BlockDefinitionJsonDocument[] = []

    for (const entry of rawDefinitions) {
      const validated = validateBlockDefinitionDocument(entry, 'block-definitions-list')
      if (validated.ok) {
        definitions.push(validated.value)
      }
    }

    const byId = new Map<string, BlockDefinitionJsonDocument>()
    for (const definition of definitions) {
      byId.set(definition.id, definition)
    }

    return { ok: true, definitions: sortBlockDefinitions([...byId.values()]) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'API de blocos indisponível.',
    }
  }
}
