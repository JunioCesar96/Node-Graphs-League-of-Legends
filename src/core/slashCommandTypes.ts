import type { WorkspaceBundle } from '@/core/workspacePersistence'
import { normalizeWorkspaceBundle } from '@/core/workspacePersistence'

export const SLASH_COMMAND_VERSION = 1 as const
export const SLASH_COMMAND_KIND = 'slash-command' as const

export type SlashCommandFeature = 'blocks'

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
  }
}

export function serializeSlashCommandDocument(document: SlashCommandDocument): SlashCommandDocument {
  return structuredClone(document)
}

export function createBlockSlashCommandDocument(input: {
  name: string
  rootBlockName: string
  rootNodeId: string
  payload: WorkspaceBundle
}): SlashCommandDocument {
  const command = normalizeSlashCommandName(input.name)
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
  }
}
