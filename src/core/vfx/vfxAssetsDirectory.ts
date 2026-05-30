/** Pasta de assets persistente (File System Access API) para indexação automática. */

import {
  buildChampionAnimationsRelativePath,
  buildChampionBaseTextureRelativePath,
  buildChampionSklRelativePath,
  buildChampionSknRelativePath,
  collectCharacterAnimationDirectoryRelativePaths,
  collectCharacterIndexRelativePaths,
  SKIN_FOLDER_ORDER,
  type VfxCharacterSkinFolder,
} from '@/core/vfx/vfxCharacterAssets'
import type { VfxAssetFileIndex } from './vfxAssetLookup'
import { createEmptyAssetIndex } from './vfxAssetLookup'
import { buildAssetIndexFromFileList } from './vfxAssetIndex'
import {
  buildLolAssetCachesFromFiles,
  cloneLolAssetCaches,
  createEmptyLolAssetCaches,
  mergeLolAssetCaches,
  type VfxLolAssetCaches,
} from './vfxMeshCache'

const IDB_NAME = 'node-graphs-lol-vfx'
const IDB_STORE = 'handles'
const IDB_KEY = 'assets-directory'
const PICKER_ID = 'node-graphs-lol-vfx-assets'

export function supportsVfxDirectoryPicker(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
  })
}

export async function storeAssetsDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function getStoredAssetsDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIdb()
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const request = tx.objectStore(IDB_STORE).get(IDB_KEY)
      request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle) ?? null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return handle
  } catch {
    return null
  }
}

export async function clearStoredAssetsDirectoryHandle(): Promise<void> {
  try {
    const db = await openIdb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /** ignore */
  }
}

export async function ensureDirectoryReadPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const options = { mode: 'read' as const }
  const current = await handle.queryPermission(options)
  if (current === 'granted') return true
  if (current === 'denied') return false
  const requested = await handle.requestPermission(options)
  return requested === 'granted'
}

/** Itera filhos de uma pasta (values() — compatível com handles restaurados do IndexedDB). */
function iterateDirectoryChildren(
  handle: FileSystemDirectoryHandle,
): AsyncIterable<FileSystemHandle> {
  if (typeof handle.values === 'function') {
    return handle.values()
  }

  const fromProto = Object.getPrototypeOf(handle) as FileSystemDirectoryHandle | null
  if (fromProto && typeof fromProto.values === 'function') {
    return fromProto.values.call(handle)
  }

  const withEntries = handle as FileSystemDirectoryHandle & {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>
  }
  if (typeof withEntries.entries === 'function') {
    const entries = withEntries.entries.call(handle)
    return {
      async *[Symbol.asyncIterator]() {
        for await (const [, child] of entries) {
          yield child
        }
      },
    }
  }

  const asyncIterable = handle as FileSystemDirectoryHandle & AsyncIterable<FileSystemHandle>
  if (typeof asyncIterable[Symbol.asyncIterator] === 'function') {
    return asyncIterable
  }

  throw new Error(
    'Não foi possível ler a pasta de assets: o browser não expõe iteração em FileSystemDirectoryHandle.',
  )
}

async function* walkDirectory(
  handle: FileSystemDirectoryHandle,
  prefix = '',
): AsyncGenerator<{ relativePath: string; file: File }> {
  for await (const entry of iterateDirectoryChildren(handle)) {
    const name = entry.name
    const relativePath = prefix ? `${prefix}/${name}` : name
    if (entry.kind === 'file') {
      yield { relativePath, file: await (entry as FileSystemFileHandle).getFile() }
      continue
    }
    if (entry.kind === 'directory') {
      yield* walkDirectory(entry as FileSystemDirectoryHandle, relativePath)
    }
  }
}

function basenameOf(fileName: string): string {
  const slash = fileName.lastIndexOf('/')
  return (slash >= 0 ? fileName.slice(slash + 1) : fileName).toLowerCase()
}

