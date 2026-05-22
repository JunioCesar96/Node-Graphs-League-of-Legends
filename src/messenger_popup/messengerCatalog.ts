import catalogData from '@/messenger_popup/messenger_popup_catalog.json'

/** Id do catálogo para confirmação ao marcar/desmarcar parâmetro obrigatório no inspector. */
export const MESSENGER_CONFIRM_TOGGLE_REQUIRED_PARAMETER = 'confirm_toggle_required_parameter' as const
/** Id do catálogo para ativar o modo de configuração de nodes. */
export const MESSENGER_CONFIRM_NODE_CONFIGURATION_MODE = 'confirm_node_configuration_mode' as const

export const MESSENGER_CONFIRM_REMOVE_NODE_ELEMENT = 'confirm_remove_node_element' as const

export const MESSENGER_CONFIRM_DELETE_NODE = 'confirm_delete_node' as const
/** Toast quando não existem parâmetros string para definir hashString. */
export const MESSENGER_TOAST_HASH_STRING_REQUIRES_STRING_PARAM =
  'toast_hash_string_requires_string_param' as const

export const MESSENGER_TOAST_NODE_LOCKED = 'toast_node_locked' as const

export const MESSENGER_CONFIRM_SPAWN_NEEKO_FROM_RITUAL_DRAG =
  'confirm_spawn_neeko_from_ritual_drag' as const

export const MESSENGER_TOAST_NEEKO_TRANSFORM_ERROR = 'toast_neeko_transform_error' as const

export const MESSENGER_TOAST_NEEKO_TRANSFORM_WARNINGS = 'toast_neeko_transform_warnings' as const

export const MESSENGER_TOAST_NEEKO_BUILD_FAILED = 'toast_neeko_build_failed' as const

export type MessengerPopupKind = 'confirm' | 'toast'

export type MessengerPopupCatalogEntry = {
  id: string
  message: string
  /** null = sem fecho automático (adequado a confirmações). */
  durationMs: number | null
  kind?: MessengerPopupKind
}

type CatalogFile = {
  entries: MessengerPopupCatalogEntry[]
}

const catalog = catalogData as CatalogFile

const byId = new Map<string, MessengerPopupCatalogEntry>(
  catalog.entries.map((entry) => [entry.id, entry]),
)

export function getMessengerCatalogEntry(id: string): MessengerPopupCatalogEntry | undefined {
  return byId.get(id)
}

export function messengerEntryKind(entry: MessengerPopupCatalogEntry): MessengerPopupKind {
  if (entry.kind) {
    return entry.kind
  }
  return entry.durationMs == null ? 'confirm' : 'toast'
}

export function applyMessengerMessageReplacements(
  message: string,
  replacements: Record<string, string>,
): string {
  let result = message
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{${key}}`).join(value)
  }
  return result
}
