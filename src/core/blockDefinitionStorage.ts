import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'



export type WriteBlockDefinitionResult = {

  ok: boolean

  written?: string

  overwritten?: boolean

  error?: string

}



export type WriteBlockDefinitionsResult = {

  ok: boolean

  written?: string[]

  overwritten?: string[]

  skipped?: string[]

  errors?: string[]

  error?: string

}



export async function writeBlockDefinitionDocuments(

  definitions: readonly BlockDefinitionJsonDocument[],

): Promise<WriteBlockDefinitionsResult> {

  if (definitions.length === 0) {

    return { ok: true, written: [], overwritten: [], skipped: [], errors: [] }

  }



  try {

    const res = await fetch('/api/block-definitions-write', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ definitions }),

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

      written?: string | string[]

      overwritten?: boolean | string[]

      skipped?: string[]

      errors?: string[]

    }



    const written = Array.isArray(body.written)

      ? body.written

      : body.written

        ? [body.written]

        : []

    const overwritten = Array.isArray(body.overwritten)

      ? body.overwritten

      : body.overwritten === true && typeof body.written === 'string'

        ? [body.written]

        : []



    return {

      ok: true,

      written,

      overwritten,

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



export type DeleteBlockDefinitionResult = { ok: true; deleted: string } | { ok: false; error: string }

export async function deleteBlockDefinitionDocument(
  blockName: string,
): Promise<DeleteBlockDefinitionResult> {
  try {
    const res = await fetch('/api/block-definitions-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockName: blockName.trim() }),
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

    const body = payload as { deleted?: string }
    return { ok: true, deleted: body.deleted ?? blockName }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function writeBlockDefinitionDocument(

  definition: BlockDefinitionJsonDocument,

): Promise<WriteBlockDefinitionResult> {

  const result = await writeBlockDefinitionDocuments([definition])



  if (!result.ok) {

    return { ok: false, error: result.error }

  }



  const written = result.written ?? []

  const overwritten = result.overwritten ?? []



  return {

    ok: true,

    written: written[0] ?? overwritten[0],

    overwritten: overwritten.length > 0,

  }

}