function neededBasenames(ritualAssetPaths: string[]): Set<string> {
  const names = new Set<string>()
  for (const ritualPath of ritualAssetPaths) {
    const normalized = ritualPath.replace(/\\/g, '/')
    names.add(basenameOf(normalized))
    const tail = normalized.replace(/^ASSETS\//i, '').toLowerCase()
    if (tail) names.add(basenameOf(tail))
  }
  return names
}

function neededTails(ritualAssetPaths: string[]): string[] {
  return ritualAssetPaths.map((path) => path.replace(/^ASSETS\//i, '').replace(/\\/g, '/').toLowerCase())
}

function fileMatchesRitual(
  relativePath: string,
  basenames: Set<string>,
  tails: string[],
): boolean {
  const lower = relativePath.replace(/\\/g, '/').toLowerCase()
  const base = basenameOf(lower)
  if (basenames.has(base)) return true

  const assetsIdx = lower.indexOf('assets/')
  const pathFromAssets = assetsIdx >= 0 ? lower.slice(assetsIdx + 'assets/'.length) : lower

  return tails.some(
    (tail) =>
      pathFromAssets === tail ||
      pathFromAssets.endsWith(`/${tail}`) ||
      lower.endsWith(`/${tail}`) ||
      lower.endsWith(tail),
  )
}

const RITUAL_TEXTURE_EXTENSIONS = ['.tex', '.dds', '.png', '.jpg', '.jpeg', '.webp', '.tga']
const RITUAL_MESH_EXTENSIONS = ['.scb', '.sco', '.skn', '.skl', '.anm']
const CHARACTER_ASSET_EXTENSIONS = [...RITUAL_MESH_EXTENSIONS, '.tex', '.dds']

/** Recolhe ficheiros de textura e mesh referenciados no ritual (rápido em pastas grandes). */
export async function collectRitualAssetFilesFromDirectory(
  handle: FileSystemDirectoryHandle,
  ritualAssetPaths: string[],
): Promise<File[]> {
  const paths = ritualAssetPaths.filter((path) => path.trim())
  if (!paths.length) return []

  const basenames = neededBasenames(paths)
  const tails = neededTails(paths)
  const matched: File[] = []
  const seen = new Set<string>()

  for await (const { relativePath, file } of walkDirectory(handle)) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!RITUAL_TEXTURE_EXTENSIONS.includes(ext) && !RITUAL_MESH_EXTENSIONS.includes(ext)) continue
    if (!fileMatchesRitual(relativePath, basenames, tails)) continue

    const key = `${basenameOf(file.name)}:${ext}`
    if (seen.has(key)) continue
    seen.add(key)

    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath,
      configurable: true,
    })
    matched.push(file)
  }

  return matched
}

/** @deprecated Use collectRitualAssetFilesFromDirectory */
export const collectTextureFilesFromDirectory = collectRitualAssetFilesFromDirectory

async function getDirectoryHandleCaseInsensitive(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<{ handle: FileSystemDirectoryHandle; name: string } | null> {
  try {
    const handle = await parent.getDirectoryHandle(name)
    return { handle, name }
  } catch {
    const target = name.toLowerCase()
    for await (const [entryName, handle] of parent.entries()) {
      if (entryName.toLowerCase() === target && handle.kind === 'directory') {
        return { handle: handle as FileSystemDirectoryHandle, name: entryName }
      }
    }
    return null
  }
}

async function getFileHandleCaseInsensitive(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<{ handle: FileSystemFileHandle; name: string } | null> {
  try {
    const handle = await parent.getFileHandle(name)
    return { handle, name }
  } catch {
    const target = name.toLowerCase()
    for await (const [entryName, handle] of parent.entries()) {
      if (entryName.toLowerCase() === target && handle.kind === 'file') {
        return { handle: handle as FileSystemFileHandle, name: entryName }
      }
    }
    return null
  }
}

async function readFileAtRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<File | null> {
  const segments = relativePath.replace(/\\/g, '/').split('/').filter(Boolean)
  if (!segments.length) return null

  let dir: FileSystemDirectoryHandle = root
  const actualSegments: string[] = []
  try {
    for (let index = 0; index < segments.length - 1; index += 1) {
      const next = await getDirectoryHandleCaseInsensitive(dir, segments[index]!)
      if (!next) return null
      actualSegments.push(next.name)
      dir = next.handle
    }
    const fileEntry = await getFileHandleCaseInsensitive(dir, segments[segments.length - 1]!)
    if (!fileEntry) return null
    actualSegments.push(fileEntry.name)
    const file = await fileEntry.handle.getFile()
    Object.defineProperty(file, 'webkitRelativePath', {
      value: actualSegments.join('/'),
      configurable: true,
    })
    return file
  } catch {
    return null
  }
}

async function resolveDirectoryAtRelativePath(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemDirectoryHandle | null> {
  const segments = relativePath.replace(/\\/g, '/').split('/').filter(Boolean)
  if (!segments.length) return null

  let dir: FileSystemDirectoryHandle = root
  for (const segment of segments) {
    const next = await getDirectoryHandleCaseInsensitive(dir, segment)
    if (!next) return null
    dir = next.handle
  }
  return dir
}

async function collectCharacterAnimationFilesFromDirectory(
  root: FileSystemDirectoryHandle,
  champion: string,
): Promise<File[]> {
  const matched: File[] = []

  for (const relativeDir of collectCharacterAnimationDirectoryRelativePaths(champion)) {
    try {
      const dir = await resolveDirectoryAtRelativePath(root, relativeDir)
      if (!dir) continue

      for await (const [entryName, handle] of dir.entries()) {
        if (handle.kind !== 'file' || !entryName.toLowerCase().endsWith('.anm')) continue
        const file = await (handle as FileSystemFileHandle).getFile()
        Object.defineProperty(file, 'webkitRelativePath', {
          value: `${relativeDir}/${entryName}`.replace(/\\/g, '/'),
          configurable: true,
        })
        matched.push(file)
      }
    } catch {
      // Pasta animations opcional — ignora falhas de leitura.
    }
  }

  return matched
}

/** Todos os .skn / .skl / .anm / .tex / .dds de um campeão na pasta assets (Assets path). */
export async function collectCharacterFilesFromDirectory(
  handle: FileSystemDirectoryHandle,
  champion: string,
): Promise<File[]> {
  const needle = `characters/${champion.trim().toLowerCase()}/`
  const matched: File[] = []
  const seen = new Set<string>()

  const addFile = (file: File, relativePath: string) => {
    const key = relativePath.replace(/\\/g, '/').toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath.replace(/\\/g, '/'),
      configurable: true,
    })
    matched.push(file)
  }

  for (const relativePath of collectCharacterIndexRelativePaths(champion)) {
    const file = await readFileAtRelativePath(handle, relativePath)
    if (file) {
      const actualPath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? relativePath
      addFile(file, actualPath)
    }
  }

  for (const file of await collectCharacterAnimationFilesFromDirectory(handle, champion)) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name
    addFile(file, relativePath)
  }

  for await (const { relativePath, file } of walkDirectory(handle)) {
    const lower = relativePath.replace(/\\/g, '/').toLowerCase()
    if (!lower.includes(needle)) continue
    const ext = file.name.toLowerCase()
    if (!CHARACTER_ASSET_EXTENSIONS.some((suffix) => ext.endsWith(suffix))) continue
    addFile(file, relativePath)
  }

  return matched
}

