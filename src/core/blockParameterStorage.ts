import type { BlockParameterJsonDocument } from './blockParameterJson'

export type WriteBlockParametersResult = {
  ok: boolean
  written?: string[]
  overwritten?: string[]
  skipped?: string[]
  errors?: string[]
  error?: string
}

export async function writeBlockParameterDocument(
  parameter: BlockParameterJsonDocument,
): Promise<WriteBlockParametersResult> {
  return writeBlockParameterDocuments([parameter])
}

export async function writeBlockParameterDocuments(
  parameters: readonly BlockParameterJsonDocument[],
): Promise<WriteBlockParametersResult> {
  try {
    const res = await fetch('/api/block-parameters-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters }),
    })

    const payload: unknown = await res.json()

    if (!res.ok) {
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof (payload as { error: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `HTTP ${res.status}`
      return { ok: false, error: message }
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('ok' in payload) ||
      (payload as { ok: unknown }).ok !== true
    ) {
      return { ok: false, error: 'Resposta inválida do servidor' }
    }

    const body = payload as {
      written?: string[]
      overwritten?: string[]
      skipped?: string[]
      errors?: string[]
    }

    return {
      ok: true,
      written: body.written ?? [],
      overwritten: body.overwritten ?? [],
      skipped: body.skipped ?? [],
      errors: body.errors ?? [],
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
