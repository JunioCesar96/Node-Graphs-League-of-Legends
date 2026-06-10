import type { WorkspaceBundle } from '@/core/workspacePersistence'
import {
  normalizeWorkspaceBundle,
  WORKSPACE_FORMAT_VERSION,
} from '@/core/workspacePersistence'

export const SLASH_COMMAND_VERSION = 1 as const
export const SLASH_COMMAND_KIND = 'slash-command' as const

export type SlashCommandFeature = 'blocks'

export type SlashCommandAction =
  | 'spawn'
  | 'createBlock'
  | 'createParameter'
  | 'editBlock'
  | 'deleteBlock'
  | 'editParameter'
  | 'deleteParameter'

const SLASH_COMMAND_ACTIONS = new Set<SlashCommandAction>([
  'spawn',
  'createBlock',
  'createParameter',
  'editBlock',
  'deleteBlock',
  'editParameter',
  'deleteParameter',
])

export type BlockSlashCommandSource = {
  rootBlockName: string
  rootNodeId: string
}

export type SlashCommandDocument = {
  version: typeof SLASH_COMMAND_VERSION
  kind: typeof SLASH_COMMAND_KIND
  feature: SlashCommandFeature
  name: string
  command: string
  createdAt: string
  source: BlockSlashCommandSource
  payload: WorkspaceBundle
  /** Omitido: visível em todos os idiomas. Definido: só no locale indicado (ex. `pt-br`, `en`). */
  locale?: string
  /** Omitido ou `spawn`: aplica fragmento no canvas. */
  action?: SlashCommandAction
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function sanitizeSlashCommandStem(command: string): string | null {
  const t = command
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')

  if (t === '' || t === '.' || t === '..' || t.length > 120) {
    return null
  }

  return t
}

export function normalizeSlashCommandName(command: string): string {
  return command.normalize('NFKC').trim()
}

export function parseSlashCommandDocument(raw: unknown): SlashCommandDocument | null {
  if (!isRecord(raw)) {
    return null
  }

  if (raw.version !== SLASH_COMMAND_VERSION || raw.kind !== SLASH_COMMAND_KIND) {
    return null
  }

  if (raw.feature !== 'blocks') {
    return null
  }

  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return null
  }

  if (typeof raw.command !== 'string' || !raw.command.trim()) {
    return null
  }

  if (typeof raw.createdAt !== 'string' || !raw.createdAt.trim()) {
    return null
  }

  if (!isRecord(raw.source)) {
    return null
  }

  if (
    typeof raw.source.rootBlockName !== 'string' ||
    !raw.source.rootBlockName.trim() ||
    typeof raw.source.rootNodeId !== 'string' ||
    !raw.source.rootNodeId.trim()
  ) {
    return null
  }

  const payload = normalizeWorkspaceBundle(raw.payload)
  if (!payload) {
    return null
  }

  let action: SlashCommandAction | undefined
  if (raw.action !== undefined) {
    if (typeof raw.action !== 'string' || !SLASH_COMMAND_ACTIONS.has(raw.action as SlashCommandAction)) {
      return null
    }
    action = raw.action as SlashCommandAction
  }

  let locale: string | undefined
  if (raw.locale !== undefined) {
    if (typeof raw.locale !== 'string' || !raw.locale.trim()) {
      return null
    }
    locale = raw.locale.trim().toLowerCase()
  }

  return {
    version: SLASH_COMMAND_VERSION,
    kind: SLASH_COMMAND_KIND,
    feature: 'blocks',
    name: raw.name.trim(),
    command: raw.command.trim(),
    createdAt: raw.createdAt,
    source: {
      rootBlockName: raw.source.rootBlockName.trim(),
      rootNodeId: raw.source.rootNodeId.trim(),
    },
    payload,
    ...(locale ? { locale } : {}),
    ...(action ? { action } : {}),
  }
}

export function slashCommandEffectiveAction(document: SlashCommandDocument): SlashCommandAction {
  return document.action ?? 'spawn'
}

export function serializeSlashCommandDocument(document: SlashCommandDocument): SlashCommandDocument {
  return structuredClone(document)
}

/** Payload mínimo válido para slash commands de catálogo (sem spawn no canvas). */
export function createMinimalCatalogSlashCommandPayload(): WorkspaceBundle {
  return {
    logic: {
      version: WORKSPACE_FORMAT_VERSION,
      nodes: {
        _catalog: {
          id: '_catalog',
          schema: {
            id: '_catalog',
            title: '_catalog',
            parameters: [],
            internalStructures: [],
          },
          values: [],
        },
      },
    },
    layout: {
      version: WORKSPACE_FORMAT_VERSION,
      width: 1120,
      height: 760,
      nodes: {
        _catalog: {
          position: { x: 0, y: 0 },
        },
      },
    },
    graph: {
      version: WORKSPACE_FORMAT_VERSION,
      connections: [],
    },
    blocks: {
      version: WORKSPACE_FORMAT_VERSION,
      blocks: [],
    },
    groups: {
      version: WORKSPACE_FORMAT_VERSION,
      groups: [],
    },
    labels: {
      version: WORKSPACE_FORMAT_VERSION,
      labels: [],
    },
  }
}

export function createBlockSlashCommandDocument(input: {
  name: string
  rootBlockName: string
  rootNodeId: string
  payload: WorkspaceBundle
  locale?: string
  action?: SlashCommandAction
}): SlashCommandDocument {
  const command = normalizeSlashCommandName(input.name)
  const locale = input.locale?.trim() ? input.locale.trim().toLowerCase() : undefined

  return {
    version: SLASH_COMMAND_VERSION,
    kind: SLASH_COMMAND_KIND,
    feature: 'blocks',
    name: command,
    command,
    createdAt: new Date().toISOString(),
    source: {
      rootBlockName: input.rootBlockName.trim(),
      rootNodeId: input.rootNodeId.trim(),
    },
    payload: structuredClone(input.payload),
    ...(locale ? { locale } : {}),
    ...(input.action ? { action: input.action } : {}),
  }
}