/** Ficheiros para conversão GLTF: SKN/SKL/texturas da skin activa + .anm só em `{skin}/animations/`. */
export async function collectCharacterGltfSourceFiles(
  handle: FileSystemDirectoryHandle,
  champion: string,
): Promise<File[]> {
  const matched: File[] = []
  const seen = new Set<string>()

  const addFile = (file: File, relativePath: string) => {
    const key = relativePath.replace(/\\/g, '/').toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath.replace(/\\/g, '/'),
      configurable: true,
    })
    matched.push(file)
  }

  let activeSkin: VfxCharacterSkinFolder | null = null

  for (const skinFolder of SKIN_FOLDER_ORDER) {
    const sknRel = buildChampionSknRelativePath(champion, skinFolder)
    const sknFile = await readFileAtRelativePath(handle, sknRel)
    if (!sknFile) continue

    activeSkin = skinFolder
    addFile(sknFile, sknRel)

    const sklRel = buildChampionSklRelativePath(champion, skinFolder)
    const sklFile = await readFileAtRelativePath(handle, sklRel)
    if (sklFile) addFile(sklFile, sklRel)

    for (const extension of ['.tex', '.dds'] as const) {
      const texRel = buildChampionBaseTextureRelativePath(champion, skinFolder, extension)
      const texFile = await readFileAtRelativePath(handle, texRel)
      if (texFile) addFile(texFile, texRel)
    }

    const animDirRel = buildChampionAnimationsRelativePath(champion, skinFolder)
    try {
      const animDir = await resolveDirectoryAtRelativePath(handle, animDirRel)
      if (animDir) {
        for await (const [entryName, entryHandle] of animDir.entries()) {
          if (entryHandle.kind !== 'file' || !entryName.toLowerCase().endsWith('.anm')) continue
          const file = await (entryHandle as FileSystemFileHandle).getFile()
          addFile(file, `${animDirRel}/${entryName}`.replace(/\\/g, '/'))
        }
      }
    } catch {
      // pasta animations opcional
    }

    break
  }

  if (!activeSkin) return matched
  return matched
}

