import {
  parseSlashCommandsFromRawList,
  replaceSlashCommandRegistry,
  slashCommandsList,
} from '@/core/slashCommandRegistry'
import {
  parseSlashCommandDocument,
  sanitizeSlashCommandStem,
  serializeSlashCommandDocument,
  type SlashCommandDocument,
  type SlashCommandFeature,
} from '@/core/slashCommandTypes'

const SLASH_COMMANDS_LIST_ENDPOINT = '/api/slash-commands-list'
const SLASH_COMMANDS_WRITE_ENDPOINT = '/api/slash-commands-write'
const SLASH_COMMANDS_DELETE_ENDPOINT = '/api/slash-commands-delete'

export type FetchSlashCommandsResult =
  | { ok: true; commands: SlashCommandDocument[] }
  | { ok: false; error: string }

export async function fetchSlashCommandsFromDisk(
  feature?: SlashCommandFeature,
): Promise<FetchSlashCommandsResult> {
  try {
    const query = feature ? `?feature=${encodeURIComponent(feature)}` : ''
    const res = await fetch(`${SLASH_COMMANDS_LIST_ENDPOINT}${query}`, {
      headers: { Accept: 'application/json' },
    })
    const payload: unknown = await res.json().catch(() => null)

    if (!res.ok || typeof payload !== 'object' || payload === null || Reflect.get(payload, 'ok') !== true) {
      const error =
        typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Listagem de slash commands falhou (${String(res.status)}).`
      return { ok: false, error }
    }

    const rawCommands = Reflect.get(payload, 'commands')
    if (!Array.isArray(rawCommands)) {
      return { ok: false, error: 'Resposta inválida da API de slash commands.' }
    }

    const commands = parseSlashCommandsFromRawList(rawCommands)
    return { ok: true, commands }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function refreshSlashCommandRegistryFromDisk(
  feature?: SlashCommandFeature,
): Promise<FetchSlashCommandsResult> {
  const result = await fetchSlashCommandsFromDisk(feature)
  if (result.ok) {
    if (feature) {
      const others = slashCommandsList().filter((entry) => entry.feature !== feature)
      replaceSlashCommandRegistry([...others, ...result.commands])
    } else {
      replaceSlashCommandRegistry(result.commands)
    }
  }
  return result
}

export type WriteSlashCommandResult =
  | { ok: true; written: string; overwritten: boolean }
  | { ok: false; error: string }

export async function writeSlashCommandDocument(
  document: SlashCommandDocument,
): Promise<WriteSlashCommandResult> {
  try {
    const res = await fetch(SLASH_COMMANDS_WRITE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: serializeSlashCommandDocument(document) }),
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

    const body = payload as { written?: string; overwritten?: boolean }
    return {
      ok: true,
      written: body.written ?? `${document.feature}/${document.command}.json`,
      overwritten: body.overwritten === true,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export type DeleteSlashCommandResult = { ok: true } | { ok: false; error: string }

export async function deleteSlashCommandDocument(
  feature: SlashCommandFeature,
  command: string,
): Promise<DeleteSlashCommandResult> {
  const stem = sanitizeSlashCommandStem(command)
  if (!stem) {
    return { ok: false, error: 'Nome do comando inválido.' }
  }

  try {
    const res = await fetch(SLASH_COMMANDS_DELETE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, command: command.trim() }),
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

    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function validateSlashCommandDocumentForWrite(document: unknown): SlashCommandDocument | null {
  return parseSlashCommandDocument(document)
}
