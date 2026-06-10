import type { BlockParameterJsonDocument } from './blockParameterJson'
import {
  blockParameterCatalogForBlock,
  listAllBlockParametersFromCatalog,
} from './blockParameterCatalogRegistry'
import { validateBlockParameterDocument } from './blockParameterRegistry'
import { sanitizeBlockStructureFolderName } from './blockParameterFileStem'

function validateParametersFromPayload(
  rawParameters: unknown,
): BlockParameterJsonDocument[] {
  if (!Array.isArray(rawParameters)) {
    return []
  }

  const parameters: BlockParameterJsonDocument[] = []
  for (const entry of rawParameters) {
    const validated = validateBlockParameterDocument(entry, 'block-parameters-list')
    if (validated.ok) {
      parameters.push(validated.value)
    }
  }

  return parameters
}

function sortBlockParameters(parameters: BlockParameterJsonDocument[]): BlockParameterJsonDocument[] {
  return [...parameters].sort((a, b) => {
    const blockCmp = a.block.localeCompare(b.block)
    if (blockCmp !== 0) {
      return blockCmp
    }
    return a.parameterName.localeCompare(b.parameterName)
  })
}

export type FetchBlockParametersFromDiskResult =
  | { ok: true; parameters: BlockParameterJsonDocument[] }
  | { ok: false; error: string }

/**
 * Lista parâmetros em `src/blockStructures/parameters/{blockName}/` via API dev.
 * Sem cache — cada chamada reflecte o disco (uso ao abrir «+ parâmetro»).
 */
export async function fetchAllBlockParametersFromDisk(): Promise<FetchBlockParametersFromDiskResult> {
  try {
    const url = '/api/block-parameters-list?all=1'
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    const payload: unknown = await res.json().catch(() => null)

    if (!res.ok || typeof payload !== 'object' || payload === null || Reflect.get(payload, 'ok') !== true) {
      const error =
        typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Listagem de parâmetros falhou (${String(res.status)}).`
      return { ok: false, error }
    }

    const parameters = sortBlockParameters(
      validateParametersFromPayload(Reflect.get(payload, 'parameters')),
    )
    if (parameters.length > 0) {
      return { ok: true, parameters }
    }

    const fallback = listAllBlockParametersFromCatalog()
    if (fallback.length > 0) {
      return { ok: true, parameters: fallback }
    }

    return { ok: false, error: 'Resposta inválida da API de parâmetros.' }
  } catch {
    const fallback = listAllBlockParametersFromCatalog()
    if (fallback.length > 0) {
      return { ok: true, parameters: fallback }
    }
    return { ok: false, error: 'API de parâmetros indisponível.' }
  }
}

export async function fetchBlockParametersFromDisk(
  blockName: string,
): Promise<FetchBlockParametersFromDiskResult> {
  const folder = sanitizeBlockStructureFolderName(blockName)
  if (!folder) {
    return { ok: false, error: 'Nome de bloco inválido.' }
  }

  try {
    const url = `/api/block-parameters-list?block=${encodeURIComponent(folder)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    const payload: unknown = await res.json().catch(() => null)

    if (!res.ok || typeof payload !== 'object' || payload === null || Reflect.get(payload, 'ok') !== true) {
      const error =
        typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Listagem de parâmetros falhou (${String(res.status)}).`
      return { ok: false, error }
    }

    const parameters = validateParametersFromPayload(Reflect.get(payload, 'parameters')).sort((a, b) =>
      a.parameterName.localeCompare(b.parameterName),
    )
    if (parameters.length > 0) {
      return { ok: true, parameters }
    }

    const fallback = [...blockParameterCatalogForBlock(folder)].sort((a, b) =>
      a.parameterName.localeCompare(b.parameterName),
    )
    if (fallback.length > 0) {
      return { ok: true, parameters: fallback }
    }

    return { ok: false, error: 'Resposta inválida da API de parâmetros.' }
  } catch {
    const fallback = [...blockParameterCatalogForBlock(folder)].sort((a, b) =>
      a.parameterName.localeCompare(b.parameterName),
    )
    if (fallback.length > 0) {
      return { ok: true, parameters: fallback }
    }
    return { ok: false, error: 'API de parâmetros indisponível.' }
  }
}
