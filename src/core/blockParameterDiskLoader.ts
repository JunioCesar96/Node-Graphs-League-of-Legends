import type { BlockParameterJsonDocument } from './blockParameterJson'
import { validateBlockParameterDocument } from './blockParameterRegistry'
import { sanitizeBlockStructureFolderName } from './blockParameterFileStem'

export type FetchBlockParametersFromDiskResult =
  | { ok: true; parameters: BlockParameterJsonDocument[] }
  | { ok: false; error: string }

/**
 * Lista parâmetros em `src/blockStructures/parameters/{blockName}/` via API dev.
 * Sem cache — cada chamada reflecte o disco (uso ao abrir «+ parâmetro»).
 */
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

    const rawParameters = Reflect.get(payload, 'parameters')
    if (!Array.isArray(rawParameters)) {
      return { ok: false, error: 'Resposta inválida da API de parâmetros.' }
    }

    const parameters: BlockParameterJsonDocument[] = []
    for (const entry of rawParameters) {
      const validated = validateBlockParameterDocument(entry, 'block-parameters-list')
      if (validated.ok) {
        parameters.push(validated.value)
      }
    }

    parameters.sort((a, b) => a.parameterName.localeCompare(b.parameterName))
    return { ok: true, parameters }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'API de parâmetros indisponível.',
    }
  }
}
