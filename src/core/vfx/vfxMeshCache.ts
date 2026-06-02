import { BufferGeometry } from 'three'

import type { ParsedLolAnm } from './lolAnmParse'
import { parseAnmBytes, isAnmFileName } from './lolAnmParse'
import { parsedMeshToBufferGeometry, parsedScbScoToBufferGeometry } from './lolMeshGeometry'
import {
  isLolMeshFileName,
  isScbFileName,
  isScoFileName,
  parseScbBytes,
  parseScoText,
} from './lolMeshParse'
import { buildSkinnedMeshFromSknSkl, disposeSkinnedBundle, type LolSkinnedMeshBundle } from './lolSkinnedMesh'
import { parseSklBytes, isSklFileName, sklPathForSkn } from './lolSklParse'
import type { ParsedLolSkl } from './lolSklParse'
import { parseSknBytes, isSknFileName } from './lolSknParse'
import { resolveAssetCandidates } from './assetPaths'
import { ritualKeyFromRelativePath } from './vfxAssetLookup'

export type VfxMeshCache = Map<string, BufferGeometry>

export type VfxLolAssetCaches = {
  meshes: VfxMeshCache
  skinned: Map<string, LolSkinnedMeshBundle>
  skl: Map<string, ParsedLolSkl>
  anm: Map<string, ParsedLolAnm>
}

export function createEmptyLolAssetCaches(): VfxLolAssetCaches {
  return {
    meshes: new Map(),
    skinned: new Map(),
    skl: new Map(),
    anm: new Map(),
  }
}

export function createEmptyMeshCache(): VfxMeshCache {
  return new Map()
}

function registerKey<T>(map: Map<string, T>, ritualKey: string, value: T) {
  const normalized = ritualKey.replace(/\\/g, '/')
  map.set(normalized.toLowerCase(), value)

  for (const candidate of resolveAssetCandidates(normalized)) {
    map.set(candidate.toLowerCase(), value)
  }

  const base = normalized.split('/').pop()?.toLowerCase()
  if (base) map.set(base, value)
}

function registerRelativeKeys<T>(map: Map<string, T>, relative: string, value: T) {
  registerKey(map, relative, value)
  const ritual = ritualKeyFromRelativePath(relative)
  if (ritual) registerKey(map, ritual, value)
}

function indexFileMap(files: File[]): Map<string, File> {
  const map = new Map<string, File>()
  for (const file of files) {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.replace(/\\/g, '/')
    const keys = [file.name.toLowerCase()]
    if (relative) {
      keys.push(relative.toLowerCase())
      const assetsIdx = relative.toLowerCase().indexOf('assets/')
      if (assetsIdx >= 0) keys.push(relative.slice(assetsIdx).toLowerCase())
    }
    for (const key of keys) map.set(key, file)
  }
  return map
}

function findCompanionFile(fileMap: Map<string, File>, ritualPath: string): File | null {
  const normalized = ritualPath.replace(/\\/g, '/').toLowerCase()
  const base = normalized.split('/').pop()
  if (base && fileMap.has(base)) return fileMap.get(base) ?? null

  for (const [key, file] of fileMap) {
    if (key.endsWith(normalized) || key.endsWith(`/${normalized}`)) return file
  }
  return null
}

export async function loadMeshFromFile(
  file: File,
  companions?: Map<string, File>,
): Promise<BufferGeometry | null> {
  try {
    if (isScbFileName(file.name)) {
      const buffer = await file.arrayBuffer()
      const parsed = parseScbBytes(new Uint8Array(buffer))
      if (!parsed) return null
      return parsedScbScoToBufferGeometry(parsed)
    }

    if (isScoFileName(file.name)) {
      const text = await file.text()
      const parsed = parseScoText(text)
      if (!parsed) return null
      return parsedScbScoToBufferGeometry(parsed)
    }

    if (isSknFileName(file.name)) {
      const buffer = await file.arrayBuffer()
      const parsed = parseSknBytes(new Uint8Array(buffer))
      if (!parsed) return null
      return parsedMeshToBufferGeometry(parsed)
    }
  } catch {
    return null
  }
  return null
}