export async function indexCharacterFromDirectory(
  handle: FileSystemDirectoryHandle,
  champion: string,
  existingCaches: VfxLolAssetCaches | null,
  existingAssetIndex: VfxAssetFileIndex | null = null,
): Promise<{
  lolCaches: VfxLolAssetCaches
  assetIndex: VfxAssetFileIndex
  warnings: string[]
  anmLoaded: number
  skinnedLoaded: number
  texturesIndexed: number
  filesFound: number
}> {
  const warnings: string[] = []

  try {
    const files = await collectCharacterFilesFromDirectory(handle, champion)
    const meshLike = files.filter((file) =>
      RITUAL_MESH_EXTENSIONS.some((suffix) => file.name.toLowerCase().endsWith(suffix)),
    )
    const textureLike = files.filter((file) => {
      const lower = file.name.toLowerCase()
      return lower.endsWith('.tex') || lower.endsWith('.dds')
    })

    const meshes = await buildLolAssetCachesFromFiles(meshLike)
    const textures = textureLike.length
      ? await buildAssetIndexFromFileList(textureLike)
      : { index: createEmptyAssetIndex(), warnings: [] as string[] }

    const mergedIndex = mergeAssetIndex(existingAssetIndex, textures.index)
    const mergedCaches = existingCaches
      ? mergeLolAssetCaches(existingCaches, meshes.caches)
      : meshes.caches

    warnings.push(...meshes.warnings, ...textures.warnings)

    if (meshLike.length > 0 && meshes.loadedSkinned === 0) {
      warnings.push(
        `Mesh skinned de «${champion}» não carregou — confirme ${champion}.skn e ${champion}.skl na mesma pasta.`,
      )
    }

    return {
      lolCaches: cloneLolAssetCaches(mergedCaches),
      assetIndex: mergedIndex,
      warnings,
      anmLoaded: meshes.loadedAnm,
      skinnedLoaded: meshes.loadedSkinned,
      texturesIndexed: textureLike.length,
      filesFound: files.length,
    }
  } catch (error) {
    warnings.push(
      `Falha ao indexar «${champion}»: ${error instanceof Error ? error.message : String(error)}`,
    )
    return {
      lolCaches: existingCaches ? cloneLolAssetCaches(existingCaches) : cloneLolAssetCaches(createEmptyLolAssetCaches()),
      assetIndex: existingAssetIndex ?? createEmptyAssetIndex(),
      warnings,
      anmLoaded: 0,
      skinnedLoaded: 0,
      texturesIndexed: 0,
      filesFound: 0,
    }
  }
}

export async function buildAssetsFromDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  ritualTexturePaths: string[],
  ritualMeshPaths: string[],
): Promise<{
  index: VfxAssetFileIndex
  lolCaches: VfxLolAssetCaches
  rootLabel: string
  warnings: string[]
  meshesLoaded: number
  skinnedLoaded: number
  anmLoaded: number
}> {
  const ritualPaths = [...new Set([...ritualTexturePaths, ...ritualMeshPaths].filter((path) => path.trim()))]
  const files = await collectRitualAssetFilesFromDirectory(handle, ritualPaths)
  const built = await buildAssetIndexFromFileList(files)
  const meshes = await buildLolAssetCachesFromFiles(files)
  return {
    index: built.index,
    lolCaches: meshes.caches,
    rootLabel: handle.name || built.rootLabel,
    warnings: [...built.warnings, ...meshes.warnings],
    meshesLoaded: meshes.loadedMeshes,
    skinnedLoaded: meshes.loadedSkinned,
    anmLoaded: meshes.loadedAnm,
  }
}

export async function buildAssetIndexFromDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  ritualTexturePaths: string[],
  ritualMeshPaths: string[] = [],
): Promise<{
  index: VfxAssetFileIndex
  lolCaches: VfxLolAssetCaches
  rootLabel: string
  warnings: string[]
  meshesLoaded: number
  skinnedLoaded: number
  anmLoaded: number
}> {
  return buildAssetsFromDirectoryHandle(handle, ritualTexturePaths, ritualMeshPaths)
}

export async function pickAndStoreAssetsDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsVfxDirectoryPicker()) return null

  try {
    const handle = await window.showDirectoryPicker({
      id: PICKER_ID,
      mode: 'read',
      startIn: 'documents',
    })
    await storeAssetsDirectoryHandle(handle)
    return handle
  } catch {
    return null
  }
}

export function mergeAssetIndex(
  previous: VfxAssetFileIndex | null,
  incoming: VfxAssetFileIndex,
): VfxAssetFileIndex {
  if (!previous) return incoming
  for (const [key, url] of incoming.paths) previous.paths.set(key, url)
  for (const [key, url] of incoming.basenames) previous.basenames.set(key, url)
  for (const key of incoming.ddsKeys) previous.ddsKeys.add(key)
  return previous
}
