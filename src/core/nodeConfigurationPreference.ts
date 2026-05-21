import { sanitizeStructurePackFolderName } from '@/core/nodeStructurePackStorage'

export const STORAGE_CLASS_GROUP_PACK_FOLDER_KEY = 'node-graphs-lol:class-group-pack-folder'

export const DEFAULT_CLASS_GROUP_PACK_FOLDER = 'importado'

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