export async function buildLolAssetCachesFromFiles(files: File[]): Promise<{
  caches: VfxLolAssetCaches
  loadedMeshes: number
  loadedSkinned: number
  loadedAnm: number
  warnings: string[]
}> {
  const caches = createEmptyLolAssetCaches()
  const warnings: string[] = []
  const fileMap = indexFileMap(files)
  let loadedMeshes = 0
  let loadedSkinned = 0
  let loadedAnm = 0

  for (const file of files) {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.replace(/\\/g, '/')

    if (isSklFileName(file.name)) {
      try {
        const skl = parseSklBytes(new Uint8Array(await file.arrayBuffer()))
        if (!skl) continue
        if (relative) registerRelativeKeys(caches.skl, relative, skl)
        registerKey(caches.skl, file.name, skl)
      } catch {
        warnings.push(`Falha ao ler SKL: ${relative ?? file.name}`)
      }
      continue
    }

    if (isAnmFileName(file.name)) {
      try {
        const anm = parseAnmBytes(new Uint8Array(await file.arrayBuffer()))
        if (!anm) continue
        if (relative) registerRelativeKeys(caches.anm, relative, anm)
        registerKey(caches.anm, file.name, anm)
        loadedAnm += 1
      } catch {
        warnings.push(`Falha ao ler ANM: ${relative ?? file.name}`)
      }
      continue
    }

    if (!isLolMeshFileName(file.name) && !isSknFileName(file.name)) continue

    const geometry = await loadMeshFromFile(file, fileMap)
    if (!geometry) {
      warnings.push(`Falha ao ler mesh: ${relative ?? file.name}`)
      continue
    }

    if (relative) {
      registerKey(caches.meshes, relative, geometry)
      const assetsIdx = relative.toLowerCase().indexOf('assets/')
      if (assetsIdx >= 0) registerKey(caches.meshes, relative.slice(assetsIdx), geometry)
    }
    registerKey(caches.meshes, file.name, geometry)
    loadedMeshes += 1

    if (isSknFileName(file.name)) {
      const sknBytes = await file.arrayBuffer()
      const skn = parseSknBytes(new Uint8Array(sknBytes))
      if (!skn) continue

      const sklRitual = relative ? sklPathForSkn(relative) : sklPathForSkn(file.name)
      const sklFile = findCompanionFile(fileMap, sklRitual)
      if (!sklFile) continue

      let skl = caches.skl.get(sklRitual.toLowerCase())
      if (!skl) {
        try {
          skl = parseSklBytes(new Uint8Array(await sklFile.arrayBuffer())) ?? undefined
        } catch {
          warnings.push(`Falha ao ler SKL: ${sklRitual}`)
          skl = undefined
        }
        if (skl) {
          if (relative) registerRelativeKeys(caches.skl, sklRitual, skl)
          else registerKey(caches.skl, sklRitual, skl)
        }
      }
      if (!skl) continue

      let bundle: LolSkinnedMeshBundle | null = null
      try {
        bundle = buildSkinnedMeshFromSknSkl(skn, skl)
      } catch {
        warnings.push(`Falha ao construir skinned mesh: ${relative ?? file.name}`)
      }
      if (!bundle) continue
      if (relative) registerRelativeKeys(caches.skinned, relative, bundle)
      registerKey(caches.skinned, file.name, bundle)
      loadedSkinned += 1
    }
  }

  return { caches, loadedMeshes, loadedSkinned, loadedAnm, warnings }
}

/** @deprecated Prefer buildLolAssetCachesFromFiles */
export async function buildMeshCacheFromFiles(files: File[]): Promise<{
  cache: VfxMeshCache
  loaded: number
  warnings: string[]
}> {
  const built = await buildLolAssetCachesFromFiles(files)
  return {
    cache: built.caches.meshes,
    loaded: built.loadedMeshes,
    warnings: built.warnings,
  }
}

export function lookupMeshGeometry(cache: VfxMeshCache, ritualMeshPath: string): BufferGeometry | null {
  return lookupInCache(cache, ritualMeshPath)
}

export function lookupSkinnedBundle(
  caches: VfxLolAssetCaches,
  ritualMeshPath: string,
): LolSkinnedMeshBundle | null {
  return lookupInCache(caches.skinned, ritualMeshPath)
}

export function lookupSkl(caches: VfxLolAssetCaches, ritualPath: string): ParsedLolSkl | null {
  return lookupInCache(caches.skl, ritualPath)
}

export function lookupAnm(caches: VfxLolAssetCaches, ritualPath: string): ParsedLolAnm | null {
  return lookupInCache(caches.anm, ritualPath)
}

function lookupInCache<T>(cache: Map<string, T>, ritualPath: string): T | null {
  if (!ritualPath.trim() || !cache.size) return null

  for (const candidate of resolveAssetCandidates(ritualPath)) {
    const hit = cache.get(candidate.replace(/\\/g, '/').toLowerCase())
    if (hit) return hit
  }

  const base = ritualPath.split('/').pop()?.toLowerCase()
  if (base) {
    const hit = cache.get(base)
    if (hit) return hit
  }

  const tail = ritualPath.replace(/^ASSETS\//i, '').toLowerCase()
  for (const [key, value] of cache) {
    if (key.endsWith(tail) || key.endsWith(`/${tail}`)) return value
  }

  return null
}

export function mergeLolAssetCaches(previous: VfxLolAssetCaches | null, incoming: VfxLolAssetCaches): VfxLolAssetCaches {
  if (!previous) return incoming
  for (const [key, value] of incoming.meshes) previous.meshes.set(key, value)
  for (const [key, value] of incoming.skinned) previous.skinned.set(key, value)
  for (const [key, value] of incoming.skl) previous.skl.set(key, value)
  for (const [key, value] of incoming.anm) previous.anm.set(key, value)
  return previous
}

export function cloneLolAssetCaches(caches: VfxLolAssetCaches): VfxLolAssetCaches {
  return {
    meshes: new Map(caches.meshes),
    skinned: new Map(caches.skinned),
    skl: new Map(caches.skl),
    anm: new Map(caches.anm),
  }
}

export function mergeMeshCache(previous: VfxMeshCache | null, incoming: VfxMeshCache): VfxMeshCache {
  if (!previous) return incoming
  for (const [key, geometry] of incoming) previous.set(key, geometry)
  return previous
}

export function disposeLolAssetCaches(caches: VfxLolAssetCaches) {
  for (const geometry of caches.meshes.values()) geometry.dispose()
  for (const bundle of caches.skinned.values()) disposeSkinnedBundle(bundle)
  caches.meshes.clear()
  caches.skinned.clear()
  caches.skl.clear()
  caches.anm.clear()
}

export function disposeMeshCache(cache: VfxMeshCache) {
  for (const geometry of cache.values()) geometry.dispose()
  cache.clear()
}
