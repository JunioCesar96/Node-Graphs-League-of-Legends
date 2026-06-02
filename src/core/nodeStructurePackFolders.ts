/** Pastas reservadas em `src/nodeStructures/` (API dev inclui `default` com `includeDefault=1`). */
export const NODE_STRUCTURE_PACK_FOLDER_DEFAULT = 'default'

const DISK_FOLDERS_ENDPOINT = '/api/node-structures-folders?includeDefault=1'

export type FetchNodeStructurePackFoldersResult =
  | { ok: true; folders: string[] }
  | { ok: false; error: string }

/**
 * Lista pastas imediatas sob `src/nodeStructures/` no disco (dev server).
 * Em build de produção sem API, devolve `ok: false`.
 */
export type SchemaPackFolderResolveOptions = {
  packFolderBySchemaId?: Record<string, string>
  jsonRelativePathBySchemaId?: Record<string, string>
}

/** Pasta do pack: caminho JSON (`default/foo.json`) tem prioridade sobre o mapa do registo. */
export function resolveSchemaPackFolder(
  schemaId: string,
  options: SchemaPackFolderResolveOptions = {},
): string {
  const relative = options.jsonRelativePathBySchemaId?.[schemaId]?.replace(/\\/g, '/').trim()
  if (relative) {
    const slashIndex = relative.indexOf('/')
    if (slashIndex <= 0) {
      return relative
    }
    return relative.slice(0, slashIndex)
  }

  return options.packFolderBySchemaId?.[schemaId]?.trim() ?? ''
}

export type SchemaBelongsToPalettePackOptions = SchemaPackFolderResolveOptions & {
  diskPackFolders?: readonly string[]
  memoryPackFolders?: readonly string[]
}

/** Filtra schemas da paleta por pasta seleccionada ou por pastas existentes no disco. */
export function schemaBelongsToPalettePack(
  schemaId: string,
  selectedPackFolder: string | null,
  options: SchemaBelongsToPalettePackOptions = {},
): boolean {
  const resolved = resolveSchemaPackFolder(schemaId, options)
  const relative = options.jsonRelativePathBySchemaId?.[schemaId]?.replace(/\\/g, '/').trim()

  if (selectedPackFolder !== null) {
    if (resolved === selectedPackFolder) {
      return true
    }
    if (relative?.startsWith(`${selectedPackFolder}/`)) {
      return true
    }
    return false
  }

  const disk = options.diskPackFolders ?? []
  const memory = options.memoryPackFolders ?? []

  if (disk.length === 0) {
    return true
  }

  if (memory.includes(resolved)) {
    return true
  }

  if (resolved && disk.includes(resolved)) {
    return true
  }

  if (relative) {
    const packFromPath = relative.includes('/') ? relative.slice(0, relative.indexOf('/')) : relative
    if (packFromPath && disk.includes(packFromPath)) {
      return true
    }
  }

  return false
}

export async function fetchNodeStructurePackFoldersFromDisk(): Promise<FetchNodeStructurePackFoldersResult> {
  try {
    const res = await fetch(DISK_FOLDERS_ENDPOINT)
    const payload: unknown = await res.json().catch(() => null)

    if (!res.ok || typeof payload !== 'object' || payload === null || Reflect.get(payload, 'ok') !== true) {
      const error =
        typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Listagem de pastas falhou (${String(res.status)}).`
      return { ok: false, error }
    }

    const folders = Reflect.get(payload, 'folders')
    if (!Array.isArray(folders)) {
      return { ok: false, error: 'Resposta inválida da API de pastas.' }
    }

    const names = folders
      .map((entry) => String(entry).trim())
      .filter((name) => name.length > 0)

    return { ok: true, folders: [...new Set(names)].sort((a, b) => a.localeCompare(b)) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'API de pastas indisponível.',
    }
  }
}
