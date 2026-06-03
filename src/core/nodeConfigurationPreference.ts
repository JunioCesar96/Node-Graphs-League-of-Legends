import { sanitizeStructurePackFolderName } from '@/core/nodeStructurePackStorage'

export const STORAGE_CLASS_GROUP_PACK_FOLDER_KEY = 'node-graphs-lol:class-group-pack-folder'

export const STORAGE_CODE_TO_NODE_GRAPH_PACK_FOLDER_KEY = 'node-graphs-lol:code-to-node-graph-pack-folder'

export const STORAGE_CODE_TO_NEW_NODE_GRAPH_PACK_FOLDER_KEY =
  'node-graphs-lol:code-to-new-node-graph-pack-folder'

export const DEFAULT_CLASS_GROUP_PACK_FOLDER = 'importado'

export const DEFAULT_CODE_TO_NODE_GRAPH_PACK_FOLDER = 'default'

export type ClassGroupPackFolderOptions = {
  /** Com Nodes → Configurar activo, `default` é pasta válida para Converter Class Group. */
  allowDefault?: boolean
}

export function parseClassGroupPackFolderName(
  raw: string,
  options: ClassGroupPackFolderOptions = {},
): string | null {
  const folder = sanitizeStructurePackFolderName(raw)

  if (!folder) {
    return null
  }

  if (folder === 'default' && !options.allowDefault) {
    return null
  }

  return folder
}

export function getClassGroupConverterPackFolder(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_CLASS_GROUP_PACK_FOLDER_KEY)
    const sanitized = raw ? sanitizeStructurePackFolderName(raw) : null

    if (sanitized) {
      return sanitized
    }
  } catch {
    /** ignore */
  }

  return DEFAULT_CLASS_GROUP_PACK_FOLDER
}

export function setClassGroupConverterPackFolder(raw: string): string | null {
  const folder = parseClassGroupPackFolderName(raw, { allowDefault: true })

  if (!folder) {
    return null
  }

  try {
    window.localStorage.setItem(STORAGE_CLASS_GROUP_PACK_FOLDER_KEY, folder)
  } catch {
    return null
  }

  return folder
}

export function getCodeToNodeGraphPackFolder(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_CODE_TO_NODE_GRAPH_PACK_FOLDER_KEY)
    const sanitized = raw ? sanitizeStructurePackFolderName(raw) : null

    if (sanitized) {
      return sanitized
    }
  } catch {
    /** ignore */
  }

  return DEFAULT_CODE_TO_NODE_GRAPH_PACK_FOLDER
}

export function setCodeToNodeGraphPackFolder(raw: string): string | null {
  const folder = parseClassGroupPackFolderName(raw, { allowDefault: true })

  if (!folder) {
    return null
  }

  try {
    window.localStorage.setItem(STORAGE_CODE_TO_NODE_GRAPH_PACK_FOLDER_KEY, folder)
  } catch {
    return null
  }

  return folder
}

export const DEFAULT_CODE_TO_NEW_NODE_GRAPH_PACK_FOLDER = 'importado'

export function getCodeToNewNodeGraphPackFolder(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_CODE_TO_NEW_NODE_GRAPH_PACK_FOLDER_KEY)
    const sanitized = raw ? sanitizeStructurePackFolderName(raw) : null

    if (sanitized && sanitized !== 'default') {
      return sanitized
    }
  } catch {
    /** ignore */
  }

  return DEFAULT_CODE_TO_NEW_NODE_GRAPH_PACK_FOLDER
}

export function setCodeToNewNodeGraphPackFolder(raw: string): string | null {
  const folder = parseClassGroupPackFolderName(raw)

  if (!folder) {
    return null
  }

  try {
    window.localStorage.setItem(STORAGE_CODE_TO_NEW_NODE_GRAPH_PACK_FOLDER_KEY, folder)
  } catch {
    return null
  }

  return folder
}
